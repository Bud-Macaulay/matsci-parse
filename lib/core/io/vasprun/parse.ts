import { parse as parseTxml } from "txml/txml";

import { createLattice } from "../../lattice/lattice";
import type { Structure } from "../../structure/structure";

/** A typed INCAR / parameter value from vasprun.xml. */
export type VasprunValue =
  number | string | boolean | number[] | string[] | boolean[];

export interface VasprunAtomType {
  element: string;
  /** Number of atoms of this type. */
  count: number;
  /** Atomic mass in amu. */
  mass: number;
  /** Valence electrons (ZVAL). */
  valence: number;
  /** Pseudopotential title, e.g. "PAW_PBE Li_sv 23Jan2001". */
  pseudopotential: string;
}

export interface VasprunIonicStep {
  structure: Structure;
  /** Energies in eV. */
  energy: {
    /** Free energy (TOTEN, `e_fr_energy`). */
    free: number;
    /** Energy without entropy (`e_wo_entrp`). */
    withoutEntropy: number;
    /** Energy extrapolated to zero smearing (`e_0_energy`). */
    sigma0: number;
  };
  /** Forces in eV/Å, one row per site; null if not written. */
  forces: number[][] | null;
  /**
   * Stress in eV/Å³ with the physical sign convention (positive = tensile,
   * as in ASE and this library's optimizers). VASP writes -stress in kBar.
   * Returned as written, not symmetrized (VASP's tensor can be very
   * slightly asymmetric; ASE keeps the upper triangle). Null if not written.
   */
  stress: number[][] | null;
  /** Number of electronic (SCF) steps. */
  electronicSteps: number;
  /** Energies of the last SCF step (eV), for VASP's e_0 bug; null if none. */
  lastElectronic: { free: number; sigma0: number } | null;
}

export interface VasprunKpoints {
  /** Generation scheme, e.g. "Monkhorst-Pack", "Gamma", "listgenerated". */
  scheme: string | null;
  /** Subdivisions for automatic meshes. */
  divisions: number[] | null;
  /** Fractional coordinates in the reciprocal basis, one row per k-point. */
  kpoints: number[][];
  weights: number[];
}

export interface VasprunEigenvalues {
  /** Band energies in eV, indexed [spin][kpoint][band]. */
  energies: number[][][];
  /** Occupations, indexed [spin][kpoint][band]. */
  occupations: number[][][];
}

export interface VasprunDos {
  /** Energy grid in eV. */
  energies: number[];
  /** Total DOS in states/eV, indexed [spin][point]. */
  total: number[][];
  /** Integrated DOS, indexed [spin][point]. */
  integrated: number[][];
  /** Site- and orbital-projected DOS; null unless requested and present. */
  projected: VasprunProjectedDos | null;
}

/**
 * Projected DOS. For spin-orbit (noncollinear) runs the "spin" blocks are
 * total, then magnetization x, y, z, as VASP writes them.
 */
export interface VasprunProjectedDos {
  /** Orbital labels as in the file, e.g. ["s", "py", "pz", "px", "dxy", ...]. */
  orbitals: string[];
  /** States/eV, indexed [site][spin][orbital], each over the energy grid. */
  densities: Float64Array[][][];
}

export interface Vasprun {
  /** Program, version, platform, date, ... as written. */
  generator: Record<string, string>;
  /** INCAR tags as given by the user. */
  incar: Record<string, VasprunValue>;
  /** All parameters VASP actually used (flattened). */
  parameters: Record<string, VasprunValue>;
  /** Element symbol of each site. */
  species: string[];
  atomTypes: VasprunAtomType[];
  initialStructure: Structure;
  finalStructure: Structure;
  ionicSteps: VasprunIonicStep[];
  /**
   * As pymatgen's Vasprun: electronic = the final ionic step took fewer
   * than NELM SCF steps; ionic = the run stopped before NSW ionic steps
   * (for MD, or relaxations with EDIFFG = 0: it completed NSW steps).
   */
  converged: { electronic: boolean; ionic: boolean };
  kpoints: VasprunKpoints;
  /** Fermi energy in eV, from the last DOS block (as written by VASP); null if absent. */
  efermi: number | null;
  /** From the last calculation that has them; null if absent or skipped. */
  eigenvalues: VasprunEigenvalues | null;
  /** Total DOS from the last calculation that has it; null if absent or skipped. */
  dos: VasprunDos | null;
}

export interface VasprunOptions {
  /** Parse eigenvalues and occupations. Default true. */
  eigenvalues?: boolean;
  /** Parse the total density of states. Default true. */
  dos?: boolean;
  /**
   * Also parse the site- and orbital-projected DOS (needs `dos`). Default
   * false: it grows with sites x orbitals x spins x energy points.
   */
  projectedDos?: boolean;
}

// 1 eV/Å³ = 160.21766208 GPa; VASP's stress is -σ in kBar (0.1 GPa).
const KBAR_TO_EV_PER_A3 = -0.1 / 160.21766208;

// ---------------------------------------------------------------- tree helpers

interface Node {
  tagName: string;
  attributes: Record<string, string | null>;
  children: Array<Node | string>;
}

const elements = (n: Node, tag?: string): Node[] =>
  n.children.filter(
    (c): c is Node => typeof c !== "string" && (!tag || c.tagName === tag),
  );

const first = (n: Node | undefined, tag: string, name?: string) =>
  n &&
  elements(n, tag).find(
    (c) => name === undefined || c.attributes.name === name,
  );

const textOf = (n: Node): string =>
  n.children
    .filter((c): c is string => typeof c === "string")
    .join("")
    .trim();

/** A Fortran number; "*******" overflow fields become NaN. */
function num(s: string): number {
  if (s.includes("*")) return NaN;
  const v = Number(s);
  if (!Number.isNaN(v)) return v;
  // Exponent without "E" (e.g. "1.234-105").
  return Number(s.replace(/(\d)([+-]\d+)$/, "$1E$2"));
}

const numbers = (s: string): number[] =>
  s.trim().split(/\s+/).filter(Boolean).map(num);

/** An <i> or <v> value, typed by its `type` attribute (default: real). */
function value(n: Node): VasprunValue {
  const type = n.attributes.type ?? "float";
  const raw = textOf(n);
  if (n.tagName === "v") {
    const parts = raw.split(/\s+/).filter(Boolean);
    if (type === "string") return parts;
    if (type === "logical") return parts.map((p) => /^\.?t/i.test(p));
    return parts.map(num);
  }
  if (type === "string") return raw;
  if (type === "logical") return /^\.?t/i.test(raw);
  return num(raw);
}

/** Rows of a <varray>. */
const varray = (n: Node): number[][] =>
  elements(n, "v").map((v) => numbers(textOf(v)));

/** Named <i>/<v> values below a node, recursing through <separator>s. */
function collect(n: Node, out: Record<string, VasprunValue> = {}) {
  for (const c of elements(n)) {
    // VASP 6.4.3 can pad names with spaces (name="GGA    ").
    const name = (c.attributes.name ?? "").trim();
    if (c.tagName === "separator") {
      const sub = collect(c, {});
      // "response functions" repeats root parameters (e.g. NELM) with
      // other values; those copies must not override the real ones.
      for (const [k, v] of Object.entries(sub)) {
        if (name !== "response functions" || !(k in out)) out[k] = v;
      }
    } else if ((c.tagName === "i" || c.tagName === "v") && name) {
      out[name] = value(c);
    }
  }
  return out;
}

/** Nested <set> blocks down to <r> rows: [outer][inner][row]. */
const sets = (n: Node): Node[] => elements(n, "set");
const rows = (n: Node): number[][] =>
  elements(n, "r").map((r) => numbers(textOf(r)));

// ---------------------------------------------------------------- sections

function structureOf(n: Node, species: string[]): Structure {
  const crystal = first(n, "crystal");
  const basis = first(crystal, "varray", "basis");
  const positions = first(n, "varray", "positions");
  if (!basis || !positions) {
    throw new Error("vasprun: structure without basis or positions");
  }
  const fracs = varray(positions);
  if (fracs.length !== species.length) {
    throw new Error(
      `vasprun: ${fracs.length} positions for ${species.length} atoms`,
    );
  }
  return {
    lattice: createLattice(varray(basis).flat()),
    sites: fracs.map((f, i) => ({
      species: { symbol: species[i]! },
      frac: new Float64Array(f),
    })),
  };
}

function atomInfo(n: Node | undefined) {
  const arrays = n ? elements(n, "array") : [];
  const table = (name: string) =>
    arrays
      .find((a) => a.attributes.name === name)
      ?.children.filter(
        (c): c is Node => typeof c !== "string" && c.tagName === "set",
      )
      .flatMap((s) => elements(s, "rc"))
      .map((rc) => elements(rc, "c").map(textOf)) ?? [];
  const species = table("atoms").map(([el]) => el!.trim());
  const atomTypes = table("atomtypes").map(
    ([count, element, mass, valence, pp]) => ({
      element: element!.trim(),
      count: num(count!),
      mass: num(mass!),
      valence: num(valence!),
      pseudopotential: (pp ?? "").trim(),
    }),
  );
  return { species, atomTypes };
}

function kpointsOf(n: Node | undefined): VasprunKpoints {
  const generation = first(n, "generation");
  const divisions = first(generation, "v", "divisions");
  const list = first(n, "varray", "kpointlist");
  const weights = first(n, "varray", "weights");
  return {
    scheme: generation?.attributes.param ?? null,
    divisions: divisions ? numbers(textOf(divisions)) : null,
    kpoints: list ? varray(list) : [],
    weights: weights ? varray(weights).map((w) => w[0]!) : [],
  };
}

function eigenvaluesOf(n: Node): VasprunEigenvalues {
  const array = first(n, "array");
  const spins = sets(first(array, "set")!);
  const perSpin = spins.map((spin) => sets(spin).map(rows));
  return {
    energies: perSpin.map((s) => s.map((k) => k.map((r) => r[0]!))),
    occupations: perSpin.map((s) => s.map((k) => k.map((r) => r[1]!))),
  };
}

function dosOf(total: Node, partial: Node | undefined): VasprunDos {
  const spins = sets(first(first(total, "array"), "set")!).map(rows);
  return {
    energies: (spins[0] ?? []).map((r) => r[0]!),
    total: spins.map((s) => s.map((r) => r[1]!)),
    integrated: spins.map((s) => s.map((r) => r[2]!)),
    projected: partial ? projectedDosOf(partial) : null,
  };
}

/** <partial>: sets per site, then per spin, of rows [energy, orbital...]. */
function projectedDosOf(partial: Node): VasprunProjectedDos {
  const array = first(partial, "array")!;
  const orbitals = elements(array, "field").map(textOf).slice(1);
  const densities = sets(first(array, "set")!).map((site) =>
    sets(site).map((spin) => {
      const r = rows(spin);
      return orbitals.map((_, j) => Float64Array.from(r, (row) => row[j + 1]!));
    }),
  );
  return { orbitals, densities };
}

function ionicStep(calc: Node, species: string[]): VasprunIonicStep {
  const structure = first(calc, "structure");
  if (!structure) throw new Error("vasprun: calculation without structure");
  const energy = collect(
    first(calc, "energy") ?? { tagName: "", attributes: {}, children: [] },
  );
  const forces = first(calc, "varray", "forces");
  const stress = first(calc, "varray", "stress");
  return {
    structure: structureOf(structure, species),
    energy: {
      free: Number(energy.e_fr_energy ?? NaN),
      withoutEntropy: Number(energy.e_wo_entrp ?? NaN),
      sigma0: Number(energy.e_0_energy ?? NaN),
    },
    forces: forces ? varray(forces) : null,
    stress: stress
      ? varray(stress).map((r) => r.map((v) => v * KBAR_TO_EV_PER_A3 + 0))
      : null,
    electronicSteps: elements(calc, "scstep").length,
    lastElectronic: lastScEnergy(calc),
  };
}

function lastScEnergy(calc: Node): VasprunIonicStep["lastElectronic"] {
  const last = elements(calc, "scstep").at(-1);
  const e = last && first(last, "energy");
  if (!e) return null;
  const v = collect(e);
  return {
    free: Number(v.e_fr_energy ?? NaN),
    sigma0: Number(v.e_0_energy ?? NaN),
  };
}

/** SCF steps whose energy block holds only the three total energies
 * (linear-response steps in LEPSILON runs), counted from the second step. */
function bareSteps(calc: Node | undefined): number {
  const basic = ["e_0_energy", "e_fr_energy", "e_wo_entrp"].join();
  const steps = calc ? elements(calc, "scstep") : [];
  let i = 1;
  while (
    i < steps.length &&
    elements(first(steps[i], "energy") ?? steps[i]!, "i")
      .map((e) => (e.attributes.name ?? "").trim())
      .sort()
      .join() === basic
  ) {
    i++;
  }
  return i;
}

// ---------------------------------------------------------------- entry point

/**
 * Parse a VASP vasprun.xml: run settings, structures, every ionic step
 * (energies, forces, stress), convergence, k-points, and the electronic
 * structure (eigenvalues, Fermi energy, total DOS) of the last calculation
 * that has them.
 *
 * Units: eV, Å, eV/Å (forces), eV/Å³ (stress, physical sign convention).
 * Projected DOS, projected eigenvalues and dielectric/DFPT data are not read.
 *
 * @param text - Contents of vasprun.xml.
 * @param opts - Skip eigenvalues and/or DOS to save memory on large files.
 * @returns The parsed run.
 */
export function parseVasprun(text: string, opts: VasprunOptions = {}): Vasprun {
  const {
    eigenvalues: wantEigen = true,
    dos: wantDos = true,
    projectedDos: wantProjected = false,
  } = opts;
  const root = (parseTxml(text) as Array<Node | string>).find(
    (n): n is Node => typeof n !== "string" && n.tagName === "modeling",
  );
  if (!root) throw new Error("vasprun: no <modeling> root element");

  const generator = Object.fromEntries(
    Object.entries(collect(first(root, "generator") ?? root)).map(([k, v]) => [
      k,
      String(v).trim(),
    ]),
  );
  const incarNode = first(root, "incar");
  const incar = incarNode ? collect(incarNode) : {};
  const paramNode = first(root, "parameters");
  const parameters = paramNode ? collect(paramNode) : {};
  const { species, atomTypes } = atomInfo(first(root, "atominfo"));

  const initial = first(root, "structure", "initialpos");
  const final = first(root, "structure", "finalpos");
  const calcs = elements(root, "calculation");
  const ionicSteps = calcs.map((c) => ionicStep(c, species));

  const initialStructure = initial
    ? structureOf(initial, species)
    : ionicSteps[0]?.structure;
  const finalStructure = final
    ? structureOf(final, species)
    : ionicSteps.at(-1)?.structure;
  if (!initialStructure || !finalStructure) {
    throw new Error("vasprun: no structures found");
  }

  // Electronic structure from the last calculation that has it.
  // Electronic structure from the last block in document order (a
  // calculation can hold several), skipping the separate KPOINTS_OPT set.
  const lastBlock = (tag: string) => {
    for (const c of [...calcs].reverse()) {
      const found = elements(c, tag).filter(
        (e) => e.attributes.comment !== "kpoints_opt",
      );
      if (found.length) return found.at(-1);
    }
    return undefined;
  };
  const eigNode = lastBlock("eigenvalues");
  const dosNode = lastBlock("dos");
  const efermiNode = first(dosNode, "i", "efermi");
  const totalNode = first(dosNode, "total");

  // Convergence, following pymatgen's Vasprun.converged_electronic/_ionic.
  const param = (k: string) => parameters[k] ?? incar[k];
  const nelm = Number(param("NELM") ?? 60);
  const nsw = Number(param("NSW") ?? 0);
  const ibrion = Number(param("IBRION") ?? (nsw === -1 || nsw === 0 ? -1 : 0));
  const ediffg = Number(param("EDIFFG") ?? 1);
  const algo = String(incar.ALGO ?? "")
    .trim()
    .toLowerCase();
  const lastSteps = ionicSteps.at(-1)?.electronicSteps ?? 0;
  const electronic =
    algo === "chi" || algo === "bse"
      ? true // response-function runs have no SCF to judge
      : incar.LEPSILON === true
        ? bareSteps(calcs.at(-1)) + 1 !== nelm
        : algo === "exact" && Number(incar.NELM) === 1
          ? true
          : lastSteps < nelm;
  const nIonic = ionicSteps.length;
  const ionic =
    nsw <= 1 ||
    (ibrion === 0
      ? nIonic === nsw // MD runs its NSW steps
      : (ibrion === 1 || ibrion === 2) && ediffg === 0
        ? nIonic === nsw // EDIFFG = 0 deliberately runs NSW steps
        : nIonic < nsw);

  return {
    generator,
    incar,
    parameters,
    species,
    atomTypes,
    initialStructure,
    finalStructure,
    ionicSteps,
    converged: { electronic, ionic },
    kpoints: kpointsOf(first(root, "kpoints")),
    efermi: efermiNode ? num(textOf(efermiNode)) : null,
    eigenvalues: wantEigen && eigNode ? eigenvaluesOf(eigNode) : null,
    dos:
      wantDos && totalNode
        ? dosOf(
            totalNode,
            wantProjected ? first(dosNode, "partial") : undefined,
          )
        : null,
  };
}
