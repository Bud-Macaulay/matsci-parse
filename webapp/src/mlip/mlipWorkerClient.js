/**
 * mlipWorkerClient.js — Promise-based RPC wrapper for the MLIP Web Worker.
 *
 * The worker communicates via typed messages (no id-based RPC). Each request
 * sends a message; the worker replies with a specific response type. This
 * file maps those to Promises.
 *
 * Usage:
 *   import { createMlipWorker } from './mlipWorkerClient'
 *   const client = createMlipWorker()
 *   await client.init()                      // waits for WASM to be ready
 *   await client.loadModel(buffer)
 *   await client.setSystem({ positions, atomicNumbers, cell, periodic, masses })
 *   const { energy, forces } = await client.predict()
 *   await client.startRelax({ maxSteps, forceThreshold }, onStep)
 *   client.destroy()
 */

export function createMlipWorker() {
  let worker = null
  let ready = false

  // Pending one-shot requests (loadModel, setSystem, predict)
  let pendingResolve = null
  let pendingReject = null

  // Streaming relaxation callbacks
  let relaxResolve = null
  let relaxReject = null
  let onOptStep = null

  function post(msg) {
    if (!worker) throw new Error('Worker not created')
    worker.postMessage(msg)
  }

  function handleMessage(e) {
    const msg = e.data

    switch (msg.type) {
      case 'ready':
        ready = true
        if (pendingResolve) {
          pendingResolve(msg)
          pendingResolve = null
          pendingReject = null
        }
        break

      case 'modelLoaded':
      case 'systemSet':
      case 'prediction':
        if (pendingResolve) {
          pendingResolve(msg)
          pendingResolve = null
          pendingReject = null
        }
        break

      case 'optStep':
        // Streaming relaxation step
        if (onOptStep) onOptStep(msg)
        break

      case 'relaxDone':
        // Relaxation finished (converged or max steps)
        if (relaxResolve) {
          relaxResolve({
            converged: msg.converged,
            energy: msg.energy,
            maxForce: msg.maxForce,
            positions: msg.positions,
            steps: msg.steps,
          })
          relaxResolve = null
          relaxReject = null
          onOptStep = null
        }
        break

      case 'error':
        if (pendingReject) {
          pendingReject(new Error(msg.message))
          pendingResolve = null
          pendingReject = null
        } else if (relaxReject) {
          relaxReject(new Error(msg.message))
          relaxResolve = null
          relaxReject = null
          onOptStep = null
        } else {
          console.error('[mlipWorker] Unhandled error:', msg.message)
        }
        break
    }
  }

  function create() {
    worker = new Worker(new URL('./mlipWorker.js', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = handleMessage
    worker.onerror = (e) => {
      console.error('[mlipWorker] Worker error:', e)
      if (pendingReject) {
        pendingReject(new Error(e.message || 'Worker error'))
        pendingResolve = null
        pendingReject = null
      }
      if (relaxReject) {
        relaxReject(new Error(e.message || 'Worker error'))
        relaxResolve = null
        relaxReject = null
        onOptStep = null
      }
    }
  }

  return {
    create,

    /**
     * Wait for the worker's WASM module to be ready.
     * The worker initializes WASM eagerly on load, so this just
     * waits for the 'ready' message.
     */
    async init() {
      if (ready) return
      if (!worker) create()
      await new Promise((resolve, reject) => {
        pendingResolve = resolve
        pendingReject = reject
        // If 'ready' already fired before we set up the listener, check now
        if (ready) {
          pendingResolve = null
          pendingReject = null
          resolve()
        }
      })
    },

    /**
     * Load a GGUF model buffer into the worker.
     * @param {ArrayBuffer} buffer
     * @returns {Promise<{ modelType: string, cutoff: number }>}
     */
    async loadModel(buffer) {
      return new Promise((resolve, reject) => {
        pendingResolve = resolve
        pendingReject = reject
        post({ type: 'loadModel', buffer })
      })
    },

    /**
     * Set the atomic system in the worker.
     * All typed arrays are transferred (zero-copy).
     */
    async setSystem({ positions, atomicNumbers, cell, periodic, masses }) {
      return new Promise((resolve, reject) => {
        pendingResolve = resolve
        pendingReject = reject
        const transfers = [
          positions.buffer,
          atomicNumbers.buffer,
          masses.buffer,
        ]
        if (cell) transfers.push(cell.buffer)
        post({
          type: 'setSystem',
          positions,
          atomicNumbers,
          cell,
          periodic,
          masses,
        })
      })
    },

    /**
     * Run a single-point prediction.
     * @param {Float64Array} [pos] - Predict at these positions (default: current)
     * @returns {Promise<{ energy, forces, stress }>}
     */
    async predict(pos) {
      return new Promise((resolve, reject) => {
        pendingResolve = (msg) => {
          resolve({
            energy: msg.energy,
            forces: msg.forces,
            stress: msg.stress,
          })
        }
        pendingReject = reject
        post({ type: 'predict', positions: pos })
      })
    },

    /**
     * Start L-BFGS relaxation. Streams optStep events via onStep callback.
     * Returns a promise that resolves when relaxation converges.
     *
     * @param {Object} opts - { maxSteps, forceThreshold }
     * @param {Function} onStep - Called with each { step, energy, maxForce, positions, converged }
     * @returns {Promise<{ converged, energy, maxForce, positions, steps }>}
     */
    startRelax(opts = {}, onStep) {
      return new Promise((resolve, reject) => {
        relaxResolve = resolve
        relaxReject = reject
        onOptStep = onStep
        post({ type: 'startRelax', opts })
      })
    },

    /**
     * Stop the current relaxation.
     */
    stop() {
      onOptStep = null
      relaxResolve = null
      relaxReject = null
      post({ type: 'stop' })
    },

    /**
     * Terminate the worker entirely.
     */
    destroy() {
      if (worker) {
        worker.terminate()
        worker = null
        ready = false
        pendingResolve = null
        pendingReject = null
        relaxResolve = null
        relaxReject = null
        onOptStep = null
      }
    },

    get isReady() {
      return ready
    },
  }
}
