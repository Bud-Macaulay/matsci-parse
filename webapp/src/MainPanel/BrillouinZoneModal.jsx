import { useCallback, useEffect, useRef, useState } from "react";
import { createBZVisualizer } from "brillouinzone-visualizer";
import { getBrillouinZoneData, toKPOINTS } from "matsci-parse";

import Modal from "../common/Modal";
import { formatSpaceGroupSymbol } from "../common/textFormatting";

function downloadFile(content, filename) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const prettify = (label) =>
  label
    .replace(/GAMMA/g, "\u0393")
    .replace(/SIGMA_0/g, "\u03A3")
    .replace(/-/g, "\u2013")
    .replace(/_/g, "\u2081");

const DEFAULT_REFERENCE_DISTANCE = 0.025;
const MIN_POINTS_PER_LINE = 2;
const MAX_POINTS_PER_LINE = 100;
const DEFAULT_POINTS_PER_LINE = 40;

/** Approximate reference distance needed to hit a total k-point count. */
function totalToReferenceDistance(data, targetTotal) {
  if (!data) return DEFAULT_REFERENCE_DISTANCE;
  const linear = data.explicit_kpoints_linearcoord;
  if (!linear || linear.length < 2) return DEFAULT_REFERENCE_DISTANCE;
  const totalLength = linear[linear.length - 1];
  return Math.max(1e-4, totalLength / Math.max(1, targetTotal - 1));
}

// VASP line mode interpolates the same number of k-points on every segment
// ("points per line"). A path with `segments` segments and `pointsPerLine`
// points per segment samples this many intersections in total (shared
// endpoints counted once).
function estimatedKpointTotal(data, pointsPerLine) {
  if (!data || data.path.length === 0) return 0;
  return data.path.length * (pointsPerLine - 1) + 1;
}

export default function BrillouinZoneModal({ structure }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [withTimeReversal, setWithTimeReversal] = useState(true);
  const [referenceDistance, setReferenceDistance] = useState(
    DEFAULT_REFERENCE_DISTANCE,
  );
  const [pointsPerLine, setPointsPerLine] = useState(DEFAULT_POINTS_PER_LINE);

  const containerRef = useRef(null);
  const vizRef = useRef(null);

  const compute = useCallback(
    async (wtr, refDist) => {
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const bzData = await getBrillouinZoneData(structure, {
          withTimeReversal: wtr,
          referenceDistance: refDist,
        });
        setData(bzData);
      } catch (e) {
        console.error("BrillouinZoneModal:", e);
        setError(e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    },
    [structure],
  );

  const handleOpen = useCallback(() => {
    setOpen(true);
    compute(withTimeReversal, referenceDistance);
  }, [compute, withTimeReversal, referenceDistance]);

  const handleToggleTimeReversal = useCallback(
    (e) => {
      const wtr = e.target.checked;
      setWithTimeReversal(wtr);
      compute(wtr, referenceDistance);
    },
    [compute, referenceDistance],
  );

  const handleRecalculate = useCallback(() => {
    const refDist = totalToReferenceDistance(
      data,
      estimatedKpointTotal(data, pointsPerLine),
    );
    setReferenceDistance(refDist);
    compute(withTimeReversal, refDist);
  }, [data, pointsPerLine, withTimeReversal, compute]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setData(null);
  }, []);

  const pathSummary = data
    ? data.path.map(([a, b]) => `${prettify(a)}\u2013${prettify(b)}`).join(", ")
    : "";

  const proposedSpacing = totalToReferenceDistance(
    data,
    estimatedKpointTotal(data, pointsPerLine),
  );

  useEffect(() => {
    if (!open || !data || !containerRef.current) return;

    const container = containerRef.current;
    const viz = createBZVisualizer(container, data, {
      showPathpoints: true,
      disableInteractOverlay: true,
    });
    vizRef.current = viz;

    return () => {
      window.removeEventListener("resize", viz.resizeRenderer);
      vizRef.current = null;
      if (container) container.innerHTML = "";
    };
  }, [open, data]);

  return (
    <>
      <button
        onClick={handleOpen}
        title="Visualize the first Brillouin zone and the HPKOT high-symmetry k-point path"
        className="buttonSimple border border-indigo-400 bg-indigo-200! text-indigo-700!"
      >
        Brillouin Zone
      </button>

      <Modal
        open={open}
        onClose={handleClose}
        title="Brillouin Zone & k-path"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-3">
          <div className="px-1.5 py-1.5 italic bg-amber-100 border border-amber-200 rounded text-gray-800 align-justify text-sm">
            <span className="not-italic">⚠️</span> This module first calculates
            the primitive cell and as such if you want to run a new simulation
            with this path, please use the primitive cell.{" "}
          </div>
          {data && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
              <span>
                <span className="text-gray-400">Bravais </span>
                <span className="font-mono">
                  {data.bravais_lattice_extended} ({data.bravais_lattice})
                </span>
              </span>
              <span>
                <span className="text-gray-400">SG </span>
                <span className="font-mono">
                  {data.spacegroup_number} (
                  {formatSpaceGroupSymbol(data.spacegroup_international)})
                </span>
              </span>
              <span>
                <span className="text-gray-400">Inversion </span>
                <span className="font-mono">
                  {data.has_inversion_symmetry ? "yes" : "no"}
                </span>
              </span>
              <label
                className="flex items-center gap-1.5 cursor-pointer select-none"
                title="When off, and the structure has no inversion symmetry, the path is augmented with -k segments (HPKOT)"
              >
                <input
                  type="checkbox"
                  checked={withTimeReversal}
                  onChange={handleToggleTimeReversal}
                  className="accent-blue-600"
                />
                <span>Time-reversal symmetry</span>
              </label>
              <span>
                <span className="text-gray-400">Path </span>
                <span className="font-mono">{pathSummary}</span>
                {data.augmented_path && (
                  <span className="ml-1.5 inline-flex items-center rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                    augmented
                  </span>
                )}
              </span>
              <button
                onClick={() =>
                  downloadFile(
                    toKPOINTS(data.kpath, pointsPerLine),
                    "KPOINTS",
                  )
                }
                className="buttonSimple border border-emerald-400 bg-emerald-100! text-emerald-700!"
                title="Download the high-symmetry path as a VASP KPOINTS line-mode file"
              >
                KPOINTS
              </button>
            </div>
          )}
          {!withTimeReversal && data && !data.augmented_path && (
            <div className="px-1.5 py-1 italic bg-gray-50 border border-gray-200 rounded text-gray-500 text-xs">
              Path unaffected by the time-reversal toggle: this structure has
              inversion symmetry, so k and -k are already equivalent.
            </div>
          )}

          {data && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
              <label className="flex items-center gap-2 select-none">
                <span className="text-gray-400 whitespace-nowrap">
                  Points/line
                </span>
                <input
                  type="range"
                  min={MIN_POINTS_PER_LINE}
                  max={MAX_POINTS_PER_LINE}
                  step={1}
                  value={pointsPerLine}
                  onChange={(e) =>
                    setPointsPerLine(parseInt(e.target.value, 10) || 0)
                  }
                  className="accent-blue-600 w-48"
                />
                <span className="font-mono w-12 text-right">
                  {pointsPerLine}
                </span>
              </label>
              <span>
                <span className="text-gray-400">~total </span>
                <span className="font-mono">
                  {estimatedKpointTotal(data, pointsPerLine)}
                </span>
              </span>
              <span>
                <span className="text-gray-400">actual </span>
                <span className="font-mono">
                  {data.explicit_kpoints_rel.length}
                </span>
              </span>
              <span>
                <span className="text-gray-400">spacing </span>
                <span className="font-mono">{proposedSpacing.toFixed(4)}</span>
                <span className="text-gray-400"> Å⁻¹</span>
                {estimatedKpointTotal(data, pointsPerLine) !==
                  data.explicit_kpoints_rel.length && (
                  <span className="ml-1 text-gray-400">
                    (recalculate to apply)
                  </span>
                )}
              </span>
              <button
                onClick={handleRecalculate}
                className="buttonSimple border border-indigo-400 bg-indigo-200! text-indigo-700!"
              >
                Recalculate
              </button>
            </div>
          )}

          {loading && (
            <div className="h-[560px] flex items-center justify-center text-sm text-gray-500">
              Computing high-symmetry k-path…
            </div>
          )}

          {error && (
            <div className="h-[560px] flex items-center justify-center text-sm text-red-500">
              Failed to compute the Brillouin zone: {error}
            </div>
          )}

          {open && !loading && !error && (
            <div
              ref={containerRef}
              className="w-full h-[560px] rounded-lg border border-gray-200 overflow-hidden"
            />
          )}
        </div>
      </Modal>
    </>
  );
}
