import type { PhononBands, QPointLabel } from "../phonon";
import { reciprocalLatticeCrystallographic } from "../../lattice/reciprocalLatticeCrystallographic";
import { createMatrix } from "../../matrix/matrix";
import { mul } from "../../matrix/operations/mul";

/**
 * Collapse path discontinuities in a label list: two consecutive q-points
 * with different labels ("C" at 35, "C_2" at 36) become one tick "C|C_2" at
 * the first index, and that index is reported as a break. Consecutive
 * q-points with the same label keep a single entry.
 */
export function mergeLabels(labels: readonly QPointLabel[]): {
  labels: QPointLabel[];
  breaks: number[];
} {
  const merged: QPointLabel[] = [];
  const breaks: number[] = [];
  for (let i = 0; i < labels.length; i++) {
    const cur = labels[i];
    const next = labels[i + 1];
    if (next && next.index === cur.index + 1) {
      if (next.label !== cur.label) {
        merged.push({ index: cur.index, label: `${cur.label}|${next.label}` });
        breaks.push(cur.index);
      } else {
        merged.push(cur);
      }
      i++;
    } else {
      merged.push(cur);
    }
  }
  return { labels: merged, breaks };
}

/** Indices i where the path jumps from q-point i to i + 1. */
export function pathBreaks(bands: PhononBands): number[] {
  return mergeLabels(bands.labels).breaks;
}

/** Cartesian q-points (Å⁻¹, crystallographic: no 2π), [nqpts × 3]. */
export function cartesianQPoints(bands: PhononBands): Float64Array {
  const b = reciprocalLatticeCrystallographic(bands.structure.lattice).basis;
  return mul(createMatrix(bands.nqpts, 3, bands.qpoints), b).data;
}

/**
 * Cumulative path length at each q-point (Å⁻¹, crystallographic: no 2π),
 * the x-axis of a band structure plot. Across a path break the distance
 * does not advance, so the two sides of the jump share an x position.
 */
export function qpointDistances(bands: PhononBands): Float64Array {
  const cart = cartesianQPoints(bands);
  const breaks = new Set(pathBreaks(bands));
  const out = new Float64Array(bands.nqpts);
  for (let q = 1; q < bands.nqpts; q++) {
    const step = breaks.has(q - 1)
      ? 0
      : Math.hypot(
          cart[3 * q] - cart[3 * q - 3],
          cart[3 * q + 1] - cart[3 * q - 2],
          cart[3 * q + 2] - cart[3 * q - 1],
        );
    out[q] = out[q - 1] + step;
  }
  return out;
}
