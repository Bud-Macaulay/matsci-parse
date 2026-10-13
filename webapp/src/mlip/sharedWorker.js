import { useSyncExternalStore } from "react";
import { cartesian } from "matsci-parse";
import { ELEMENT_BY_SYMBOL, massForZ } from "./elements";
import { createMlipWorker } from "./mlipWorkerClient";

/** App-lifetime MLIP worker singleton, shared by the MLIP panel, NEB, and
 * anything else needing predictions — one worker, one loaded model. */
let client = null;
let initPromise = null;
let modelInfo = null;
const listeners = new Set();

function emit() {
  for (const notify of listeners) notify();
}

export async function getSharedWorker() {
  if (client?.isReady) return client;
  initPromise ??= (async () => {
    try {
      client = createMlipWorker();
      await client.init();
      return client;
    } catch (err) {
      client = null;
      initPromise = null;
      throw err;
    }
  })();
  return initPromise;
}

export function peekSharedWorker() {
  return client?.isReady ? client : null;
}

export function noteModelLoaded(info) {
  modelInfo = info;
  emit();
}

export function useSharedModel() {
  return useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      return () => {
        listeners.delete(notify);
      };
    },
    () => modelInfo,
  );
}

/** Flat Cartesian positions [x0, y0, z0, x1, ...] of a structure. */
export function cartPositions(struct) {
  const pos = new Float64Array(struct.sites.length * 3);
  struct.sites.forEach((site, i) => {
    pos.set(cartesian(struct.lattice, site), i * 3);
  });
  return pos;
}

/** Build typed arrays from a structure (no WASM calls). */
export function buildSystemArrays(struct) {
  const nAtoms = struct.sites.length;
  const pos = cartPositions(struct);
  const atomicNums = new Int32Array(nAtoms);
  const massArr = new Float64Array(nAtoms);
  for (let i = 0; i < nAtoms; i++) {
    const sym = struct.sites[i].species.symbol;
    const z = ELEMENT_BY_SYMBOL[sym] ?? 0;
    atomicNums[i] = z;
    massArr[i] = massForZ(z);
  }
  const cell = new Float64Array(struct.lattice.basis.data);
  return { positions: pos, atomicNumbers: atomicNums, cell, masses: massArr };
}
