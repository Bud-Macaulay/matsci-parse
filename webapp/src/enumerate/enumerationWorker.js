/**
 * enumerationWorker.js — runs ordering enumeration and Ewald ranking off the
 * main thread. One worker per job (see enumerationClient.js), so it keeps
 * no state between messages and cancelling is just terminate().
 *
 * Main -> Worker:
 *   { type: "run", parent, usePrimitive, maxSize, maxCombinations, charges }
 *   { type: "rerank", rows, charges }
 *
 * Worker -> Main:
 *   { type: "progress", stage: "enumerating" | "ranking", done, total }
 *   { type: "result", rows, parentSites }
 *   { type: "error", message }
 */

import {
  enumerateOrderings,
  primitiveOfDisordered,
  rankByEwald,
  sortByEnergy,
} from "./enumeration";

const progress = (stage) => (done, total) =>
  self.postMessage({ type: "progress", stage, done, total });

async function run({
  parent,
  usePrimitive,
  maxSize,
  maxCombinations,
  charges,
}) {
  progress("enumerating")(0, 0);
  const p = usePrimitive ? await primitiveOfDisordered(parent) : parent;
  const found = await enumerateOrderings(p, { maxSize, maxCombinations });
  const ranked = await rankByEwald(found, charges, progress("ranking"));
  return { rows: sortByEnergy(ranked), parentSites: p.sites.length };
}

async function rerank({ rows, charges }) {
  const ranked = await rankByEwald(rows, charges, progress("ranking"));
  return { rows: sortByEnergy(ranked) };
}

self.onmessage = async (e) => {
  const msg = e.data;
  try {
    const out = msg.type === "run" ? await run(msg) : await rerank(msg);
    self.postMessage({ type: "result", ...out });
  } catch (err) {
    self.postMessage({ type: "error", message: err?.message ?? String(err) });
  }
};
