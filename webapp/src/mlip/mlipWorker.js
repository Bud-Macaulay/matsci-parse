/**
 * mlipWorker.js — Web Worker for MLIP inference and L-BFGS relaxation.
 *
 * Runs entirely off the main thread. All WASM init, model loading,
 * and optimization happens here. The main thread only receives
 * streamed progress messages.
 *
 * Message protocol:
 *   Main -> Worker:
 *     { type: 'loadModel', buffer: ArrayBuffer }
 *     { type: 'setSystem', positions: Float64Array, atomicNumbers: Int32Array,
 *       cell: Float64Array, periodic: boolean, masses: Float64Array }
 *     { type: 'startRelax', opts: { maxSteps, forceThreshold } }
 *     { type: 'predict', positions?: Float64Array }
 *     { type: 'stop' }
 *
 *   Worker -> Main:
 *     { type: 'ready' }
 *     { type: 'modelLoaded', modelType, cutoff }
 *     { type: 'systemSet', numAtoms }
 *     { type: 'optStep', step, energy, maxForce, positions, converged }
 *     { type: 'prediction', energy, forces }
 *     { type: 'error', message }
 */

import createMlip from '@peterspackman/mlip.js'
import cpuWasmUrl from '@peterspackman/mlip.js/cpu-wasm?url'

// ---------------------------------------------------------------------------
// WASM / model state (persists across steps)
// ---------------------------------------------------------------------------
let Module = null
let model = null

// System state (set once per structure)
let positions = null       // Float64Array, length 3N — updated in-place
let atomicNumbers = null   // Int32Array, length N
let cell = null            // Float64Array(9) or null
let masses = null          // Float64Array, length N
let isPeriodic = false
let numAtoms = 0

// L-BFGS constants
const LBFGS_M = 10
const LBFGS_MAX_STEP = 0.2   // Å inf-norm cap
const LBFGS_LS_MAX = 5       // max line search trials
const LBFGS_ARMIJO = 1e-4    // sufficient decrease constant

// ---------------------------------------------------------------------------
// Initialize WASM module eagerly on worker load
// ---------------------------------------------------------------------------

let initPromise = (async () => {
  try {
    Module = await createMlip({ cpuWasmUrl })
    self.postMessage({ type: 'ready' })
  } catch (err) {
    self.postMessage({ type: 'error', message: `WASM init failed: ${err.message}` })
  }
})()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSystem(pos) {
  return Module.AtomicSystem.create(
    pos || positions,
    atomicNumbers,
    cell,
    isPeriodic,
  )
}

function predictForces(pos, conservative) {
  const sys = buildSystem(pos)
  const result = model.predictWithOptions(sys, conservative)
  return { energy: result.energy, forces: result.forces, stress: result.stress }
}

function calculateMaxForce(forces) {
  let maxF = 0
  for (let i = 0; i < numAtoms; i++) {
    const fx = forces[i * 3]
    const fy = forces[i * 3 + 1]
    const fz = forces[i * 3 + 2]
    const f = Math.sqrt(fx * fx + fy * fy + fz * fz)
    if (f > maxF) maxF = f
  }
  return maxF
}

function maxInfNorm(v) {
  let m = 0
  for (let i = 0; i < v.length; i++) {
    const a = Math.abs(v[i])
    if (a > m) m = a
  }
  return m
}

// ---------------------------------------------------------------------------
// L-BFGS optimizer
//
// Ported from upstream mlip.cpp (mdWorker.ts → runLBFGSStep).
// Uses conservative forces (needed for curvature history).
// ---------------------------------------------------------------------------

let lbfgsState = null

function resetLBFGS() {
  lbfgsState = {
    history: [],   // array of { s: Float64Array, y: Float64Array, rho: number }
    currentE: 0,
    currentG: null, // gradient = -forces
    step: 0,
  }
}

/**
 * L-BFGS two-loop recursion: returns search direction d = -H_k g.
 */
function lbfgsDirection(g, history) {
  const n = g.length
  const q = new Float64Array(g)
  const alphas = new Array(history.length)

  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i]
    let sq = 0
    for (let j = 0; j < n; j++) sq += h.s[j] * q[j]
    alphas[i] = h.rho * sq
    for (let j = 0; j < n; j++) q[j] -= alphas[i] * h.y[j]
  }

  // Scaled identity H_0 = (s·y) / (y·y) · I
  let h0 = 1
  if (history.length > 0) {
    const last = history[history.length - 1]
    let yy = 0, sy = 0
    for (let j = 0; j < n; j++) {
      yy += last.y[j] * last.y[j]
      sy += last.s[j] * last.y[j]
    }
    if (yy > 0) h0 = sy / yy
  }

  const r = new Float64Array(n)
  for (let i = 0; i < n; i++) r[i] = h0 * q[i]
  for (let i = 0; i < history.length; i++) {
    const h = history[i]
    let yr = 0
    for (let j = 0; j < n; j++) yr += h.y[j] * r[j]
    const beta = h.rho * yr
    for (let j = 0; j < n; j++) r[j] += (alphas[i] - beta) * h.s[j]
  }

  // d = -H g
  for (let i = 0; i < n; i++) r[i] = -r[i]
  return r
}

/**
 * Run one L-BFGS step. Returns true when done (converged or max steps).
 */
async function runLBFGSStep(maxSteps, forceThreshold) {
  const lb = lbfgsState
  if (!lb) return true

  const n3 = positions.length

  // First step: evaluate E, g at current position
  if (!lb.currentG) {
    const { energy, forces } = predictForces(positions, true) // conservative
    lb.currentE = energy
    lb.currentG = new Float64Array(n3)
    for (let i = 0; i < n3; i++) lb.currentG[i] = -forces[i]
  }

  // Convergence check
  const forcesForCheck = new Float64Array(n3)
  for (let i = 0; i < n3; i++) forcesForCheck[i] = -lb.currentG[i]
  const maxF = calculateMaxForce(forcesForCheck)
  if (maxF < forceThreshold) {
    postOptStep(lb.currentE, lb.currentG, lb.step, true)
    return true
  }

  // Max steps check
  if (lb.step >= maxSteps) {
    postOptStep(lb.currentE, lb.currentG, lb.step, false)
    return true
  }

  // Search direction via L-BFGS two-loop recursion
  let d = lbfgsDirection(lb.currentG, lb.history)

  // Safety: if not descent, fall back to steepest descent
  let dg = 0
  for (let i = 0; i < n3; i++) dg += d[i] * lb.currentG[i]
  if (dg >= 0) {
    d = new Float64Array(n3)
    for (let i = 0; i < n3; i++) d[i] = -lb.currentG[i]
    dg = 0
    for (let i = 0; i < n3; i++) dg += d[i] * lb.currentG[i]
    lb.history.length = 0
  }

  // Cap inf-norm step size
  const dMax = maxInfNorm(d)
  if (dMax > LBFGS_MAX_STEP) {
    const scale = LBFGS_MAX_STEP / dMax
    for (let i = 0; i < n3; i++) d[i] *= scale
    dg *= scale
  }

  // Backtracking Armijo line search
  let alpha = 1
  const trial = new Float64Array(n3)
  let newE = Infinity
  let newForces = null
  let accepted = false

  for (let ls = 0; ls < LBFGS_LS_MAX; ls++) {
    for (let i = 0; i < n3; i++) trial[i] = positions[i] + alpha * d[i]
    const r = predictForces(trial, true) // conservative
    newE = r.energy
    newForces = r.forces
    if (newE <= lb.currentE + LBFGS_ARMIJO * alpha * dg) {
      accepted = true
      break
    }
    alpha *= 0.5
  }

  // If line search failed, still accept last trial — better than stalling
  if (!accepted) lb.history.length = 0

  if (!newForces) return true

  const newG = new Float64Array(n3)
  for (let i = 0; i < n3; i++) newG[i] = -newForces[i]

  // Update curvature history (skip if s·y tiny or negative)
  const s = new Float64Array(n3)
  const y = new Float64Array(n3)
  let sy = 0
  for (let i = 0; i < n3; i++) {
    s[i] = trial[i] - positions[i]
    y[i] = newG[i] - lb.currentG[i]
    sy += s[i] * y[i]
  }
  if (sy > 1e-12 && accepted) {
    lb.history.push({ s, y, rho: 1 / sy })
    if (lb.history.length > LBFGS_M) lb.history.shift()
  }

  // Commit the move
  positions.set(trial)
  lb.currentE = newE
  lb.currentG = newG
  lb.step++

  postOptStep(lb.currentE, lb.currentG, lb.step, false)
  return false
}

function postOptStep(energy, currentG, step, converged) {
  // Convert gradient back to forces for reporting
  const n3 = currentG.length
  const forcesOut = new Float64Array(n3)
  for (let i = 0; i < n3; i++) forcesOut[i] = -currentG[i]
  const maxF = calculateMaxForce(forcesOut)

  const posOut = new Float64Array(positions)
  const transfers = [posOut.buffer]
  self.postMessage({
    type: 'optStep',
    step,
    energy,
    maxForce: maxF,
    positions: posOut,
    converged,
  }, transfers)
}

// ---------------------------------------------------------------------------
// Optimization loop — tight async loop with setTimeout yield
// ---------------------------------------------------------------------------

let relaxTimer = null
let relaxing = false

function stopRelax() {
  relaxing = false
  if (relaxTimer !== null) {
    clearTimeout(relaxTimer)
    relaxTimer = null
  }
}

async function startRelax(opts = {}) {
  const maxSteps = opts.maxSteps || 100
  const forceThreshold = opts.forceThreshold || 0.05

  relaxing = true
  resetLBFGS()

  const runLoop = async () => {
    if (!relaxing) return
    try {
      const done = await runLBFGSStep(maxSteps, forceThreshold)
      if (done) {
        relaxing = false
        // Send final state so the client can resolve
        const n3 = positions.length
        const forcesOut = new Float64Array(n3)
        const lb = lbfgsState
        if (lb && lb.currentG) {
          for (let i = 0; i < n3; i++) forcesOut[i] = -lb.currentG[i]
        }
        const posOut = new Float64Array(positions)
        const maxF = calculateMaxForce(forcesOut)
        const energy = lb ? lb.currentE : 0
        const steps = lb ? lb.step : 0
        self.postMessage({
          type: 'relaxDone',
          energy,
          maxForce: maxF,
          positions: posOut,
          steps,
          converged: maxF < forceThreshold,
        }, [posOut.buffer])
        return
      }
      // Yield to event loop then continue — tight loop, no UI throttle
      relaxTimer = setTimeout(runLoop, 0)
    } catch (err) {
      relaxing = false
      self.postMessage({ type: 'error', message: `Relaxation failed: ${err.message}` })
    }
  }

  runLoop()
}

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

self.onmessage = async (e) => {
  const msg = e.data

  try {
    // Wait for WASM to be ready before handling any messages
    if (initPromise) await initPromise

    switch (msg.type) {
      case 'loadModel': {
        if (!Module) {
          self.postMessage({ type: 'error', message: 'Module not initialized' })
          break
        }
        if (relaxing) stopRelax()
        model = Module.Model.loadFromBuffer(msg.buffer)
        const modelType = model.modelType()
        const cutoff = model.cutoff()
        self.postMessage({ type: 'modelLoaded', modelType, cutoff })
        break
      }

      case 'setSystem': {
        if (relaxing) stopRelax()
        positions = new Float64Array(msg.positions)
        atomicNumbers = new Int32Array(msg.atomicNumbers)
        cell = msg.cell ? new Float64Array(msg.cell) : null
        masses = new Float64Array(msg.masses)
        isPeriodic = msg.periodic
        numAtoms = positions.length / 3
        self.postMessage({ type: 'systemSet', numAtoms })
        break
      }

      case 'startRelax': {
        if (!model) {
          self.postMessage({ type: 'error', message: 'No model loaded' })
          break
        }
        if (!positions) {
          self.postMessage({ type: 'error', message: 'No system set' })
          break
        }
        startRelax(msg.opts || {})
        break
      }

      case 'predict': {
        if (!model) {
          self.postMessage({ type: 'error', message: 'No model loaded' })
          break
        }
        const pos = msg.positions ? new Float64Array(msg.positions) : positions
        const { energy, forces, stress } = predictForces(pos, false)
        const forcesOut = new Float64Array(forces)
        const transfers = [forcesOut.buffer]
        const result = { type: 'prediction', energy, forces: forcesOut }
        if (stress) {
          const stressOut = new Float64Array(stress)
          result.stress = stressOut
          transfers.push(stressOut.buffer)
        }
        self.postMessage(result, transfers)
        break
      }

      case 'stop': {
        stopRelax()
        break
      }

      default:
        self.postMessage({ type: 'error', message: `Unknown message type: ${msg.type}` })
    }
  } catch (err) {
    self.postMessage({ type: 'error', message: `${msg.type} failed: ${err.message}` })
  }
}
