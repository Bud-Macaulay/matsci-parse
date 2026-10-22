import { mul } from "../../../matrix/operations/mul";
import { transpose } from "../../../matrix/operations/transpose";
import { luInverse } from "../../../matrix/operations/inverse/luInverse";
import { levenbergMarquardt } from "../../../math/fitting/levenbergMarquardt";
import { polyfit } from "../../../math/fitting/polyfit";
import { EV_PER_A3_TO_GPA } from "../../../units/pressure";
import { eosModels, type EosName, type EosParameters } from "./forms";

/** Minimum number of (V, E) points accepted by {@link fitEos}: four
 * parameters plus at least one degree of freedom for the residual. */
export const EOS_MIN_POINTS = 5;

/** Options for {@link fitEos}. */
export interface FitEosOptions {
  /** Equation of state to fit. Default "birchMurnaghan". */
  form?: EosName;
  /**
   * When true (default), throw if the minimum of the initial parabola or
   * of the final fit lies outside the sampled volume range (extrapolated
   * E₀/V₀/B₀ are unreliable). When false, report it in `warnings`.
   */
  requireBracketedMinimum?: boolean;
  /** Levenberg–Marquardt iteration cap. Default 1000. */
  maxIterations?: number;
}

/** A fitted equation of state. Energies in eV, volumes in Å³. */
export interface EosFit extends EosParameters {
  /** The fitted form. */
  form: EosName;
  /** Bulk modulus B₀ in GPa. */
  b0GPa: number;
  /** One-standard-deviation uncertainties of e0, v0, b0 (eV/Å³), b1 from
   * the covariance s²·(JᵀJ)⁻¹, with s² = Σr²/(N − 4). */
  standardErrors: EosParameters;
  /** E(V) in eV for V in Å³. */
  energy(volume: number): number;
  /** P(V) = −dE/dV in eV/Å³ (positive = compressed) for V in Å³. */
  pressure(volume: number): number;
  /** Data minus fit, eV, in input order. */
  residuals: Float64Array;
  /** Root-mean-square residual (eV). */
  rmse: number;
  /** Coefficient of determination 1 − SS_res/SS_tot. */
  rSquared: number;
  /** Levenberg–Marquardt iterations. */
  iterations: number;
  /** Non-fatal problems (unbracketed minimum when allowed, poor fit, …). */
  warnings: string[];
}

function validate(volumes: ArrayLike<number>, energies: ArrayLike<number>) {
  if (volumes.length !== energies.length) {
    throw new Error(
      `fitEos: ${volumes.length} volumes but ${energies.length} energies`,
    );
  }

  if (volumes.length < EOS_MIN_POINTS) {
    throw new Error(
      `fitEos: need at least ${EOS_MIN_POINTS} (volume, energy) points, got ${volumes.length}`,
    );
  }

  const seen = new Set<number>();

  for (let i = 0; i < volumes.length; i++) {
    const v = volumes[i];

    if (!Number.isFinite(v) || v <= 0) {
      throw new Error(`fitEos: volume ${v} at index ${i} is not a positive finite number`);
    }

    if (!Number.isFinite(energies[i])) {
      throw new Error(`fitEos: energy at index ${i} is not finite`);
    }

    seen.add(v);
  }

  if (seen.size < EOS_MIN_POINTS) {
    throw new Error(
      `fitEos: need at least ${EOS_MIN_POINTS} distinct volumes, got ${seen.size}`,
    );
  }
}

/**
 * Fit an equation of state to energy–volume data, the way ASE's
 * EquationOfState and pymatgen's EOS do: a parabola E = c₀ + c₁V + c₂V²
 * gives the initial guess (V₀ = −c₁/2c₂, B₀ = 2c₂V₀, B₀′ = 4), then
 * Levenberg–Marquardt minimises Σ(E_fit − E)² over (E₀, V₀, B₀, B₀′).
 *
 * Volumes and energies must share a normalisation (both per cell, or both
 * per atom); B₀ does not depend on it.
 *
 * @param volumes - Volumes in Å³ (at least {@link EOS_MIN_POINTS} distinct).
 * @param energies - Total energies in eV.
 * @param options - EOS form and bracketing policy.
 * @returns E₀ (eV), V₀ (Å³), B₀ (eV/Å³ and GPa), B₀′, the E(V) and P(V)
 *   functions, residuals and fit statistics.
 * @throws If the data are too few, non-finite, not convex (no minimum),
 *   the minimum is outside the sampled range (unless allowed), or the fit
 *   does not converge to a positive bulk modulus.
 */
export function fitEos(
  volumes: ArrayLike<number>,
  energies: ArrayLike<number>,
  options: FitEosOptions = {},
): EosFit {
  const {
    form = "birchMurnaghan",
    requireBracketedMinimum = true,
    maxIterations = 1000,
  } = options;
  const model = eosModels[form];

  if (!model) {
    throw new Error(`fitEos: unknown equation of state "${form}"`);
  }

  validate(volumes, energies);

  const n = volumes.length;
  const V = Float64Array.from(volumes);
  const E = Float64Array.from(energies);
  const vMin = Math.min(...V);
  const vMax = Math.max(...V);
  const warnings: string[] = [];

  const outOfRange = (what: string, v: number) => {
    const message = `fitEos: ${what} V0 = ${v} Å³ lies outside the sampled volumes [${vMin}, ${vMax}] Å³; sample around the minimum`;

    if (requireBracketedMinimum) throw new Error(message);

    warnings.push(message);
  };

  const [c0, c1, c2] = polyfit(V, E, 2);

  if (!(c2 > 0)) {
    throw new Error(
      "fitEos: the data have no minimum (a parabola fit is not convex); check the energies",
    );
  }

  const vGuess = -c1 / (2 * c2);

  if (vGuess < vMin || vGuess > vMax) outOfRange("the initial parabola's", vGuess);

  const initial = [c0 + c1 * vGuess + c2 * vGuess * vGuess, vGuess, 2 * c2 * vGuess, 4];
  const toParams = (p: ArrayLike<number>): EosParameters => ({
    e0: p[0],
    v0: p[1],
    b0: p[2],
    b1: p[3],
  });

  const fit = levenbergMarquardt(
    (p) => {
      const params = toParams(p);
      return V.map((v, i) => model.energy(v, params) - E[i]);
    },
    initial,
    { maxIterations },
  );

  const params = toParams(fit.params);

  if (!fit.converged) {
    throw new Error(
      `fitEos: the ${form} fit did not converge in ${maxIterations} iterations`,
    );
  }

  if (!(params.b0 > 0) || !Object.values(params).every(Number.isFinite)) {
    throw new Error(
      `fitEos: the ${form} fit gave an unphysical bulk modulus (B0 = ${params.b0})`,
    );
  }

  if (params.v0 < vMin || params.v0 > vMax) outOfRange("the fitted", params.v0);

  const residuals = fit.residuals.map((r) => -r);
  const ssRes = 2 * fit.cost;
  const mean = E.reduce((a, b) => a + b, 0) / n;
  const ssTot = E.reduce((a, e) => a + (e - mean) ** 2, 0);
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 1;

  if (rSquared < 0.99) {
    warnings.push(
      `fitEos: poor ${form} fit (R² = ${rSquared.toFixed(4)}); check the data`,
    );
  }

  // Covariance s²·(JᵀJ)⁻¹; JᵀJ can be singular for degenerate data.
  let standardErrors: EosParameters = { e0: NaN, v0: NaN, b0: NaN, b1: NaN };

  try {
    const cov = luInverse(mul(transpose(fit.jacobian), fit.jacobian));
    const s2 = ssRes / (n - 4);
    standardErrors = toParams(
      [0, 1, 2, 3].map((i) => Math.sqrt(Math.max(0, s2 * cov.data[i * 4 + i]))),
    );
  } catch {
    warnings.push("fitEos: parameter covariance is singular");
  }

  return {
    form,
    ...params,
    b0GPa: params.b0 * EV_PER_A3_TO_GPA,
    standardErrors,
    energy: (v: number) => model.energy(v, params),
    pressure: (v: number) => model.pressure(v, params),
    residuals,
    rmse: Math.sqrt(ssRes / n),
    rSquared,
    iterations: fit.iterations,
    warnings,
  };
}
