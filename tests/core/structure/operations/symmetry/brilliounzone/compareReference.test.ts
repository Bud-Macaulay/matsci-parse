import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { fromPOSCAR } from "@/core/io/poscar";
import { POSCARS } from "../../../../../helpers/bulkFiles/allExtBrav";
import {
  getExplicitKPath,
  getPath,
} from "@/core/structure/operations/symmetry/brilliounzone/seekpath";
import { join } from "node:path";

const refs = JSON.parse(
  readFileSync(join(process.cwd(), "tests/helpers/seekpathReference.json"), "utf8"),
);

it("compare vs seekpath reference", async () => {
  const failures: string[] = [];
  for (const ref of refs) {
    const [ext, , invPart, alt] = ref.key.split("/");
    const key = alt
      ? `${ext}/POSCAR_${invPart}_${alt}`
      : `${ext}/POSCAR_${invPart}`;
    const structure = fromPOSCAR(POSCARS[key]);
    const res = await getExplicitKPath(structure);
    const label = `${key}`;
    const near = (a: number, b: number, tol = 1e-4) => Math.abs(a - b) < tol;
    const nearMat = (A: number[][], B: number[][]) => {
      if (A.length !== B.length) return false;
      for (let i = 0; i < A.length; i++) {
        for (let j = 0; j < 3; j++) if (!near(A[i][j], B[i][j])) return false;
      }
      return true;
    };
    const nearMatList = (A: number[][], B: number[][], tol: number) => {
      if (A.length !== B.length) return false;
      for (let i = 0; i < A.length; i++) {
        for (let j = 0; j < 3; j++) {
          if (!near(A[i][j], B[i][j], tol)) return false;
        }
      }
      return true;
    };

    if (res.bravais_lattice_extended !== ref.bravais_lattice_extended) {
      failures.push(`${label}: ext '${res.bravais_lattice_extended}' != '${ref.bravais_lattice_extended}'`);
    }
    if (res.spacegroup_number !== ref.spacegroup_number) {
      failures.push(`${label}: sg ${res.spacegroup_number} != ${ref.spacegroup_number}`);
    }
    if (res.has_inversion_symmetry !== ref.has_inversion_symmetry) {
      failures.push(`${label}: hasInv ${res.has_inversion_symmetry} != ${ref.has_inversion_symmetry}`);
    }
    if (res.augmented_path !== ref.augmented_path) {
      failures.push(`${label}: augmented ${res.augmented_path} != ${ref.augmented_path}`);
    }
    // point coords
    for (const [pname, coords] of Object.entries(res.point_coords)) {
      const refCoords = ref.point_coords[pname];
      if (!refCoords) {
        failures.push(`${label}: extra point ${pname}`);
        continue;
      }
      for (let i = 0; i < 3; i++) {
        if (!near(coords[i], refCoords[i], 1e-6)) {
          failures.push(`${label}: point ${pname}[${i}] ${coords[i]} != ${refCoords[i]}`);
        }
      }
    }
    for (const pname of Object.keys(ref.point_coords)) {
      if (!(pname in res.point_coords)) failures.push(`${label}: missing point ${pname}`);
    }
    // path
    const pathA = JSON.stringify(res.path);
    const pathB = JSON.stringify(ref.path);
    if (pathA !== pathB) failures.push(`${label}: path mismatch\n  got ${pathA}\n  exp ${pathB}`);
    // volumes
    if (!near(res.volume_original_wrt_conv, ref.volume_original_wrt_conv, 1e-4)) {
      failures.push(`${label}: volConv ${res.volume_original_wrt_conv} != ${ref.volume_original_wrt_conv}`);
    }
    if (!near(res.volume_original_wrt_prim, ref.volume_original_wrt_prim, 1e-4)) {
      failures.push(`${label}: volPrim ${res.volume_original_wrt_prim} != ${ref.volume_original_wrt_prim}`);
    }
    // lattice (rows) up to orientation/scale
    if (!nearMat(res.conv_lattice, ref.conv_lattice)) {
      failures.push(`${label}: conv_lattice\n  got ${JSON.stringify(res.conv_lattice)}\n  exp ${JSON.stringify(ref.conv_lattice)}`);
    }
    if (!nearMat(res.primitive_lattice, ref.primitive_lattice)) {
      failures.push(`${label}: prim_lattice\n  got ${JSON.stringify(res.primitive_lattice)}\n  exp ${JSON.stringify(ref.primitive_lattice)}`);
    }
    if (!nearMat(res.reciprocal_primitive_lattice, ref.reciprocal_primitive_lattice)) {
      failures.push(`${label}: recip_prim_lattice\n  got ${JSON.stringify(res.reciprocal_primitive_lattice)}\n  exp ${JSON.stringify(ref.reciprocal_primitive_lattice)}`);
    }
    if (res.conv_types.length !== ref.conv_types_len) {
      failures.push(`${label}: conv_types ${res.conv_types.length} != ${ref.conv_types_len}`);
    }
    if (res.primitive_types.length !== ref.primitive_types_len) {
      failures.push(`${label}: prim_types ${res.primitive_types.length} != ${ref.primitive_types_len}`);
    }
    // explicit
    if (JSON.stringify(res.explicit_segments) !== JSON.stringify(ref.explicit_segments)) {
      failures.push(`${label}: explicit_segments\n  got ${JSON.stringify(res.explicit_segments)}\n  exp ${JSON.stringify(ref.explicit_segments)}`);
    }
    if (res.explicit_kpoints_abs.length !== ref.explicit_kpoints_abs_len) {
      failures.push(`${label}: explicit_abs ${res.explicit_kpoints_abs.length} != ${ref.explicit_kpoints_abs_len}`);
    }
    if (res.explicit_kpoints_rel.length !== ref.explicit_kpoints_rel_len) {
      failures.push(`${label}: explicit_rel ${res.explicit_kpoints_rel.length} != ${ref.explicit_kpoints_rel_len}`);
    }
    if (res.explicit_kpoints_abs.length !== ref.explicit_kpoints_abs_len) {
      failures.push(`${label}: explicit_abs ${res.explicit_kpoints_abs.length} != ${ref.explicit_kpoints_abs_len}`);
    }
    // full explicit kpoint coordinate arrays
    if (!nearMatList(res.explicit_kpoints_rel, ref.explicit_kpoints_rel, 1e-5)) {
      failures.push(`${label}: explicit_kpoints_rel mismatch`);
    }
    if (!nearMatList(res.explicit_kpoints_abs, ref.explicit_kpoints_abs, 1e-5)) {
      failures.push(`${label}: explicit_kpoints_abs mismatch`);
    }
    // explicit kpoint labels
    if (
      JSON.stringify(res.explicit_kpoints_labels) !==
      JSON.stringify(ref.explicit_kpoints_labels)
    ) {
      failures.push(`${label}: explicit_kpoints_labels mismatch`);
    }
    // explicit linear coord (tolerate accumulated float error)
    if (
      res.explicit_kpoints_linearcoord.length !==
      ref.explicit_kpoints_linearcoord.length
    ) {
      failures.push(`${label}: explicit_linearcoord length mismatch`);
    } else {
      for (let i = 0; i < res.explicit_kpoints_linearcoord.length; i++) {
        const a = res.explicit_kpoints_linearcoord[i];
        const b = ref.explicit_kpoints_linearcoord[i];
        if (Math.abs(a - b) > 1e-5 * Math.max(1, Math.abs(b))) {
          failures.push(`${label}: linearcoord[${i}] ${a} != ${b}`);
          break;
        }
      }
    }
  }
  expect(failures).toEqual([]);
});
