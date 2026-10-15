import { useMemo, useState } from "react";

import Modal from "../common/Modal";
import { showToast } from "../common/toastStore";
import { defaultCharge } from "../common/oxidationStates";
import { actions } from "../store/appStore";
import {
  EXPORT_FORMATS,
  buildDisorderedParent,
  downloadBlob,
  enumerateOrderings,
  exportZip,
  netCharge,
  parseOccupancy,
  primitiveOfDisordered,
  rankByEwald,
  sortByEnergy,
  speciesOf,
} from "../enumerate/enumeration";

const MAX_ROWS_SHOWN = 500;

const numInput =
  "w-20 px-2 py-1 text-xs border rounded font-mono text-center";

function Section({ title, children, right }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {title}
        </h3>
        {right}
      </div>
      {children}
    </div>
  );
}

export default function EnumerateModal({ structure }) {
  const [open, setOpen] = useState(false);
  const [forStructure, setForStructure] = useState(null);

  // Per-site occupancy text ("" = keep the site's own species).
  const [occText, setOccText] = useState([]);
  const [usePrimitive, setUsePrimitive] = useState(true);
  const [maxSize, setMaxSize] = useState(4);
  const [maxCombinations, setMaxCombinations] = useState(10000);
  const [chargeText, setChargeText] = useState({});

  const [status, setStatus] = useState("idle"); // idle | enumerating | ranking | done
  const [progress, setProgress] = useState([0, 0]);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState(null);
  const [runInfo, setRunInfo] = useState(null);
  const [sortKey, setSortKey] = useState("energy");
  const [topK, setTopK] = useState("");

  const handleOpen = () => {
    // A different structure than last time: start over.
    if (forStructure !== structure) {
      setForStructure(structure);
      setOccText(structure.sites.map(() => ""));
      setRows(null);
      setRunInfo(null);
      setError(null);
      setStatus("idle");
    }
    setOpen(true);
  };

  const parsed = useMemo(
    () => occText.map((t) => (t.trim() ? parseOccupancy(t) : null)),
    [occText],
  );
  const hasErrors = parsed.some((p) => p?.error);
  const nDisordered = parsed.filter(
    (p) => p?.occupancy && p.occupancy.length > 1,
  ).length;

  const parent = useMemo(() => {
    if (!open || hasErrors || occText.length !== structure.sites.length) {
      return null;
    }
    return buildDisorderedParent(
      structure,
      parsed.map((p) => p?.occupancy ?? null),
    );
  }, [open, hasErrors, occText.length, structure, parsed]);

  const species = useMemo(() => (parent ? speciesOf(parent) : []), [parent]);
  const charges = useMemo(() => {
    const out = {};
    for (const sym of species) {
      const v = parseFloat(chargeText[sym]);
      out[sym] = Number.isFinite(v) ? v : defaultCharge(sym);
    }
    return out;
  }, [species, chargeText]);
  const net = parent ? netCharge(parent, charges) : 0;
  // Orderings on a site whose species all carry the same charge have
  // identical point-charge energies: Ewald cannot rank them.
  const indistinct = parsed.some(
    (p) =>
      p?.occupancy?.length > 1 &&
      new Set(p.occupancy.map((o) => charges[o.symbol])).size === 1,
  );

  const busy = status === "enumerating" || status === "ranking";
  const canRun = parent && nDisordered > 0 && !busy;

  const setOcc = (i, text) =>
    setOccText((prev) => prev.map((t, j) => (j === i ? text : t)));

  const applyToSpecies = (i) => {
    const sym = structure.sites[i].species.symbol;
    const text = occText[i];
    setOccText((prev) =>
      prev.map((t, j) =>
        structure.sites[j].species.symbol === sym ? text : t,
      ),
    );
  };

  const run = async () => {
    setStatus("enumerating");
    setError(null);
    setRows(null);
    setProgress([0, 0]);
    try {
      const p = usePrimitive ? await primitiveOfDisordered(parent) : parent;
      const found = await enumerateOrderings(p, { maxSize, maxCombinations });
      setRunInfo({ parentSites: p.sites.length, count: found.length });
      setStatus("ranking");
      const ranked = await rankByEwald(found, charges, (d, t) =>
        setProgress([d, t]),
      );
      setRows(sortByEnergy(ranked));
      setStatus("done");
    } catch (e) {
      console.error(e);
      setError(e.message ?? String(e));
      setStatus("idle");
    }
  };

  const rerank = async () => {
    if (!rows) return;
    setStatus("ranking");
    setError(null);
    try {
      const ranked = await rankByEwald(rows, charges, (d, t) =>
        setProgress([d, t]),
      );
      setRows(sortByEnergy(ranked));
    } catch (e) {
      setError(e.message ?? String(e));
    }
    setStatus("done");
  };

  const shown = useMemo(() => {
    if (!rows) return [];
    const list =
      sortKey === "size"
        ? [...rows].sort((a, b) => a.size - b.size || a.rank - b.rank)
        : rows;
    return list;
  }, [rows, sortKey]);

  const exportRows = (formatKey) => {
    const k = parseInt(topK);
    const list = Number.isFinite(k) && k > 0 ? rows.slice(0, k) : rows;
    exportZip(list, formatKey)
      .then((blob) => {
        downloadBlob(blob, `orderings_${EXPORT_FORMATS[formatKey].ext}.zip`);
        showToast(`Exported ${list.length} structure(s)`, "info");
      })
      .catch((e) => showToast(`Export failed: ${e.message}`, "error"));
  };

  const openInTab = (row) =>
    actions.createTab(row.structure, {
      name: `${row.formula} #${row.rank} (x${row.size})`,
    });

  return (
    <>
      <button
        onClick={handleOpen}
        title="Make sites disordered, enumerate orderings in supercells, rank by Ewald energy"
        className="buttonSimple blue w-full"
      >
        Enumerate Orderings
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Enumerate Orderings"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-5 text-xs">
          {/* 1. Disorder */}
          <Section
            title="1. Disordered sites"
            right={
              <span className="text-gray-500">
                {nDisordered} disordered site(s)
              </span>
            }
          >
            <p className="text-gray-500">
              Give a site an occupancy such as{" "}
              <code className="bg-gray-100 px-1">Cl:0.5 Br:0.5</code> or{" "}
              <code className="bg-gray-100 px-1">Ag:1/3 Pd:1/3 Pt:1/3</code>.
              Fractions must sum to 1 (vacancies are not supported). Leave
              blank to keep the site as is.
            </p>
            <div className="max-h-56 overflow-y-auto border rounded">
              <table className="table-nice w-full">
                <thead>
                  <tr>
                    <th className="w-8">#</th>
                    <th className="w-14">Species</th>
                    <th className="w-40">Frac</th>
                    <th>Occupancy</th>
                    <th className="w-24" />
                  </tr>
                </thead>
                <tbody>
                  {structure.sites.map((site, i) => {
                    const p = parsed[i];
                    return (
                      <tr key={i} className="text-[12px]">
                        <td className="px-2 py-1 border-b">{i}</td>
                        <td className="px-2 py-1 border-b font-mono">
                          {site.species.symbol}
                        </td>
                        <td className="px-2 py-1 border-b font-mono text-gray-500">
                          {Array.from(site.frac)
                            .map((v) => v.toFixed(3))
                            .join(" ")}
                        </td>
                        <td className="px-1 py-1 border-b">
                          <input
                            value={occText[i] ?? ""}
                            onChange={(e) => setOcc(i, e.target.value)}
                            placeholder={`${site.species.symbol}:1`}
                            className={`w-full px-1 py-0.5 text-[11px] border rounded font-mono ${
                              p?.error ? "border-red-400 bg-red-50" : ""
                            }`}
                          />
                          {p?.error && (
                            <div className="text-[10px] text-red-600">
                              {p.error}
                            </div>
                          )}
                        </td>
                        <td className="px-1 py-1 border-b text-center">
                          <button
                            onClick={() => applyToSpecies(i)}
                            disabled={busy}
                            title={`Copy this occupancy to every ${site.species.symbol} site`}
                            className="buttonSimple gray"
                          >
                            all {site.species.symbol}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>

          {/* 2. Settings + charges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Section title="2. Supercells">
              <div className="flex flex-wrap gap-4 items-end">
                <label className="flex flex-col items-center">
                  <input
                    type="number"
                    min={1}
                    value={maxSize}
                    onChange={(e) =>
                      setMaxSize(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className={numInput}
                  />
                  <span className="text-[10px] text-gray-500">
                    max size (cells)
                  </span>
                </label>
                <label
                  className="flex flex-col items-center"
                  title="Caps the raw labelings tried across all sizes. Symmetry-equivalent copies are merged afterwards, so far fewer structures come back."
                >
                  <input
                    type="number"
                    min={1}
                    step={1000}
                    value={maxCombinations}
                    onChange={(e) =>
                      setMaxCombinations(
                        Math.max(1, parseInt(e.target.value) || 1),
                      )
                    }
                    className="w-24 px-2 py-1 text-xs border rounded font-mono text-center"
                  />
                  <span className="text-[10px] text-gray-500 text-center">
                    search cap
                    <br />
                    (before symmetry reduction)
                  </span>
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={usePrimitive}
                    onChange={(e) => setUsePrimitive(e.target.checked)}
                  />
                  <span>reduce to primitive cell first</span>
                </label>
              </div>
              <p className="text-gray-500">
                All symmetrically distinct orderings in every supercell shape
                of 1..{maxSize} parent cells (Hart–Forcade, as enumlib).
                {usePrimitive
                  ? " Sizes count primitive cells of the disordered parent."
                  : ` Sizes count this ${structure.sites.length}-site cell.`}
              </p>
            </Section>

            <Section title="3. Charges (Ewald)">
              {species.length === 0 ? (
                <p className="text-gray-400">Fix the occupancies above.</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {species.map((sym) => (
                    <label key={sym} className="flex flex-col items-center">
                      <input
                        type="number"
                        step={1}
                        value={chargeText[sym] ?? String(charges[sym])}
                        onChange={(e) =>
                          setChargeText((c) => ({
                            ...c,
                            [sym]: e.target.value,
                          }))
                        }
                        className="w-16 px-2 py-1 text-xs border rounded font-mono text-center"
                      />
                      <span className="text-[10px] text-gray-500">{sym}</span>
                    </label>
                  ))}
                </div>
              )}
              {parent && Math.abs(net) > 1e-6 && (
                <p className="text-amber-700">
                  Net charge {+net.toFixed(4)} e per cell: energies include a
                  neutralizing background.
                </p>
              )}
              {indistinct && (
                <p className="text-amber-700">
                  Species sharing a site have equal charges, so Ewald gives
                  every ordering the same energy there.
                </p>
              )}
            </Section>
          </div>

          {/* Run */}
          <div className="flex items-center gap-3">
            <button
              onClick={run}
              disabled={!canRun}
              className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
            >
              {status === "enumerating"
                ? "Enumerating…"
                : status === "ranking"
                  ? `Ranking ${progress[0]}/${progress[1]}…`
                  : "Enumerate"}
            </button>
            {rows && (
              <button
                onClick={rerank}
                disabled={busy}
                title="Recompute Ewald energies with the current charges"
                className="buttonSimple gray"
              >
                Re-rank with charges
              </button>
            )}
            {!busy && nDisordered === 0 && !hasErrors && (
              <span className="text-gray-500">
                Make at least one site disordered.
              </span>
            )}
          </div>
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-red-700">
              {error}
              {/exceeds cap/.test(error) &&
                " — lower the max size or raise the search cap."}
            </div>
          )}

          {/* 4. Results */}
          {rows && (
            <Section
              title={`4. Results (${rows.length})`}
              right={
                <span className="text-gray-500">
                  parent: {runInfo?.parentSites} site(s)
                </span>
              }
            >
              {rows.length === 0 ? (
                <p className="text-gray-500">
                  No supercell up to size {maxSize} can hold this composition.
                  Each disordered orbit needs (fraction × sites in the
                  supercell) to be a whole number; try a larger max size.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-gray-600">Export</span>
                    <input
                      type="number"
                      min={1}
                      value={topK}
                      onChange={(e) => setTopK(e.target.value)}
                      placeholder="all"
                      className="w-16 px-2 py-1 text-xs border rounded font-mono text-center"
                      title="Export only the N lowest-energy structures (blank = all)"
                    />
                    <span className="text-gray-600">lowest as zip:</span>
                    {Object.entries(EXPORT_FORMATS).map(([key, f]) => (
                      <button
                        key={key}
                        onClick={() => exportRows(key)}
                        disabled={busy}
                        className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 disabled:opacity-40"
                      >
                        {f.label}
                      </button>
                    ))}
                    <span className="text-gray-400">
                      (+ energies.csv, files named by rank)
                    </span>
                  </div>
                  <div className="max-h-72 overflow-y-auto border rounded">
                    <table className="table-nice w-full">
                      <thead>
                        <tr>
                          <th
                            className="w-14 cursor-pointer"
                            onClick={() => setSortKey("energy")}
                            title="Sort by energy"
                          >
                            Rank{sortKey === "energy" ? " ▲" : ""}
                          </th>
                          <th
                            className="w-14 cursor-pointer"
                            onClick={() => setSortKey("size")}
                            title="Sort by supercell size"
                          >
                            Size{sortKey === "size" ? " ▲" : ""}
                          </th>
                          <th className="w-14">Atoms</th>
                          <th>Formula</th>
                          <th className="w-28">E (eV/atom)</th>
                          <th className="w-28">ΔE (meV/atom)</th>
                          <th className="w-14" />
                        </tr>
                      </thead>
                      <tbody>
                        {shown.slice(0, MAX_ROWS_SHOWN).map((r) => (
                          <tr key={r.id} className="text-[12px] hover:bg-gray-50">
                            <td className="px-2 py-1 border-b">{r.rank}</td>
                            <td className="px-2 py-1 border-b">×{r.size}</td>
                            <td className="px-2 py-1 border-b">{r.nAtoms}</td>
                            <td className="px-2 py-1 border-b font-mono">
                              {r.formula}
                            </td>
                            <td className="px-2 py-1 border-b font-mono tabular-nums">
                              {r.perAtom.toFixed(5)}
                            </td>
                            <td className="px-2 py-1 border-b font-mono tabular-nums">
                              {r.dE.toFixed(2)}
                            </td>
                            <td className="px-1 py-1 border-b text-center">
                              <button
                                onClick={() => openInTab(r)}
                                title="Open this structure in a new tab"
                                className="buttonSimple blue"
                              >
                                Open
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {rows.length > MAX_ROWS_SHOWN && (
                    <p className="text-gray-500">
                      Showing {MAX_ROWS_SHOWN} of {rows.length}; export
                      includes all.
                    </p>
                  )}
                </>
              )}
            </Section>
          )}
        </div>
      </Modal>
    </>
  );
}
