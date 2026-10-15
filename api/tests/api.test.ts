import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { createApp } from "../src/app";
import { endpoints } from "../src/generated";

const app = createApp();

async function post(path: string, body: unknown) {
  const res = await app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as any };
}

const NACL_POSCAR = `NaCl
1.0
5.64 0 0
0 5.64 0
0 0 5.64
Na Cl
4 4
Direct
0 0 0
0.5 0.5 0
0.5 0 0.5
0 0.5 0.5
0.5 0.5 0.5
0 0 0.5
0 0.5 0
0.5 0 0
`;

const DISORDERED_CIF = `data_test
_cell_length_a 4.0
_cell_length_b 4.0
_cell_length_c 4.0
_cell_angle_alpha 90
_cell_angle_beta 90
_cell_angle_gamma 90
loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
_atom_site_occupancy
M1 Ag 0 0 0 0.5
M2 Pd 0 0 0 0.5
`;

async function nacl() {
  return (await post("/io/fromPOSCAR", { text: NACL_POSCAR })).json;
}

async function alloy() {
  return (await post("/io/fromCIF", { text: DISORDERED_CIF })).json;
}

describe("generation", () => {
  it("src/generated.ts is up to date with the library", () => {
    // Throws (non-zero exit) when an @api function changed without regenerating.
    execFileSync("npx", ["tsx", "scripts/generate.ts", "--check"], {
      cwd: new URL("..", import.meta.url).pathname,
      stdio: "pipe",
    });
  }, 60_000);

  it("serves one documented OpenAPI operation per @api function", async () => {
    const spec = (await (await app.request("/openapi.json")).json()) as any;
    expect(spec.openapi).toBe("3.1.0");
    expect(Object.keys(spec.paths).sort()).toEqual(
      endpoints.map((e) => `/${e.tag}/${e.name}`).sort(),
    );
    const xrd = spec.paths["/structure/calculateXrdPattern"].post;
    expect(xrd.operationId).toBe("calculateXrdPattern");
    expect(xrd.summary).toMatch(/X-ray powder diffraction/);
    expect(spec.components.schemas).toHaveProperty("Structure");
    expect(spec.components.schemas).toHaveProperty("XrdOptions");
  });

  it("health", async () => {
    const res = await app.request("/health");
    expect(await res.json()).toMatchObject({ status: "ok" });
  });
});

describe("io", () => {
  it("parses to plain JSON arrays", async () => {
    const s = await nacl();
    expect(s.lattice).toEqual([
      [5.64, 0, 0],
      [0, 5.64, 0],
      [0, 0, 5.64],
    ]);
    expect(s.sites).toHaveLength(8);
    expect(s.sites[4]).toEqual({ species: "Cl", frac: [0.5, 0.5, 0.5] });
  });

  it("returns disordered CIFs as DisorderedStructure", async () => {
    expect(await alloy()).toEqual({
      disordered: true,
      lattice: [
        [4, 0, 0],
        [0, 4, 0],
        [0, 0, 4],
      ],
      sites: [
        {
          occupancy: [
            { symbol: "Ag", fraction: 0.5 },
            { symbol: "Pd", fraction: 0.5 },
          ],
          frac: [0, 0, 0],
        },
      ],
    });
  });

  it("writes and re-parses, passing optional parameters through", async () => {
    const { json: cif } = await post("/io/toCIF", {
      structure: await nacl(),
      precision: 3,
    });
    expect(cif).toMatch(/_cell_length_a 5\.640\b/);
    const { json: back } = await post("/io/fromCIF", { text: cif });
    expect(back.sites).toHaveLength(8);
  });

  it("round-trips disorder through pymatgen JSON", async () => {
    const { json: pmg } = await post("/io/toPymatgen", { structure: await alloy() });
    expect(pmg.sites[0].species).toEqual([
      { element: "Ag", occu: 0.5 },
      { element: "Pd", occu: 0.5 },
    ]);
    const { json: back } = await post("/io/fromPymatgen", { data: pmg });
    expect(back.disordered).toBe(true);
  });
});

describe("structure", () => {
  it("getSymmetry: rocksalt is Fm-3m (225)", async () => {
    const { json } = await post("/structure/getSymmetry", { structure: await nacl() });
    expect(json.calculationResults.number).toBe(225);
    expect(json.calculationResults.hm_symbol.replace(/\s/g, "")).toBe("Fm-3m");
    expect(json.primitive.sites).toHaveLength(2);
    expect(json.conventional.sites).toHaveLength(8);
  });

  it("supercell accepts a factor, a vector, or a matrix (union decoding)", async () => {
    const s = await nacl();
    const sizes = [
      2,
      [2, 2, 2],
      [
        [2, 0, 0],
        [0, 2, 0],
        [0, 0, 2],
      ],
    ];
    for (const size of sizes) {
      const { status, json } = await post("/structure/supercell", { structure: s, size });
      expect(status).toBe(200);
      expect(json.sites).toHaveLength(64);
    }
  });

  it("slab terminations, then a slab with options", async () => {
    const s = await nacl();
    const { json: shifts } = await post("/structure/possibleTerminations", {
      structure: s,
      millerIndex: [1, 0, 0],
    });
    expect(shifts.length).toBeGreaterThan(0);
    const { status, json } = await post("/structure/slabFromMillerIndex", {
      structure: s,
      h: 1,
      k: 0,
      l: 0,
      opts: { layers: 2, vacuum: 10, shift: shifts[0] },
    });
    expect(status).toBe(200);
    expect(json.lattice[2][2]).toBeGreaterThan(10);
  });

  it("xrd and neutron patterns, including disordered input", async () => {
    const s = await nacl();
    const { json: xrd } = await post("/structure/calculateXrdPattern", { structure: s });
    expect(xrd.twoTheta.slice(0, 3).map((t: number) => +t.toFixed(1))).toEqual([27.4, 31.7, 45.5]);
    const { json: nd } = await post("/structure/calculateNdPattern", {
      structure: s,
      options: { twoThetaRange: [10, 80] },
    });
    expect(nd.twoTheta.every((t: number) => t >= 10 && t <= 80)).toBe(true);
    const { status } = await post("/structure/calculateXrdPattern", {
      structure: await alloy(),
    });
    expect(status).toBe(200);
  });

  it("ewaldSum reproduces the rocksalt Madelung energy", async () => {
    const { json } = await post("/structure/ewaldSum", {
      structure: await nacl(),
      charges: [1, 1, 1, 1, -1, -1, -1, -1],
    });
    // 4 NaCl pairs, Madelung constant 1.7476, r0 = a / 2.
    expect(json.total / 4).toBeCloseTo((-1.7475645946331822 * 14.399645468667815) / 2.82, 6);
  });

  it("seekpath: getPath for rocksalt (FCC)", async () => {
    const { status, json } = await post("/structure/getPath", { structure: await nacl() });
    expect(status).toBe(200);
    expect(json.bravais_lattice).toBe("cF");
    expect(json.bravais_lattice_extended).toBe("cF2");
    expect(json.spacegroup_number).toBe(225);
    expect(json.path[0][0]).toBe("GAMMA");
    expect(json.point_coords.GAMMA).toEqual([0, 0, 0]);
  });

  it("seekpath: getExplicitKPath, with intersection-typed options", async () => {
    const coarse = await post("/structure/getExplicitKPath", {
      structure: await nacl(),
      opts: { referenceDistance: 0.1 },
    });
    const fine = await post("/structure/getExplicitKPath", {
      structure: await nacl(),
      opts: { referenceDistance: 0.025 },
    });
    expect(coarse.status).toBe(200);
    expect(coarse.json.explicit_kpoints_labels).toContain("GAMMA");
    expect(coarse.json.explicit_kpoints_rel.length).toBe(
      coarse.json.explicit_kpoints_labels.length,
    );
    // The option reaches the library: a finer spacing gives more k-points.
    expect(fine.json.explicit_kpoints_rel.length).toBeGreaterThan(
      coarse.json.explicit_kpoints_rel.length,
    );
  });

  it("orderDisorderedStructure enumerates orderings", async () => {
    const { json } = await post("/structure/orderDisorderedStructure", {
      parent: await alloy(),
      H: [
        [2, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
    });
    expect(json).toHaveLength(1);
    expect(json[0].sites.map((s: any) => s.species).sort()).toEqual(["Ag", "Pd"]);
  });
});

describe("errors", () => {
  it("400 naming the offending field for schema violations", async () => {
    const { status, json } = await post("/structure/supercell", {
      structure: { lattice: [[1, 0, 0]], sites: [] },
      size: 2,
    });
    expect(status).toBe(400);
    expect(json.error).toMatch(/structure\.lattice/);
  });

  it("400 for a missing required parameter", async () => {
    const { status, json } = await post("/io/fromCIF", {});
    expect(status).toBe(400);
    expect(json.error).toMatch(/text/);
  });

  it("422 when the library rejects the input", async () => {
    const { status, json } = await post("/structure/ewaldSum", {
      structure: await nacl(),
      charges: [1],
    });
    expect(status).toBe(422);
    expect(json.error).toMatch(/charges/);
  });
});
