import { useCallback, useMemo, useState } from "react";
import { calculateXrdPattern, WAVELENGTHS } from "matsci-parse";

import Modal from "../common/Modal";
import DownloadDropdown from "../common/DownloadDropdown";

const WAVELENGTH_KEYS = Object.keys(WAVELENGTHS);

const PLOT_W = 720;
const PLOT_H = 360;
const MARGIN = { top: 28, right: 16, bottom: 40, left: 48 };

/** Compact hkl label, e.g. "110" or "1,1,-2,0". */
function formatHkl(hkl) {
  return hkl.every((i) => Number.isInteger(i) && Math.abs(i) < 10 && i >= 0)
    ? hkl.join("")
    : hkl.join(",");
}

function formatFamilies(families) {
  return families
    .map((f) => `${formatHkl(f.hkl)}${f.multiplicity > 1 ? `×${f.multiplicity}` : ""}`)
    .join("  ");
}

function toCsv(pattern) {
  const rows = ["two_theta,intensity,d_spacing,hkls"];
  for (let i = 0; i < pattern.twoTheta.length; i++) {
    rows.push(
      `${pattern.twoTheta[i]},${pattern.intensities[i]},${pattern.dSpacings[i]},"${formatFamilies(pattern.hkls[i])}"`,
    );
  }
  return rows.join("\n");
}

export default function XrdModal({ structure }) {
  const [open, setOpen] = useState(false);
  const [wavelength, setWavelength] = useState("CuKa");
  const [minTheta, setMinTheta] = useState(0);
  const [maxTheta, setMaxTheta] = useState(90);
  const [hover, setHover] = useState(null);

  const { pattern, error, calcMs } = useMemo(() => {
    if (!open) return { pattern: null, error: null, calcMs: null };
    try {
      const lo = Math.max(0, Math.min(minTheta, maxTheta - 0.5));
      const hi = Math.min(180, Math.max(maxTheta, minTheta + 0.5));
      const t0 = performance.now();
      const result = calculateXrdPattern(structure, {
        wavelength,
        twoThetaRange: [lo, hi],
      });
      return {
        pattern: result,
        error: null,
        calcMs: performance.now() - t0,
      };
    } catch (e) {
      console.error("XrdModal:", e);
      return { pattern: null, error: e?.message ?? String(e), calcMs: null };
    }
  }, [open, structure, wavelength, minTheta, maxTheta]);

  const handleOpen = useCallback(() => {
    setHover(null);
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setHover(null);
  }, []);

  const peaks = useMemo(() => {
    if (!pattern || !pattern.twoTheta.length) return [];
    const maxI = Math.max(...pattern.intensities);
    return pattern.twoTheta.map((x, i) => ({
      x,
      y: pattern.intensities[i],
      d: pattern.dSpacings[i],
      families: pattern.hkls[i],
      label: formatFamilies(pattern.hkls[i]),
      major: pattern.intensities[i] / maxI > 0.15,
    }));
  }, [pattern]);

  const maxI = peaks.length ? Math.max(...peaks.map((p) => p.y)) : 100;
  const x0 = minTheta;
  const x1 = Math.max(maxTheta, minTheta + 0.5);
  const plotW = PLOT_W - MARGIN.left - MARGIN.right;
  const plotH = PLOT_H - MARGIN.top - MARGIN.bottom;
  const sx = (x) => MARGIN.left + ((x - x0) / (x1 - x0)) * plotW;
  const sy = (y) => MARGIN.top + plotH - (y / (maxI * 1.15)) * plotH;

  const xTicks = Array.from({ length: 7 }, (_, i) => x0 + ((x1 - x0) * i) / 6);
  const yTicks = [0, maxI / 2, maxI];

  const labeled = peaks.filter((p) => p.major).slice(0, 25);

  const onMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * PLOT_W;
    let best = null;
    let bestDist = Infinity;
    peaks.forEach((p, i) => {
      const d = Math.abs(sx(p.x) - px);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setHover(best);
  };

  const hovered = hover != null ? peaks[hover] : null;

  return (
    <>
      <button
        onClick={handleOpen}
        title="Calculate the X-ray powder diffraction pattern of this structure"
        className="buttonSimple border border-indigo-400 bg-indigo-200! text-indigo-700!"
      >
        calcXRD
      </button>

      <Modal
        open={open}
        onClose={handleClose}
        title="X-ray diffraction pattern"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600">
            <label className="flex items-center gap-2 select-none">
              <span className="text-gray-400">Radiation</span>
              <select
                value={wavelength}
                onChange={(e) => setWavelength(e.target.value)}
                className="border border-gray-300 rounded px-1.5 py-1 font-mono bg-white"
              >
                {WAVELENGTH_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {k} ({WAVELENGTHS[k].toFixed(5)} Å)
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 select-none">
              <span className="text-gray-400">2θ min</span>
              <input
                type="number"
                min={0}
                max={179.5}
                step={5}
                value={minTheta}
                onChange={(e) => setMinTheta(parseFloat(e.target.value) || 0)}
                className="border border-gray-300 rounded px-1.5 py-1 font-mono w-20 bg-white"
              />
            </label>
            <label className="flex items-center gap-2 select-none">
              <span className="text-gray-400">2θ max</span>
              <input
                type="number"
                min={0.5}
                max={180}
                step={5}
                value={maxTheta}
                onChange={(e) => setMaxTheta(parseFloat(e.target.value) || 0)}
                className="border border-gray-300 rounded px-1.5 py-1 font-mono w-20 bg-white"
              />
            </label>
            {pattern && (
              <span className="ml-auto">
                <span className="text-gray-400">peaks </span>
                <span className="font-mono">{pattern.twoTheta.length}</span>
                {calcMs != null && (
                  <>
                    <span className="text-gray-400"> · calc </span>
                    <span className="font-mono">
                      {calcMs < 10 ? calcMs.toFixed(2) : calcMs.toFixed(1)} ms
                    </span>
                  </>
                )}
              </span>
            )}
            {pattern && pattern.twoTheta.length > 0 && (
              <DownloadDropdown
                items={[
                  {
                    key: "xrd-csv",
                    label: "Pattern (CSV)",
                    filename: "xrd_pattern.csv",
                    serialize: () => toCsv(pattern),
                  },
                  {
                    key: "xrd-json",
                    label: "Pattern (JSON)",
                    filename: "xrd_pattern.json",
                    serialize: () => JSON.stringify(pattern, null, 2),
                  },
                ]}
                menuClassName="w-44"
              />
            )}
          </div>

          {error && (
            <div className="flex items-center justify-center text-sm text-red-500 py-16">
              Failed to calculate the XRD pattern: {error}
            </div>
          )}

          {!error && peaks.length === 0 && (
            <div className="flex items-center justify-center text-sm text-gray-500 py-16">
              No peaks in this 2θ range.
            </div>
          )}

          {!error && peaks.length > 0 && (
            <div className="relative">
              <svg
                viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
                className="w-full rounded-lg border border-gray-200 bg-white"
                onMouseMove={onMouseMove}
                onMouseLeave={() => setHover(null)}
              >
                {yTicks.map((t) => (
                  <g key={t}>
                    <line
                      x1={MARGIN.left}
                      x2={PLOT_W - MARGIN.right}
                      y1={sy(t)}
                      y2={sy(t)}
                      stroke="#e5e7eb"
                      strokeWidth={1}
                    />
                    <text
                      x={MARGIN.left - 6}
                      y={sy(t) + 3}
                      textAnchor="end"
                      fontSize={10}
                      fill="#9ca3af"
                    >
                      {t.toFixed(t < 10 && t !== 0 ? 1 : 0)}
                    </text>
                  </g>
                ))}
                {xTicks.map((t) => (
                  <text
                    key={t}
                    x={sx(t)}
                    y={PLOT_H - 12}
                    textAnchor="middle"
                    fontSize={10}
                    fill="#9ca3af"
                  >
                    {t.toFixed(1)}
                  </text>
                ))}
                <text
                  x={(PLOT_W - MARGIN.right + MARGIN.left) / 2}
                  y={PLOT_H - 0}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#6b7280"
                >
                  2θ (°)
                </text>
                {peaks.map((p, i) => (
                  <line
                    key={i}
                    x1={sx(p.x)}
                    x2={sx(p.x)}
                    y1={sy(0)}
                    y2={sy(p.y)}
                    stroke={i === hover ? "#4338ca" : "#4f46e5"}
                    strokeWidth={i === hover ? 3 : 1.75}
                    opacity={i === hover ? 1 : 0.75}
                  />
                ))}
                {labeled.map((p) => (
                  <text
                    key={`label-${p.x}`}
                    x={sx(p.x) - 4}
                    y={sy(p.y) - 6}
                    textAnchor="end"
                    fontSize={10}
                    fill="#374151"
                    transform={`rotate(-90 ${sx(p.x) - 4} ${sy(p.y) - 6})`}
                  >
                    {p.label}
                  </text>
                ))}
                {hovered && (
                  <circle
                    cx={sx(hovered.x)}
                    cy={sy(hovered.y)}
                    r={4}
                    fill="#4338ca"
                  />
                )}
              </svg>
              {hovered && (
                <div className="absolute top-1 left-12 text-xs bg-gray-900 text-white rounded px-2 py-1 font-mono pointer-events-none">
                  2θ {hovered.x.toFixed(3)}° · I {hovered.y.toFixed(1)} · d{" "}
                  {hovered.d.toFixed(4)} Å · {hovered.label}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
