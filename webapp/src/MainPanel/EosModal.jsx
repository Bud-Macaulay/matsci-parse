import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createLattice, fitEos, volume, EOS_MIN_POINTS } from "matsci-parse";

import Modal from "../common/Modal";
import DownloadDropdown from "../common/DownloadDropdown";
import {
  getSharedWorker,
  buildSystemArrays,
  useSharedModel,
} from "../mlip/sharedWorker";

// Categorical slots 1–4 of the dataviz reference palette, in fixed order
// (validated on a light surface; aqua and yellow are below 3:1 contrast, so
// every curve is also named in the results table).
const FORMS = [
  { key: "birchMurnaghan", label: "Birch–Murnaghan", color: "#2a78d6" },
  { key: "vinet", label: "Vinet", color: "#eb6834" },
  { key: "murnaghan", label: "Murnaghan", color: "#1baf7a" },
  { key: "poirierTarantola", label: "Poirier–Tarantola", color: "#eda100" },
];

const PLOT_W = 720;
const PLOT_H = 320;
const MARGIN = { top: 16, right: 16, bottom: 40, left: 56 };

/** Isotropically rescale the cell to `targetVolume` (Å³). Fractional
 * coordinates are kept, so atoms move with the cell. */
function scaleToVolume(structure, targetVolume) {
  const f = Math.cbrt(targetVolume / volume(structure));
  return {
    ...structure,
    lattice: createLattice(structure.lattice.basis.data.map((x) => x * f)),
  };
}

/** Parse "V E" pairs, one per line; blank lines and # comments ignored. */
function parsePairs(text) {
  const volumes = [];
  const energies = [];
  text.split("\n").forEach((raw, i) => {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) return;
    const parts = line.split(/[\s,;]+/).map(Number);
    if (parts.length < 2 || !parts.slice(0, 2).every(Number.isFinite)) {
      throw new Error(`Line ${i + 1}: expected "volume energy", got "${raw.trim()}"`);
    }
    volumes.push(parts[0]);
    energies.push(parts[1]);
  });
  return { volumes, energies };
}

function toCsv(data, fits) {
  const ok = fits.filter((f) => f.fit);
  const rows = [
    ["volume_A3", "energy_eV", ...ok.map((f) => `${f.key}_eV`)].join(","),
  ];
  data.volumes.forEach((v, i) => {
    rows.push([v, data.energies[i], ...ok.map((f) => f.fit.energy(v))].join(","));
  });
  return rows.join("\n");
}

function niceTicks(lo, hi, n = 5) {
  return Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1));
}

export default function EosModal({ structure, setStructure, pushUndo }) {
  const sharedModel = useSharedModel();
  const modelReady = sharedModel != null;
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("mlip");
  const [form, setForm] = useState("birchMurnaghan");
  const [rangePct, setRangePct] = useState(6);
  const [nPoints, setNPoints] = useState(9);
  const [pasted, setPasted] = useState("");
  const [sampled, setSampled] = useState(null);
  const [running, setRunning] = useState(0);
  const [runError, setRunError] = useState("");
  const [hover, setHover] = useState(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    return () => {
      cancelRef.current = true;
    };
  }, []);

  const { data, dataError } = useMemo(() => {
    // MLIP samples belong to the structure they were computed from.
    if (source === "mlip") {
      return { data: sampled?.from === structure ? sampled : null, dataError: null };
    }
    if (!pasted.trim()) return { data: null, dataError: null };
    try {
      return { data: parsePairs(pasted), dataError: null };
    } catch (e) {
      return { data: null, dataError: e.message };
    }
  }, [source, sampled, pasted, structure]);

  // Every form is fitted to the same data; `form` only picks the active one.
  const fits = useMemo(() => {
    if (!data) return [];
    return FORMS.map((f) => {
      try {
        return { ...f, fit: fitEos(data.volumes, data.energies, { form: f.key }), error: null };
      } catch (e) {
        return { ...f, fit: null, error: e?.message ?? String(e) };
      }
    });
  }, [data]);
  const active = fits.find((f) => f.key === form);
  const fit = active?.fit ?? null;
  // A data problem (too few points, no minimum, …) fails every form alike:
  // report it once instead of per row.
  const fitError = fits.length > 0 && fits.every((f) => !f.fit) ? fits[0].error : null;

  const runMlip = async () => {
    setRunError("");
    setSampled(null);
    cancelRef.current = false;
    const v0 = volume(structure);
    const volumes = Array.from(
      { length: nPoints },
      (_, i) => v0 * (1 - rangePct / 100 + (2 * rangePct * i) / (100 * (nPoints - 1))),
    );
    const energies = [];
    setRunning(1);
    try {
      const client = await getSharedWorker();
      for (let i = 0; i < volumes.length; i++) {
        if (cancelRef.current) return;
        setRunning(i + 1);
        const s = scaleToVolume(structure, volumes[i]);
        await client.setSystem({ ...buildSystemArrays(s), periodic: true });
        const { energy } = await client.predict();
        if (!Number.isFinite(energy)) {
          throw new Error(`The MLIP returned a non-finite energy at V = ${volumes[i].toFixed(3)} Å³`);
        }
        energies.push(energy);
      }
      setSampled({ from: structure, volumes, energies });
    } catch (err) {
      setRunError(err?.message ?? String(err));
    } finally {
      setRunning(0);
    }
  };

  const applyV0 = () => {
    pushUndo({ action: "eos-v0", label: `Scale cell to EOS V₀ (${fit.v0.toFixed(3)} Å³)` });
    setStructure(scaleToVolume(structure, fit.v0));
  };

  const handleClose = useCallback(() => {
    cancelRef.current = true;
    setOpen(false);
    setHover(null);
  }, []);

  // --- plot geometry: energies relative to the active E₀ (or the lowest
  // point), meV; one curve per successful fit, active one drawn last ---
  const plot = useMemo(() => {
    if (!data || data.volumes.length === 0) return null;
    const ref = fit ? fit.e0 : Math.min(...data.energies);
    const pts = data.volumes.map((v, i) => ({ v, e: (data.energies[i] - ref) * 1000 }));
    const vLo = Math.min(...data.volumes);
    const vHi = Math.max(...data.volumes);
    const pad = (vHi - vLo) * 0.04 || vLo * 0.01;
    const x0 = vLo - pad;
    const x1 = vHi + pad;
    const curves = fits
      .filter((f) => f.fit)
      .sort((a, b) => (a.key === form) - (b.key === form))
      .map((f) => ({
        key: f.key,
        color: f.color,
        active: f.key === form,
        pts: Array.from({ length: 121 }, (_, i) => {
          const v = x0 + ((x1 - x0) * i) / 120;
          return { v, e: (f.fit.energy(v) - ref) * 1000 };
        }),
      }));
    // The current cell, placed on the active fit (skipped when its volume is
    // outside the plotted range, e.g. pasted data for a different cell).
    const curV = structure ? volume(structure) : null;
    const current =
      fit && curV != null && curV >= x0 && curV <= x1
        ? { v: curV, e: (fit.energy(curV) - ref) * 1000 }
        : null;
    const ys = [...pts, ...curves.flatMap((c) => c.pts)].map((p) => p.e);
    const yLo = Math.min(0, ...ys);
    const yHi = Math.max(...ys);
    const ySpan = yHi - yLo || 1;
    const y0 = yLo - ySpan * 0.05;
    const y1 = yHi + ySpan * 0.08;
    const plotW = PLOT_W - MARGIN.left - MARGIN.right;
    const plotH = PLOT_H - MARGIN.top - MARGIN.bottom;
    const sx = (x) => MARGIN.left + ((x - x0) / (x1 - x0)) * plotW;
    const sy = (y) => MARGIN.top + plotH - ((y - y0) / (y1 - y0)) * plotH;
    return {
      pts,
      sx,
      sy,
      xTicks: niceTicks(x0, x1),
      yTicks: niceTicks(y0, y1),
      curves: curves.map((c) => ({
        ...c,
        path: c.pts.map((p, i) => `${i ? "L" : "M"}${sx(p.v).toFixed(1)},${sy(p.e).toFixed(1)}`).join(""),
      })),
      current,
      refLabel: fit ? "E − E₀" : "E − E_min",
    };
  }, [data, fits, fit, form, structure]);

  const numInput =
    "border border-gray-300 rounded px-1.5 py-1 font-mono w-16 bg-white disabled:opacity-50";
  const hovered = hover != null && plot ? plot.pts[hover] : null;
  const nAtoms = structure?.sites.length ?? 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={!structure}
        title="Fit an equation of state E(V): equilibrium volume and bulk modulus"
        className="buttonSimple border border-indigo-400 bg-indigo-200! text-indigo-700!"
      >
        calculate EOS
      </button>

      <Modal open={open} onClose={handleClose} title="Equation of state" maxWidth="max-w-4xl">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600">
            <span className="flex items-center rounded border border-gray-300 overflow-hidden select-none">
              {[
                ["mlip", "MLIP"],
                ["paste", "Paste E(V)"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSource(key)}
                  disabled={running > 0}
                  className={`px-2 py-1 ${
                    source === key
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </span>
            {source === "mlip" && (
              <>
                <label className="flex items-center gap-2 select-none">
                  <span className="text-gray-400">Volume ± (%)</span>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    step={1}
                    value={rangePct}
                    disabled={running > 0}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (v > 0 && v < 50) setRangePct(v);
                    }}
                    className={numInput}
                  />
                </label>
                <label className="flex items-center gap-2 select-none">
                  <span className="text-gray-400">Points</span>
                  <input
                    type="number"
                    min={EOS_MIN_POINTS}
                    max={41}
                    value={nPoints}
                    disabled={running > 0}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (v >= EOS_MIN_POINTS && v <= 41) setNPoints(v);
                    }}
                    className={numInput}
                  />
                </label>
              </>
            )}
            {data && (
              <span className="ml-auto">
                <DownloadDropdown
                  items={[
                    {
                      key: "eos-csv",
                      label: "E(V) data (CSV)",
                      filename: "eos.csv",
                      serialize: () => toCsv(data, fits),
                    },
                  ]}
                  menuClassName="w-44"
                />
              </span>
            )}
          </div>

          {source === "mlip" && (
            <>
              {!modelReady && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  Load a model in the MLIP panel first, or switch to “Paste E(V)”.
                </p>
              )}
              {modelReady && (
                <p className="text-[0.65rem] text-gray-500">
                  Calculator: {sharedModel.source ?? "MLIP"} · the cell is scaled
                  isotropically and atoms keep their fractional coordinates (no
                  internal relaxation).
                </p>
              )}
              <button
                onClick={running ? () => { cancelRef.current = true; } : runMlip}
                disabled={!modelReady || !structure}
                className="w-full px-3 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {running ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Cancel ({running}/{nPoints})
                  </span>
                ) : (
                  `Compute ${nPoints} energies`
                )}
              </button>
            </>
          )}

          {source === "paste" && (
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={6}
              spellCheck={false}
              placeholder={"# volume (Å³)  energy (eV), one pair per line\n15.20  -3.7121\n15.80  -3.7302\n..."}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 font-mono text-xs bg-white"
            />
          )}

          {(runError || dataError || fitError) && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {runError || dataError || fitError}
            </div>
          )}

          {fits.length > 0 && !fitError && (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
              <table className="w-full font-mono tabular-nums">
                <thead>
                  <tr className="text-left text-gray-400 font-sans">
                    <th className="py-1 pr-2 font-normal">Fit (click to make active)</th>
                    <th className="py-1 px-2 font-normal text-right">V₀ (Å³)</th>
                    {source === "mlip" && nAtoms > 0 && (
                      <th className="py-1 px-2 font-normal text-right">V₀/atom</th>
                    )}
                    <th className="py-1 px-2 font-normal text-right">B₀ (GPa)</th>
                    <th className="py-1 px-2 font-normal text-right">B₀′</th>
                    <th className="py-1 px-2 font-normal text-right">E₀ (eV)</th>
                    <th className="py-1 pl-2 font-normal text-right">RMSE (meV)</th>
                  </tr>
                </thead>
                <tbody>
                  {fits.map((f) => (
                    <tr
                      key={f.key}
                      onClick={() => setForm(f.key)}
                      title={f.error ?? `R² ${f.fit.rSquared.toFixed(6)} · ${f.fit.iterations} iterations`}
                      className={`border-t border-gray-200 cursor-pointer ${
                        f.key === form ? "bg-white font-semibold" : "hover:bg-white"
                      }`}
                    >
                      <td className="py-1 pr-2 font-sans">
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block w-4 rounded-full"
                            style={{ height: f.key === form ? 3 : 2, background: f.color }}
                          />
                          {f.label}
                        </span>
                      </td>
                      {f.fit ? (
                        <>
                          <td className="py-1 px-2 text-right">
                            {f.fit.v0.toFixed(3)}
                            <span className="text-gray-400 font-normal"> ±{f.fit.standardErrors.v0.toFixed(3)}</span>
                          </td>
                          {source === "mlip" && nAtoms > 0 && (
                            <td className="py-1 px-2 text-right">{(f.fit.v0 / nAtoms).toFixed(3)}</td>
                          )}
                          <td className="py-1 px-2 text-right">
                            {f.fit.b0GPa.toFixed(2)}
                            <span className="text-gray-400 font-normal">
                              {" "}±{(f.fit.standardErrors.b0 * (f.fit.b0GPa / f.fit.b0)).toFixed(2)}
                            </span>
                          </td>
                          <td className="py-1 px-2 text-right">
                            {f.fit.b1.toFixed(3)}
                            <span className="text-gray-400 font-normal"> ±{f.fit.standardErrors.b1.toFixed(3)}</span>
                          </td>
                          <td className="py-1 px-2 text-right">{f.fit.e0.toFixed(5)}</td>
                          <td className="py-1 pl-2 text-right">{(f.fit.rmse * 1000).toFixed(3)}</td>
                        </>
                      ) : (
                        <td colSpan={6} className="py-1 px-2 text-red-600 font-sans font-normal">
                          {f.error}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {fit?.warnings.map((w) => (
                <p key={w} className="mt-1 text-amber-700">
                  {active.label}: {w}
                </p>
              ))}
              {source === "mlip" && fit && (
                <button
                  onClick={applyV0}
                  title="Rescale the current cell to the active fit's equilibrium volume (undoable)"
                  className="mt-2 px-3 py-1.5 rounded-md border border-indigo-400 text-indigo-700 bg-white hover:bg-indigo-50 text-xs font-semibold"
                >
                  Set cell to V₀ ({active.label})
                </button>
              )}
            </div>
          )}

          {plot && (
            <div className="relative">
              <svg
                viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
                className="w-full rounded-lg border border-gray-200 bg-white"
                onMouseLeave={() => setHover(null)}
              >
                {plot.yTicks.map((t) => (
                  <g key={`y${t}`}>
                    <line
                      x1={MARGIN.left}
                      x2={PLOT_W - MARGIN.right}
                      y1={plot.sy(t)}
                      y2={plot.sy(t)}
                      stroke="#e5e7eb"
                      strokeWidth={1}
                    />
                    <text x={MARGIN.left - 6} y={plot.sy(t) + 3} textAnchor="end" fontSize={10} fill="#9ca3af">
                      {t.toFixed(Math.abs(t) < 10 ? 1 : 0)}
                    </text>
                  </g>
                ))}
                {plot.xTicks.map((t) => (
                  <text key={`x${t}`} x={plot.sx(t)} y={PLOT_H - 22} textAnchor="middle" fontSize={10} fill="#9ca3af">
                    {t.toFixed(2)}
                  </text>
                ))}
                <text
                  x={(PLOT_W - MARGIN.right + MARGIN.left) / 2}
                  y={PLOT_H - 4}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#6b7280"
                >
                  Volume (Å³)
                </text>
                <text
                  x={14}
                  y={MARGIN.top + (PLOT_H - MARGIN.top - MARGIN.bottom) / 2}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#6b7280"
                  transform={`rotate(-90 14 ${MARGIN.top + (PLOT_H - MARGIN.top - MARGIN.bottom) / 2})`}
                >
                  {plot.refLabel} (meV)
                </text>
                {fit && (
                  <line
                    x1={plot.sx(fit.v0)}
                    x2={plot.sx(fit.v0)}
                    y1={MARGIN.top}
                    y2={PLOT_H - MARGIN.bottom}
                    stroke={active.color}
                    strokeOpacity={0.6}
                    strokeDasharray="4 3"
                  />
                )}
                {plot.curves.map((c) => (
                  <path
                    key={c.key}
                    d={c.path}
                    fill="none"
                    stroke={c.color}
                    strokeWidth={c.active ? 2.5 : 1.5}
                    strokeOpacity={c.active ? 1 : 0.8}
                  />
                ))}
                {plot.pts.map((p, i) => (
                  <circle
                    key={i}
                    cx={plot.sx(p.v)}
                    cy={plot.sy(p.e)}
                    r={i === hover ? 6 : 4}
                    fill={i === hover ? "#4338ca" : "#fff"}
                    stroke="#4338ca"
                    strokeWidth={1.5}
                    onMouseEnter={() => setHover(i)}
                  />
                ))}
                {plot.current && (() => {
                  // Drawn over the data points (in MLIP mode the current cell
                  // is the middle sample) without blocking their hover.
                  const cx = plot.sx(plot.current.v);
                  const cy = plot.sy(plot.current.e);
                  const d = `M${cx - 6},${cy - 6}L${cx + 6},${cy + 6}M${cx - 6},${cy + 6}L${cx + 6},${cy - 6}`;
                  return (
                    <g pointerEvents="none">
                      <path d={d} stroke="#fff" strokeWidth={5} strokeLinecap="round" />
                      <path d={d} stroke="#111827" strokeWidth={2} strokeLinecap="round" />
                      <text x={cx} y={cy - 12} textAnchor="middle" fontSize={10} fill="#4b5563">
                        current · {plot.current.v.toFixed(2)} Å³
                      </text>
                    </g>
                  );
                })()}
              </svg>
              {hovered && (
                <div className="absolute top-1 left-16 text-xs bg-gray-900 text-white rounded px-2 py-1 font-mono pointer-events-none">
                  V {hovered.v.toFixed(3)} Å³ · E {data.energies[hover].toFixed(5)} eV
                  {fit && ` · ${active.label} residual ${(fit.residuals[hover] * 1000).toFixed(3)} meV`}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
