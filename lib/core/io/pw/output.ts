import { createLattice } from "../../lattice/lattice";
import { fractional } from "../../site";
import type { Site } from "../../site/site";
import type { Structure } from "../../structure/structure";
import type { KPointSet, Vec3 } from "../../kpoints/kpoints";
import { createMatrix } from "../../matrix/matrix";
import { inverse3x3 } from "../../matrix/operations/inverse/inverse3x3";
import { vecMul } from "../../matrix/operations/vector/vecMul";
import { EnergyUnitSystem } from "../../units/energy";
import { LengthUnitSystem } from "../../units/length";
import { parseXml, textOf, toArray, attr, type XmlNode } from "../parseUtils/xml-helpers";
import { elementFromLabel } from "./labels";

/*
 * Reader for pw.x XML output (data-file-schema.xml / <prefix>.xml, the
 * qes-1.0 schema). The file is in Hartree atomic units; everything returned
 * is converted to eV, Å, eV/Å and eV/Å³.
 */

const HA_TO_EV = EnergyUnitSystem.convert(1, "Hartree", "eV");
const BOHR_TO_ANG = LengthUnitSystem.convert(1, "bohr", "angstrom");
const HA_PER_BOHR_TO_EV_PER_ANG = HA_TO_EV / BOHR_TO_ANG;
const HA_PER_BOHR3_TO_EV_PER_ANG3 = HA_TO_EV / BOHR_TO_ANG ** 3;

/** One ionic step (`<step>`) as written by pw.x. */
export interface PWStep {
  structure: Structure;
  /** Total energy (etot) in eV; null if not written. */
  energy: number | null;
  /** Forces in eV/Å, [site][xyz]; null if not written. */
  forces: number[][] | null;
  /** Stress in eV/Å³, as written by pw.x (QE sign convention); null if not written. */
  stress: number[][] | null;
  /** Whether this step's SCF converged; null if not written. */
  scfConverged: boolean | null;
}

/** A pw.x run read from its XML output. Units: eV, Å, eV/Å, eV/Å³. */
export interface PWOutput {
  /** pw.x version that wrote the file, e.g. "7.2"; null if not written. */
  version: string | null;
  /** The `calculation` input setting (scf, relax, ...); null if not written. */
  calculation: string | null;
  /** Structure as given in the input. */
  initialStructure: Structure;
  /** Structure at the end of the run (`<output>`). */
  finalStructure: Structure;
  /**
   * Ionic steps exactly as written (`<step>` elements; empty for single-point
   * runs). The final output is not necessarily the last step: e.g. vc-relax
   * ends with an extra SCF at the final geometry.
   */
  steps: PWStep[];
  /** Final total energy (etot) in eV; null if not written. */
  energy: number | null;
  /** Final forces in eV/Å, [site][xyz]; null if not written. */
  forces: number[][] | null;
  /** Final stress in eV/Å³, as written by pw.x (QE sign convention); null if not written. */
  stress: number[][] | null;
  /**
   * electronic: final SCF converged; ionic: geometry optimization converged.
   * null where pw.x wrote nothing (e.g. ionic for an scf run).
   */
  converged: { electronic: boolean | null; ionic: boolean | null };
  /** pw.x exit status (0 = success); null if not written. */
  exitStatus: number | null;
  /**
   * Fermi energy in eV: one value, or [up, down] when the run fixed the
   * total magnetization (two Fermi energies); null for fixed occupations.
   */
  efermi: number | [number, number] | null;
  /** Highest occupied / lowest unoccupied level in eV, where written. */
  highestOccupied: number | null;
  lowestUnoccupied: number | null;
  /** The k-points of the band structure, fractional reciprocal coordinates, with weights. */
  kpoints: KPointSet;
  /**
   * Band energies and occupations, [spin][kpoint][band] in eV. Two spin
   * channels for collinear spin-polarized runs, one otherwise (including
   * noncollinear). null if the file has no band structure.
   */
  bands: { energies: number[][][]; occupations: number[][][] } | null;
  /** Total and absolute magnetization (μB per cell); null if not written. */
  magnetization: { total: number | null; absolute: number | null } | null;
}

// ──────────────────────────────────────────────────────────────────────
//  helpers
// ──────────────────────────────────────────────────────────────────────

function child(node: XmlNode | undefined, name: string): XmlNode | undefined {
  const v = node?.[name];
  return Array.isArray(v) ? v[0] : v;
}

function numbers(node: XmlNode | string | undefined): number[] {
  const text = textOf(node).trim();
  return text ? text.split(/\s+/).map(Number) : [];
}

function num(node: XmlNode | string | undefined): number | null {
  const text = textOf(node).trim();
  return text ? Number(text) : null;
}

function bool(node: XmlNode | string | undefined): boolean | null {
  const text = textOf(node).trim().toLowerCase();
  return text === "true" ? true : text === "false" ? false : null;
}

/** A rank-2 Fortran (column-major) array `dims="rows cols"` as [col][row], scaled. */
function columns(node: XmlNode | undefined, scale: number): number[][] | null {
  if (!node) return null;
  const [rows, cols] = attr(node, "dims").trim().split(/\s+/).map(Number);
  const v = numbers(node);
  if (!rows || !cols || v.length !== rows * cols) return null;
  return Array.from({ length: cols }, (_, c) =>
    Array.from({ length: rows }, (_, r) => v[r + rows * c] * scale),
  );
}

/** Parse an <atomic_structure> (Bohr, Cartesian or crystal positions). */
function readStructure(node: XmlNode): Structure {
  const cell = child(node, "cell");
  const a = ["a1", "a2", "a3"].flatMap((k) => numbers(child(cell, k)));
  if (a.length !== 9) throw new Error("pw.x XML: atomic_structure has no complete cell");
  const lattice = createLattice(a.map((x) => x * BOHR_TO_ANG));

  const cart = child(node, "atomic_positions");
  const crystal = child(node, "crystal_positions");
  const atoms = toArray<XmlNode>((cart ?? crystal)?.atom);
  if (!cart && !crystal) {
    throw new Error("pw.x XML: atomic_structure has no atomic_positions or crystal_positions");
  }

  const sites: Site[] = atoms.map((atom) => {
    const label = attr(atom, "name");
    const symbol = elementFromLabel(label);
    const p = numbers(atom);
    const frac = cart
      ? fractional(lattice, new Float64Array(p.map((x) => x * BOHR_TO_ANG)))
      : new Float64Array(p);
    const site: Site = { species: { symbol }, frac };
    if (label !== symbol) site.properties = { kind: label };
    return site;
  });

  return { lattice, sites };
}

function readStep(step: XmlNode): PWStep {
  const structure = child(step, "atomic_structure");
  if (!structure) throw new Error("pw.x XML: <step> without atomic_structure");
  return {
    structure: readStructure(structure),
    energy: energyOf(step),
    forces: columns(child(step, "forces"), HA_PER_BOHR_TO_EV_PER_ANG),
    stress: columns(child(step, "stress"), HA_PER_BOHR3_TO_EV_PER_ANG3),
    scfConverged: bool(child(child(step, "scf_conv"), "convergence_achieved")),
  };
}

function energyOf(node: XmlNode | undefined): number | null {
  const etot = num(child(child(node, "total_energy"), "etot"));
  return etot === null ? null : etot * HA_TO_EV;
}

function readBands(
  bs: XmlNode | undefined,
  reciprocal: number[] | null,
): Pick<PWOutput, "kpoints" | "bands"> {
  const empty: KPointSet = { kind: "points", points: [], weights: [] };
  if (!bs) return { kpoints: empty, bands: null };

  const lsda = bool(child(bs, "lsda")) === true;
  const ks = toArray<XmlNode>(bs.ks_energies);
  const nUp = lsda ? Number(textOf(child(bs, "nbnd_up"))) : 0;

  // k-points: Cartesian in 2π/alat units → fractional reciprocal via B⁻¹.
  const bInv = reciprocal ? inverse3x3(createMatrix(3, 3, reciprocal)) : null;
  const points = ks.map((k) => {
    const cart = numbers(child(k, "k_point"));
    const f = bInv ? vecMul(cart, bInv) : cart;
    return { coordinate: [f[0], f[1], f[2]] as Vec3 };
  });
  const weights = ks.map((k) => Number(attr(child(k, "k_point"), "weight")));

  const channels = lsda ? 2 : 1;
  const energies: number[][][] = Array.from({ length: channels }, () => []);
  const occupations: number[][][] = Array.from({ length: channels }, () => []);
  for (const k of ks) {
    const e = numbers(child(k, "eigenvalues")).map((x) => x * HA_TO_EV);
    const o = numbers(child(k, "occupations"));
    if (lsda) {
      energies[0].push(e.slice(0, nUp));
      energies[1].push(e.slice(nUp));
      occupations[0].push(o.slice(0, nUp));
      occupations[1].push(o.slice(nUp));
    } else {
      energies[0].push(e);
      occupations[0].push(o);
    }
  }

  return {
    kpoints: { kind: "points", points, weights, coordinateSystem: "reciprocal" },
    bands: ks.length > 0 ? { energies, occupations } : null,
  };
}

// ──────────────────────────────────────────────────────────────────────
//  fromPWXML
// ──────────────────────────────────────────────────────────────────────

/**
 * Read a pw.x XML output file (data-file-schema.xml or <prefix>.xml):
 * initial and final structures, the ionic steps, final energy, forces and
 * stress, convergence, exit status, Fermi energy, k-points, band energies
 * and occupations, and magnetization.
 *
 * Throws if the file has no `<output>` section (e.g. an interrupted run that
 * only wrote its input).
 */
export function fromPWXML(text: string): PWOutput {
  const doc = parseXml(text);
  const root = doc["qes:espresso"] ?? doc["espresso"];
  if (!root) throw new Error("pw.x XML: not a qes:espresso document");
  const output = child(root, "output");
  if (!output) throw new Error("pw.x XML: no <output> section (the run did not finish writing results)");

  const finalNode = child(output, "atomic_structure");
  if (!finalNode) throw new Error("pw.x XML: <output> has no atomic_structure");
  const finalStructure = readStructure(finalNode);
  const inputNode = child(child(root, "input"), "atomic_structure");
  const initialStructure = inputNode ? readStructure(inputNode) : finalStructure;

  const conv = child(output, "convergence_info");
  const bs = child(output, "band_structure");
  const recip = child(child(output, "basis_set"), "reciprocal_lattice");
  const reciprocal = recip ? ["b1", "b2", "b3"].flatMap((k) => numbers(child(recip, k))) : null;

  const twoFermi = numbers(child(bs, "two_fermi_energies"));
  const fermi = num(child(bs, "fermi_energy"));
  const efermi: PWOutput["efermi"] =
    twoFermi.length === 2
      ? [twoFermi[0] * HA_TO_EV, twoFermi[1] * HA_TO_EV]
      : fermi === null
        ? null
        : fermi * HA_TO_EV;
  const homo = num(child(bs, "highestOccupiedLevel"));
  const lumo = num(child(bs, "lowestUnoccupiedLevel"));

  const mag = child(output, "magnetization");
  const magnetization = mag
    ? { total: num(child(mag, "total")), absolute: num(child(mag, "absolute")) }
    : null;

  const exit = num(child(root, "exit_status"));

  return {
    version: attr(child(child(root, "general_info"), "creator"), "VERSION") || null,
    calculation:
      textOf(child(child(child(root, "input"), "control_variables"), "calculation")).trim() || null,
    initialStructure,
    finalStructure,
    steps: toArray<XmlNode>(root.step).map(readStep),
    energy: energyOf(output),
    forces: columns(child(output, "forces"), HA_PER_BOHR_TO_EV_PER_ANG),
    stress: columns(child(output, "stress"), HA_PER_BOHR3_TO_EV_PER_ANG3),
    converged: {
      electronic: bool(child(child(conv, "scf_conv"), "convergence_achieved")),
      ionic: bool(child(child(conv, "opt_conv"), "convergence_achieved")),
    },
    exitStatus: exit,
    efermi,
    highestOccupied: homo === null ? null : homo * HA_TO_EV,
    lowestUnoccupied: lumo === null ? null : lumo * HA_TO_EV,
    ...readBands(bs, reciprocal),
    magnetization,
  };
}
