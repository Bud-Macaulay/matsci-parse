import type { PhononBands } from "../phonon";
import { pathBreaks } from "./path";

/**
 * Reorder modes at each q-point so that band n follows the same branch
 * through crossings, by greedily matching each mode to the one at the
 * previous q-point with the largest eigenvector overlap |⟨e_prev|e⟩|.
 * Ordering is kept as-is across path breaks, where overlaps are meaningless.
 */
export function connectBands(bands: PhononBands): PhononBands {
  const { nqpts, nmodes, frequencies, eigenvectors } = bands;
  const vecSize = nmodes * 2; // complex components per mode
  const qSize = nmodes * vecSize;
  const breaks = new Set(pathBreaks(bands));

  const freqOut = new Float64Array(frequencies.length);
  const vecOut = new Float64Array(eigenvectors.length);

  // order[n] = raw mode index at the current q-point that band n maps to
  let order = Array.from({ length: nmodes }, (_, i) => i);
  const overlap = new Float64Array(nmodes * nmodes);
  const used = new Uint8Array(nmodes);
  const connection = new Int32Array(nmodes);

  for (let q = 0; q < nqpts; q++) {
    if (q > 0 && !breaks.has(q - 1)) {
      const prev = (q - 1) * qSize;
      const cur = q * qSize;
      // overlap[i * nmodes + j] = |⟨prev_i | cur_j⟩|
      for (let i = 0; i < nmodes; i++) {
        for (let j = 0; j < nmodes; j++) {
          let re = 0;
          let im = 0;
          const a = prev + i * vecSize;
          const b = cur + j * vecSize;
          for (let c = 0; c < vecSize; c += 2) {
            const ar = eigenvectors[a + c];
            const ai = eigenvectors[a + c + 1];
            const br = eigenvectors[b + c];
            const bi = eigenvectors[b + c + 1];
            re += ar * br + ai * bi;
            im += ar * bi - ai * br;
          }
          overlap[i * nmodes + j] = Math.hypot(re, im);
        }
      }
      // Greedy assignment in previous-mode order; ties go to the highest index.
      used.fill(0);
      for (let i = 0; i < nmodes; i++) {
        let best = -1;
        let bestVal = 0;
        for (let j = nmodes - 1; j >= 0; j--) {
          if (used[j]) continue;
          const val = overlap[i * nmodes + j];
          if (best < 0 || val > bestVal) {
            best = j;
            bestVal = val;
          }
        }
        used[best] = 1;
        connection[i] = best;
      }
      order = order.map((raw) => connection[raw]);
    }

    for (let n = 0; n < nmodes; n++) {
      const raw = order[n];
      freqOut[q * nmodes + n] = frequencies[q * nmodes + raw];
      const src = q * qSize + raw * vecSize;
      vecOut.set(eigenvectors.subarray(src, src + vecSize), q * qSize + n * vecSize);
    }
  }

  return { ...bands, frequencies: freqOut, eigenvectors: vecOut };
}
