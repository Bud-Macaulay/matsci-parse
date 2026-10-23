/**
 * Solve the linear assignment problem on a dense n×n cost matrix: find the
 * permutation σ minimising Σᵢ cost[i, σ(i)]. Uses the Hungarian
 * (Kuhn–Munkres) method with row/column potentials and shortest augmenting
 * paths, O(n³) time and O(n) extra memory.
 *
 * To maximise a score, pass its negation. Costs must be finite.
 *
 * Deterministic: rows are added one at a time in index order, and ties
 * between equally cheap columns go to the lowest column index, so equal
 * inputs give equal outputs. When several assignments are optimal, which
 * one is returned is otherwise unspecified; bias the costs to prefer one.
 *
 * @param cost - Row-major [n × n] costs.
 * @param n - Matrix size.
 * @returns assignment[i] = column assigned to row i.
 */
export function linearAssignment(cost: ArrayLike<number>, n: number): Int32Array {
  if (cost.length !== n * n) {
    throw new Error(`Expected ${n * n} costs, got ${cost.length}`);
  }
  for (let k = 0; k < cost.length; k++) {
    if (!Number.isFinite(cost[k])) throw new Error("linearAssignment: costs must be finite");
  }
  // 1-based internally, column 0 is a virtual root for the augmenting tree.
  const u = new Float64Array(n + 1); // row potentials
  const v = new Float64Array(n + 1); // column potentials
  const rowOf = new Int32Array(n + 1); // rowOf[j] = row matched to column j (0 = free)
  const way = new Int32Array(n + 1); // previous column on the augmenting path
  const minv = new Float64Array(n + 1); // reduced-cost slack per column
  const done = new Uint8Array(n + 1); // column is in the alternating tree

  for (let i = 1; i <= n; i++) {
    // Grow a shortest-path tree from the new row i until it reaches a free column.
    rowOf[0] = i;
    let j0 = 0;
    minv.fill(Infinity);
    done.fill(0);
    do {
      done[j0] = 1;
      const i0 = rowOf[j0];
      const base = (i0 - 1) * n - 1;
      const ui0 = u[i0];
      let delta = Infinity;
      let j1 = 0;
      for (let j = 1; j <= n; j++) {
        if (done[j]) continue;
        const cur = cost[base + j] - ui0 - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= n; j++) {
        if (done[j]) {
          u[rowOf[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (rowOf[j0] !== 0);
    // Flip matched/unmatched edges back along the path to the root.
    do {
      const j1 = way[j0];
      rowOf[j0] = rowOf[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  const assignment = new Int32Array(n);
  for (let j = 1; j <= n; j++) assignment[rowOf[j] - 1] = j - 1;
  return assignment;
}
