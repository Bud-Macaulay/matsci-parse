import { describe, it, expect } from "vitest";
import { fromCHGCAR } from "@/core/io/chgcar";
import { noSpinCHGCAR } from "../../helpers/bulkFiles/chgcar";

describe("CHGCAR parser", () => {
  describe("Valid CHGCAR files", () => {
    it("parses no-spin CHGCAR correctly", () => {
      const result = fromCHGCAR(noSpinCHGCAR);

      // Check structure
      expect(result.structure).toBeDefined();
      expect(result.structure.lattice).toBeDefined();
      expect(result.structure.sites).toBeDefined();

      // Check volumetric data
      expect(result.volumetric).toBeDefined();
      expect(result.volumetric.shape).toEqual([32, 32, 32]);
      expect(result.volumetric.channels).toBe(1);
      expect(result.volumetric.field).toBe("charge_density_total");

      // Check metadata
      expect(result.volumetric.metadata).toBeDefined();
      expect(result.volumetric.metadata?.source).toBe("CHGCAR");
      expect(result.volumetric.metadata?.sourceGrid).toEqual([32, 32, 32]);
      expect(result.volumetric.metadata?.sourceTotalPoints).toBe(32768);

      // Check that we got proper scaling
      expect(result.volumetric.metadata?.sourceCellVolume).toBeGreaterThan(0);
      expect(result.volumetric.metadata?.sourceGridVolume).toBe(32768);

      // Check data length
      expect(result.volumetric.data.length).toBe(32768);

      // TODO: check volumetric data with real values.
      const sum = Array.from(result.volumetric.data).reduce((a, b) => a + b, 0);
      expect(sum).toBeGreaterThan(0);

      // TODO: structure consistency checks
    });
  });
});
