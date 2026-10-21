import { createMatrix, type Matrix } from "../../matrix/matrix";
import { add } from "../../matrix/operations/add";
import { fromDiagonal } from "../../matrix/operations/constructors";
import { mul } from "../../matrix/operations/mul";
import { scale } from "../../matrix/operations/scale";
import { solve } from "../../matrix/operations/solve";
import { transpose } from "../../matrix/operations/transpose";
import { dot } from "../../matrix/operations/vector/dot";
import { matVec } from "../../matrix/operations/vector/matVec";
import { norm } from "../../matrix/operations/vector/norm";

/** Residual function r(p) of a nonlinear least-squares problem. */
export type ResidualFunction = (params: Float64Array) => Float64Array;

/** Options for {@link levenbergMarquardt}. */
export interface LevenbergMarquardtOptions {
  /** Analytic Jacobian ∂rᵢ/∂pⱼ (m×n). Default: central finite differences. */
  jacobian?: (params: Float64Array) => Matrix;
  /** Maximum number of accepted + rejected steps. Default 1000. */
  maxIterations?: number;
  /** Stop when an accepted step lowers the cost by less than
   * `ftol · cost` (relative). Default 1e-15. */
  ftol?: number;
  /** Stop when ‖Δp‖ <= xtol · (‖p‖ + xtol). Default 1e-15. */
  xtol?: number;
  /** Stop when the largest cosine between r and a Jacobian column,
   * |Jⱼᵀr| / (‖Jⱼ‖·‖r‖), is <= gtol (MINPACK's criterion). Default 1e-15. */
  gtol?: number;
  /** Initial damping relative to max diag(JᵀJ). Default 1e-3. */
  tau?: number;
  /** Relative finite-difference step (h = diffStep·|pⱼ|, or diffStep when
   * pⱼ = 0) for the numeric Jacobian. Default 6e-6
   * (≈ ε^(1/3), optimal for central differences). */
  diffStep?: number;
}

/** Result of {@link levenbergMarquardt}. */
export interface LevenbergMarquardtResult {
  /** Best-fit parameters. */
  params: Float64Array;
  /** Residuals r(params). */
  residuals: Float64Array;
  /** Half the sum of squared residuals, ½·Σrᵢ². */
  cost: number;
  /** Jacobian at the solution (m×n). */
  jacobian: Matrix;
  /** Iterations used (accepted and rejected steps). */
  iterations: number;
  /** True when a tolerance was met (false: iteration limit reached). */
  converged: boolean;
  /** Which criterion stopped the iteration. */
  reason: "ftol" | "xtol" | "gtol" | "zero-residual" | "maxIterations";
}

/** Central finite-difference Jacobian of r at p. */
function numericJacobian(
  residual: ResidualFunction,
  params: Float64Array,
  diffStep = 6e-6,
): Matrix {
  const n = params.length;
  const r0 = residual(params);
  const m = r0.length;
  const J = createMatrix(m, n);

  for (let j = 0; j < n; j++) {
    const h = diffStep * (Math.abs(params[j]) || 1);
    const plus = Float64Array.from(params);
    const minus = Float64Array.from(params);
    plus[j] += h;
    minus[j] -= h;

    const rp = residual(plus);
    const rm = residual(minus);
    const span = plus[j] - minus[j];

    for (let i = 0; i < m; i++) {
      J.data[i * n + j] = (rp[i] - rm[i]) / span;
    }
  }

  return J;
}

function halfSquares(r: Float64Array): number {
  return 0.5 * dot(r, r);
}

/**
 * Minimise ½‖r(p)‖² by the Levenberg–Marquardt method with Marquardt's
 * diagonal scaling (the step solves (JᵀJ + μ·diag(JᵀJ))·h = −Jᵀr, so it is
 * invariant to the parameters' units) and Nielsen's gain-ratio damping
 * update. Suitable for small, well-posed fits (a handful of parameters).
 *
 * @param residual - r(p): returns the m residuals for parameters p.
 * @param initial - Starting parameters p₀ (n values, n <= m).
 * @param options - Tolerances, iteration cap, optional analytic Jacobian.
 * @returns The minimiser, its residuals/cost/Jacobian, and why it stopped.
 * @throws If the residuals are non-finite at the starting point or m < n.
 */
export function levenbergMarquardt(
  residual: ResidualFunction,
  initial: ArrayLike<number>,
  options: LevenbergMarquardtOptions = {},
): LevenbergMarquardtResult {
  const {
    maxIterations = 1000,
    ftol = 1e-15,
    xtol = 1e-15,
    gtol = 1e-15,
    tau = 1e-3,
    diffStep = 6e-6,
  } = options;
  const jacobianOf =
    options.jacobian ??
    ((p: Float64Array) => numericJacobian(residual, p, diffStep));

  let p = Float64Array.from(initial);
  let r = residual(p);
  const n = p.length;

  if (r.length < n) {
    throw new Error(
      `levenbergMarquardt: ${r.length} residuals cannot determine ${n} parameters`,
    );
  }

  if (!r.every(Number.isFinite)) {
    throw new Error("levenbergMarquardt: residuals are not finite at p0");
  }

  let cost = halfSquares(r);
  let J = jacobianOf(p);
  let JT = transpose(J);
  let A = mul(JT, J);
  let g = matVec(JT, r);
  let mu = tau * Math.max(...Array.from({ length: n }, (_, i) => A.data[i * n + i]));
  let nu = 2;
  let iterations = 0;
  let reason: LevenbergMarquardtResult["reason"] = "maxIterations";

  const gradientCosine = (): number => {
    const rn = Math.sqrt(2 * cost);
    let worst = 0;

    for (let j = 0; j < n; j++) {
      const cn = Math.sqrt(A.data[j * n + j]);

      if (cn > 0 && rn > 0) {
        worst = Math.max(worst, Math.abs(g[j]) / (cn * rn));
      }
    }

    return worst;
  };

  while (iterations < maxIterations) {
    if (cost === 0) {
      reason = "zero-residual";
      break;
    }

    if (gradientCosine() <= gtol) {
      reason = "gtol";
      break;
    }

    iterations++;

    // Marquardt scaling; guard columns with vanishing curvature.
    const diag = Float64Array.from({ length: n }, (_, i) =>
      Math.max(A.data[i * n + i], 1e-300),
    );
    let h: Float64Array;

    try {
      h = solve(add(A, scale(fromDiagonal(diag), mu)), g).map((x) => -x);
    } catch {
      mu *= nu;
      nu *= 2;
      continue;
    }

    if (norm(h) <= xtol * (norm(p) + xtol)) {
      reason = "xtol";
      break;
    }

    const pNew = p.map((x, i) => x + h[i]);
    const rNew = residual(pNew);
    const costNew = rNew.every(Number.isFinite) ? halfSquares(rNew) : Infinity;

    // Predicted reduction ½·hᵀ(μ·D·h − g) is positive for any μ > 0.
    let predicted = 0;

    for (let i = 0; i < n; i++) {
      predicted += 0.5 * h[i] * (mu * diag[i] * h[i] - g[i]);
    }

    const rho = (cost - costNew) / predicted;

    if (rho > 0 && Number.isFinite(costNew)) {
      const reduction = cost - costNew;
      p = pNew;
      r = rNew;
      cost = costNew;
      J = jacobianOf(p);
      JT = transpose(J);
      A = mul(JT, J);
      g = matVec(JT, r);
      mu *= Math.max(1 / 3, 1 - (2 * rho - 1) ** 3);
      nu = 2;

      if (reduction <= ftol * (cost + reduction)) {
        reason = "ftol";
        break;
      }
    } else {
      mu *= nu;
      nu *= 2;

      if (!Number.isFinite(mu)) break;
    }
  }

  return {
    params: p,
    residuals: r,
    cost,
    jacobian: J,
    iterations,
    converged: reason !== "maxIterations",
    reason,
  };
}
