import { describe, it, expect } from "vitest";
import { fromCHGCAR } from "@/core/io/chgcar";
import { microSpinCHGCAR, noSpinCHGCAR } from "../../helpers/bulkFiles/chgcar";
import { expectArrayClose } from "../../helpers/closeUtils";

describe("CHGCAR parser", () => {
  describe("no-spin CHGCAR", () => {
    it("parses structure, volumetric data, and metadata", () => {
      const result = fromCHGCAR(noSpinCHGCAR);

      // Structure consistency checks
      expect(result.structure.sites).toHaveLength(1);
      expect(result.structure.sites[0].species.symbol).toBe("Li");
      expectArrayClose(result.structure.sites[0].frac, [0, 0, 0]);
      expectArrayClose(
        result.structure.lattice.basis.data,
        [2.969072, -0.000523, -0.000907, -0.987305, 2.80011, 0.000907, -0.987305, -1.402326, 2.423654],
      );

      // Volumetric data
      expect(result.volumetric).toBeDefined();
      expect(result.volumetric.shape).toEqual([32, 32, 32]);
      expect(result.volumetric.channels).toBe(1);
      expect(result.volumetric.field).toBe("charge_density_total");

      // Metadata
      expect(result.volumetric.metadata).toBeDefined();
      expect(result.volumetric.metadata?.source).toBe("CHGCAR");
      expect(result.volumetric.metadata?.sourceGrid).toEqual([32, 32, 32]);
      expect(result.volumetric.metadata?.sourceTotalPoints).toBe(32768);
      expect(result.volumetric.metadata?.sourceCellVolume).toBeGreaterThan(0);
      expect(result.volumetric.metadata?.sourceGridVolume).toBe(32768);

      // Data length
      expect(result.volumetric.data.length).toBe(32768);

      // Volumetric data with real values
      expectArrayClose(result.volumetric.data.slice(0, 5), [
        6.673841968480538e-7,
        6.760645266883274e-7,
        7.01198541029183e-7,
        7.403735339120206e-7,
        7.908179709218608e-7,
      ]);
      const sum = Array.from(result.volumetric.data).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(0.04963182395015282, 15);
    });
  });

  describe("micro-spin CHGCAR", () => {
    it("parses structure, volumetric data, and metadata", () => {
      const result = fromCHGCAR(microSpinCHGCAR);

      // Structure consistency checks
      expect(result.structure.sites).toHaveLength(1);
      expect(result.structure.sites[0].species.symbol).toBe("Li");
      expectArrayClose(result.structure.sites[0].frac, [0, 0, 0]);

      // Volumetric data
      expect(result.volumetric).toBeDefined();
      expect(result.volumetric.shape).toEqual([2, 2, 2]);
      expect(result.volumetric.channels).toBe(1);

      const charge = Array.from(result.volumetric.data);

      expect(charge).toEqual([1.25, 0.125, 1.25, 0.25, 1.25, 0.375, 1.25, 0.5]);
      expect(result.volumetric.field).toBe("charge_density_total");

      // Metadata
      expect(result.volumetric.metadata).toBeDefined();
      expect(result.volumetric.metadata?.source).toBe("CHGCAR");
      expect(result.volumetric.metadata?.sourceGrid).toEqual([2, 2, 2]);
      expect(result.volumetric.metadata?.sourceTotalPoints).toBe(8);
      expect(result.volumetric.metadata?.sourceCellVolume).toBeGreaterThan(0);
      expect(result.volumetric.metadata?.sourceGridVolume).toBe(8);

      // Data length
      expect(result.volumetric.data.length).toBe(8);
    });
  });
});
