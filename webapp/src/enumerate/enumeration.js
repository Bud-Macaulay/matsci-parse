import JSZip from "jszip";
import {
  createDisorderedSite,
  elementBySymbol,
  enumerateDerivativeStructures,
  ewaldEnergies,
  getSymmetry,
  reducedFormula,
  toCIF,
  toDisordered,
  toPOSCAR,
  toXSF,
} from "matsci-parse";

export const EXPORT_FORMATS = {
  cif: { label: "CIF", ext: "cif", serialize: toCIF },
  poscar: { label: "POSCAR", ext: "vasp", serialize: toPOSCAR },
  xsf: { label: "XSF", ext: "xsf", serialize: toXSF },
};

/** "1/3" or "0.25" -> number (NaN if neither). */
function parseFraction(text) {
  const m = text.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (m) return Number(m[1]) / Number(m[2]);
  return text.trim() === "" ? NaN : Number(text);
}

/**
 * Parse an occupancy like "Na:0.5 K:0.5" or "Ag:1/3, Pd:1/3, Pt:1/3".
 * Fractions must sum to 1 (vacancies are not supported by the enumerator).
 *
 * @returns {{ occupancy: {symbol: string, fraction: number}[] } | { error: string }}
 */
export function parseOccupancy(text) {
  const tokens = text
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return { error: "empty" };
  const occupancy = [];
  for (const tok of tokens) {
    const [symbol, frac, ...rest] = tok.split(":");
    if (!symbol || frac === undefined || rest.length) {
      return { error: `"${tok}": use Symbol:fraction` };
    }
    if (!elementBySymbol[symbol]) return { error: `unknown element ${symbol}` };
    const fraction = parseFraction(frac);
    if (!(fraction > 0 && fraction <= 1)) {
      return { error: `bad fraction for ${symbol}` };
    }
    if (occupancy.some((o) => o.symbol === symbol)) {
      return { error: `${symbol} listed twice` };
    }
    occupancy.push({ symbol, fraction });
  }
  const total = occupancy.reduce((a, o) => a + o.fraction, 0);
  if (Math.abs(total - 1) > 1e-6) {
    return { error: `fractions sum to ${+total.toFixed(4)}, need 1` };
  }
  return { occupancy };
}

/** Occupancy as editable text ("Na:0.5 K:0.5"). */
export function formatOccupancy(occupancy) {
  return occupancy
    .map((o) => `${o.symbol}:${+o.fraction.toFixed(6)}`)
    .join(" ");
}

/**
 * Disordered parent from an ordered structure plus per-site overrides
 * (`overrides[i]` is an occupancy list, or null to keep site i as is).
 */
export function buildDisorderedParent(structure, overrides) {
  const base = toDisordered(structure);
  return {
    ...base,
    sites: base.sites.map((site, i) =>
      overrides[i]
        ? createDisorderedSite(site.frac, overrides[i], site.properties)
        : site,
    ),
  };
}

const signature = (site) =>
  site.occupancy
    .map((o) => `${o.symbol}:${o.fraction.toFixed(6)}`)
    .sort()
    .join("|");

/**
 * Primitive cell of a disordered structure: sites are labelled by their
 * occupancy pattern, so the reduction keeps the disorder (an ordered
 * primitive cell could be smaller than the disordered one allows).
 */
export async function primitiveOfDisordered(parent, symprec = 1e-4) {
  const ids = new Map();
  const byLabel = new Map();
  const colored = {
    lattice: parent.lattice,
    sites: parent.sites.map((site) => {
      const sig = signature(site);
      if (!ids.has(sig)) {
        const label = `__occ${ids.size}`;
        ids.set(sig, label);
        byLabel.set(label, site.occupancy);
      }
      return { species: { symbol: ids.get(sig) }, frac: site.frac };
    }),
  };
  const { primitive } = await getSymmetry(colored, symprec);
  if (primitive.sites.length >= parent.sites.length) return parent;
  return {
    disordered: true,
    lattice: primitive.lattice,
    sites: primitive.sites.map((s) =>
      createDisorderedSite(s.frac, byLabel.get(s.species.symbol)),
    ),
  };
}

/** Species present in a disordered structure, in first-seen order. */
export function speciesOf(parent) {
  const out = [];
  for (const site of parent.sites) {
    for (const o of site.occupancy) {
      if (!out.includes(o.symbol)) out.push(o.symbol);
    }
  }
  return out;
}

/** Net charge per parent cell for a charge-per-symbol map. */
export function netCharge(parent, charges) {
  let q = 0;
  for (const site of parent.sites) {
    for (const o of site.occupancy) q += o.fraction * (charges[o.symbol] ?? 0);
  }
  return q;
}

const tick = () => new Promise((r) => setTimeout(r, 0));

/**
 * All symmetrically distinct orderings in supercells of 1..maxSize parent
 * cells. Yields to the event loop first so a "running" state can paint
 * (the enumeration itself is synchronous apart from the symmetry call).
 */
export async function enumerateOrderings(parent, { maxSize, maxCombinations }) {
  await tick();
  const structures = await enumerateDerivativeStructures(parent, {
    minSize: 1,
    maxSize,
    maxCombinations,
  });
  const nParent = parent.sites.length;
  return structures.map((structure, i) => ({
    id: i,
    structure,
    size: Math.round(structure.sites.length / nParent),
    nAtoms: structure.sites.length,
    formula: reducedFormula(structure),
    energy: null,
    perAtom: null,
  }));
}

/**
 * Ewald energy of every row (eV, and eV/atom). Orderings of one supercell
 * share their geometry, so `ewaldEnergies` builds one charge-independent
 * kernel per supercell and scores each ordering as q^T K q. Runs one
 * supercell size at a time, yielding in between so the page stays
 * responsive; `onProgress(done, total)` reports along the way.
 */
export async function rankByEwald(rows, charges, onProgress) {
  const bySize = new Map();
  rows.forEach((row, i) => {
    if (!bySize.has(row.size)) bySize.set(row.size, []);
    bySize.get(row.size).push(i);
  });
  const out = new Array(rows.length);
  let done = 0;
  for (const idx of bySize.values()) {
    const energies = ewaldEnergies(
      idx.map((i) => rows[i].structure),
      idx.map((i) =>
        rows[i].structure.sites.map((s) => charges[s.species.symbol] ?? 0),
      ),
    );
    idx.forEach((i, k) => {
      const row = rows[i];
      out[i] = {
        ...row,
        energy: energies[k],
        perAtom: energies[k] / row.nAtoms,
      };
    });
    done += idx.length;
    onProgress?.(done, rows.length);
    await tick();
  }
  return out;
}

/** Rows sorted by energy per atom (lowest first), with rank and dE. */
export function sortByEnergy(rows) {
  const sorted = [...rows].sort((a, b) => a.perAtom - b.perAtom);
  const min = sorted[0]?.perAtom ?? 0;
  return sorted.map((r, i) => ({
    ...r,
    rank: i + 1,
    dE: (r.perAtom - min) * 1000, // meV/atom
  }));
}

const safe = (s) => s.replace(/[^a-zA-Z0-9._-]/g, "_");

export function rowFileName(row, ext) {
  const rank = String(row.rank ?? row.id + 1).padStart(4, "0");
  return `${rank}_${safe(row.formula)}_x${row.size}.${ext}`;
}

/**
 * Zip of the given rows (in order) in one format, plus energies.csv.
 * @returns {Promise<Blob>}
 */
export async function exportZip(rows, formatKey) {
  const fmt = EXPORT_FORMATS[formatKey];
  const zip = new JSZip();
  const csv = [
    "rank,file,formula,supercell_size,n_atoms,ewald_eV,ewald_eV_per_atom,dE_meV_per_atom",
  ];
  for (const row of rows) {
    const name = rowFileName(row, fmt.ext);
    zip.file(name, fmt.serialize(row.structure));
    csv.push(
      [
        row.rank ?? "",
        name,
        row.formula,
        row.size,
        row.nAtoms,
        row.energy ?? "",
        row.perAtom ?? "",
        row.dE ?? "",
      ].join(","),
    );
  }
  zip.file("energies.csv", csv.join("\n") + "\n");
  return zip.generateAsync({ type: "blob" });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
