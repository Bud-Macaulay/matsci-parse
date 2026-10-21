import { describe, expect, it } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { levenbergMarquardt } from "@/core/math/fitting/levenbergMarquardt";

describe("levenbergMarquardt", () => {
  it("minimises the Rosenbrock function from (−1.2, 1)", () => {
    const fit = levenbergMarquardt(
      (p) => new Float64Array([10 * (p[1] - p[0] * p[0]), 1 - p[0]]),
      [-1.2, 1],
    );
    expect(fit.converged).toBe(true);
    expect(fit.params[0]).toBeCloseTo(1, 10);
    expect(fit.params[1]).toBeCloseTo(1, 10);
    expect(fit.cost).toBeLessThan(1e-20);
  });

  // NIST StRD "Misra1a" (lower difficulty), start 1; certified values.
  const x = [77.6, 114.9, 141.1, 190.8, 239.9, 289.0, 332.8, 378.4, 434.8, 477.3, 536.8, 593.1, 689.1, 760.0];
  const y = [10.07, 14.73, 17.94, 23.93, 29.61, 35.18, 40.02, 44.82, 50.76, 55.05, 61.01, 66.4, 75.47, 81.78];
  const misra = (p: Float64Array) =>
    Float64Array.from(x, (xi, i) => y[i] - p[0] * (1 - Math.exp(-p[1] * xi)));

  it("reproduces the NIST Misra1a certified values (numeric Jacobian)", () => {
    const fit = levenbergMarquardt(misra, [500, 1e-4]);
    expect(fit.converged).toBe(true);
    expect(Math.abs(fit.params[0] / 2.3894212918e2 - 1)).toBeLessThan(1e-8);
    expect(Math.abs(fit.params[1] / 5.5015643181e-4 - 1)).toBeLessThan(1e-8);
    expect(Math.abs((2 * fit.cost) / 1.2455138894e-1 - 1)).toBeLessThan(1e-9);
  });

  it("uses an analytic Jacobian when given", () => {
    const fit = levenbergMarquardt(misra, [500, 1e-4], {
      jacobian: (p) =>
        createMatrix(
          x.length,
          2,
          x.flatMap((xi) => [-(1 - Math.exp(-p[1] * xi)), -p[0] * xi * Math.exp(-p[1] * xi)]),
        ),
    });
    expect(Math.abs(fit.params[0] / 2.3894212918e2 - 1)).toBeLessThan(1e-8);
    expect(Math.abs(fit.params[1] / 5.5015643181e-4 - 1)).toBeLessThan(1e-8);
  });

  it("solves a linear problem exactly (zero residual)", () => {
    const fit = levenbergMarquardt(
      (p) => Float64Array.from([0, 1, 2, 3], (t) => p[0] + p[1] * t - (2 - 0.5 * t)),
      [0, 0],
    );
    expect(fit.params[0]).toBeCloseTo(2, 12);
    expect(fit.params[1]).toBeCloseTo(-0.5, 12);
  });

  it("reports the iteration limit", () => {
    const fit = levenbergMarquardt(misra, [500, 1e-4], { maxIterations: 2 });
    expect(fit.converged).toBe(false);
    expect(fit.reason).toBe("maxIterations");
  });

  it("validates input", () => {
    expect(() => levenbergMarquardt((p) => new Float64Array([p[0]]), [1, 2])).toThrow(
      /cannot determine/,
    );
    expect(() => levenbergMarquardt(() => new Float64Array([NaN, 1]), [1])).toThrow(/finite/);
  });

  it("falls back to a finite-difference Jacobian matching the analytic one", () => {
    // Root at p = (0.7, 2); no analytic Jacobian given.
    const fit = levenbergMarquardt(
      (p) => new Float64Array([Math.sin(p[0]) * p[1] - Math.sin(0.7) * 2, p[0] ** 3 - 0.343]),
      [0.5, 1.5],
    );
    const [a, b] = fit.params;
    expect(a).toBeCloseTo(0.7, 9);
    expect(b).toBeCloseTo(2, 9);
    expect(fit.jacobian.data[0]).toBeCloseTo(Math.cos(a) * b, 8);
    expect(fit.jacobian.data[1]).toBeCloseTo(Math.sin(a), 8);
    expect(fit.jacobian.data[2]).toBeCloseTo(3 * a * a, 8);
    expect(fit.jacobian.data[3]).toBeCloseTo(0, 12);
  });
});
