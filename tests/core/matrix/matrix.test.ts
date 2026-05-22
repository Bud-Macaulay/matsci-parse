import { describe, expect, it } from "vitest";

import { createMatrix, identity, clone, index } from "@/core/matrix/matrix";

describe("matrix core", () => {
  describe("createMatrix", () => {
    it("creates a zero-initialized matrix", () => {
      const m = createMatrix(2, 3);

      expect(m.rows).toBe(2);
      expect(m.cols).toBe(3);
      expect(m.data.length).toBe(6);
      expect(Array.from(m.data)).toEqual([0, 0, 0, 0, 0, 0]);
    });

    it("accepts iterable data", () => {
      const m = createMatrix(2, 2, [1, 2, 3, 4]);

      expect(Array.from(m.data)).toEqual([1, 2, 3, 4]);
    });

    it("throws when data size mismatches", () => {
      expect(() => {
        createMatrix(2, 2, [1, 2, 3]); // too small
      }).toThrow();

      expect(() => {
        createMatrix(2, 2, [1, 2, 3, 4, 5]); // too big
      }).toThrow();
    });

    it("creates independent buffers", () => {
      const data = [1, 2, 3, 4];
      const m = createMatrix(2, 2, data);

      data[0] = 999;

      expect(m.data[0]).toBe(1);
    });
  });

  // -------------------------
  // identity
  // -------------------------
  describe("identity", () => {
    it("creates correct identity matrix", () => {
      const I = identity(3);

      expect(Array.from(I.data)).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    });

    it("has correct shape", () => {
      const I = identity(4);

      expect(I.rows).toBe(4);
      expect(I.cols).toBe(4);
      expect(I.data.length).toBe(16);
    });

    it("works for size 1", () => {
      const I = identity(1);

      expect(Array.from(I.data)).toEqual([1]);
    });
  });

  // -------------------------
  // clone
  // -------------------------
  describe("clone", () => {
    it("copies matrix values", () => {
      const m = createMatrix(2, 2, [1, 2, 3, 4]);
      const c = clone(m);

      expect(Array.from(c.data)).toEqual([1, 2, 3, 4]);
    });

    it("creates a deep copy of buffer", () => {
      const m = createMatrix(2, 2, [1, 2, 3, 4]);
      const c = clone(m);

      c.data[0] = 999;

      expect(m.data[0]).toBe(1);
    });

    it("preserves shape", () => {
      const m = createMatrix(3, 2);
      const c = clone(m);

      expect(c.rows).toBe(3);
      expect(c.cols).toBe(2);
    });
  });

  // -------------------------
  // index
  // -------------------------
  describe("index", () => {
    it("maps row-major indices correctly", () => {
      // 3x3:
      // [0,1,2,
      //  3,4,5,
      //  6,7,8]

      expect(index(3, 0, 0)).toBe(0);
      expect(index(3, 0, 2)).toBe(2);
      expect(index(3, 1, 0)).toBe(3);
      expect(index(3, 2, 2)).toBe(8);
    });

    it("is consistent with manual layout", () => {
      const cols = 4;

      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
          expect(index(cols, row, col)).toBe(row * cols + col);
        }
      }
    });
  });
});
