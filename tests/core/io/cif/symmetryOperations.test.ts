import { describe, it, expect } from "vitest";

import {
  parseOperation,
  parseOperations,
  applyOperation,
} from "@/core/io/cif/symmetryOperations";

describe("parseOperation", () => {
  it("parses identity 'x, y, z'", () => {
    const op = parseOperation("x, y, z");

    expect(op.matrix).toEqual([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
    expect(op.translation).toEqual([0, 0, 0]);
  });

  it("parses inversion '-x, -y, -z'", () => {
    const op = parseOperation("-x, -y, -z");

    expect(op.matrix).toEqual([
      [-1, 0, 0],
      [0, -1, 0],
      [0, 0, -1],
    ]);
    expect(op.translation).toEqual([0, 0, 0]);
  });

  it("parses permutation '-y, x, z'", () => {
    const op = parseOperation("-y, x, z");

    expect(op.matrix).toEqual([
      [0, -1, 0],
      [1, 0, 0],
      [0, 0, 1],
    ]);
    expect(op.translation).toEqual([0, 0, 0]);
  });

  it("parses fractional translation 'x, y, z+1/2'", () => {
    const op = parseOperation("x, y, z+1/2");

    expect(op.matrix).toEqual([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
    expect(op.translation).toEqual([0, 0, 0.5]);
  });

  it("parses combined permutation + translation '-x, y+1/2, -z+1/2'", () => {
    const op = parseOperation("-x, y+1/2, -z+1/2");

    expect(op.matrix).toEqual([
      [-1, 0, 0],
      [0, 1, 0],
      [0, 0, -1],
    ]);
    expect(op.translation).toEqual([0, 0.5, 0.5]);
  });

  it("parses negative translation 'x, -y-1/2, z-1/2'", () => {
    const op = parseOperation("x, -y-1/2, z-1/2");

    expect(op.matrix).toEqual([
      [1, 0, 0],
      [0, -1, 0],
      [0, 0, 1],
    ]);
    expect(op.translation).toEqual([0, -0.5, -0.5]);
  });

  it("parses third fractions '1/3+x, 2/3+y, 2/3+z'", () => {
    const op = parseOperation("1/3+x, 2/3+y, 2/3+z");

    expect(op.matrix).toEqual([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
    expect(op.translation[0]).toBeCloseTo(1 / 3);
    expect(op.translation[1]).toBeCloseTo(2 / 3);
    expect(op.translation[2]).toBeCloseTo(2 / 3);
  });

  it("parses complex hexagonal op 'y-x, -x, z'", () => {
    const op = parseOperation("y-x, -x, z");

    expect(op.matrix).toEqual([
      [-1, 1, 0],
      [-1, 0, 0],
      [0, 0, 1],
    ]);
    expect(op.translation).toEqual([0, 0, 0]);
  });
});

describe("applyOperation", () => {
  it("identity leaves coordinates unchanged", () => {
    const op = parseOperation("x, y, z");

    expect(applyOperation(op, [0.1, 0.2, 0.3])).toEqual([0.1, 0.2, 0.3]);
  });

  it("inversion negates coordinates", () => {
    const op = parseOperation("-x, -y, -z");

    expect(applyOperation(op, [0.2, 0.3, 0.4])).toEqual([-0.2, -0.3, -0.4]);
  });

  it("applies translation", () => {
    const op = parseOperation("x, y, z+1/2");

    expect(applyOperation(op, [0.1, 0.2, 0.3])).toEqual([0.1, 0.2, 0.8]);
  });

  it("applies P21/c screw axis '-x, y+1/2, -z+1/2'", () => {
    const op = parseOperation("-x, y+1/2, -z+1/2");

    expect(applyOperation(op, [0.1, 0.2, 0.3])).toEqual([-0.1, 0.7, 0.2]);
  });

  it("applies hexagonal op 'y-x, -x, z'", () => {
    const op = parseOperation("y-x, -x, z");

    expect(applyOperation(op, [0.25, 0.5, 0.75])).toEqual([0.25, -0.25, 0.75]);
  });
});

describe("parseOperations", () => {
  it("parses multiple operations", () => {
    const ops = parseOperations(["x, y, z", "-x, -y, -z"]);

    expect(ops.length).toBe(2);
    expect(ops[0].matrix[0][0]).toBe(1);
    expect(ops[1].matrix[0][0]).toBe(-1);
  });
});
