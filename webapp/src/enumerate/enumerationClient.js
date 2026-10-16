/**
 * enumerationClient.js — Promise wrapper for enumerationWorker.js.
 *
 * Each job gets its own worker, terminated when the job settles, so
 * cancel() just kills it and nothing leaks between runs.
 *
 * Usage:
 *   const job = startEnumerationJob({ type: "run", ... }, onProgress);
 *   const { rows } = await job.promise;  // rejects with isCancelled(err) on cancel()
 *   job.cancel();
 */

const CANCELLED = "Enumeration cancelled";

export const isCancelled = (err) => err?.message === CANCELLED;

export function startEnumerationJob(message, onProgress) {
  const worker = new Worker(
    new URL("./enumerationWorker.js", import.meta.url),
    { type: "module" },
  );
  let done = false;
  let rejectJob;

  const promise = new Promise((resolve, reject) => {
    const finish = (fn, value) => {
      if (done) return;
      done = true;
      worker.terminate();
      fn(value);
    };
    rejectJob = (err) => finish(reject, err);
    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === "progress") onProgress?.(msg);
      else if (msg.type === "result") finish(resolve, msg);
      else if (msg.type === "error") finish(reject, new Error(msg.message));
    };
    worker.onerror = (e) => {
      e.preventDefault();
      finish(reject, new Error(e.message || "Enumeration worker failed"));
    };
  });

  worker.postMessage(message);

  return {
    promise,
    cancel: () => rejectJob(new Error(CANCELLED)),
  };
}
