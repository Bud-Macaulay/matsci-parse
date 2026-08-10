import { useCallback, useEffect, useRef, useState } from "react";
import { createBZVisualizer } from "brillouinzone-visualizer";
import { getBrillouinZoneData } from "matsci-parse";

import Modal from "../common/Modal";
import { formatSpaceGroupSymbol } from "../common/textFormatting";

const prettify = (label) =>
  label
    .replace(/GAMMA/g, "\u0393")
    .replace(/SIGMA_0/g, "\u03A3")
    .replace(/-/g, "\u2013")
    .replace(/_/g, "\u2081");

export default function BrillouinZoneModal({ structure }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [withTimeReversal, setWithTimeReversal] = useState(true);

  const containerRef = useRef(null);
  const vizRef = useRef(null);

  const compute = useCallback(
    async (wtr) => {
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const bzData = await getBrillouinZoneData(structure, {
          withTimeReversal: wtr,
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
    compute(withTimeReversal);
  }, [compute, withTimeReversal]);

  const handleToggleTimeReversal = useCallback(
    (e) => {
      const wtr = e.target.checked;
      setWithTimeReversal(wtr);
      compute(wtr);
    },
    [compute],
  );

  const handleClose = useCallback(() => {
    setOpen(false);
    setData(null);
  }, []);

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

  const pathSummary = data
    ? data.path.map(([a, b]) => `${prettify(a)}\u2013${prettify(b)}`).join(", ")
    : "";

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
            </div>
          )}
          {!withTimeReversal && data && !data.augmented_path && (
            <div className="px-1.5 py-1 italic bg-gray-50 border border-gray-200 rounded text-gray-500 text-xs">
              Path unaffected by the time-reversal toggle: this structure has
              inversion symmetry, so k and -k are already equivalent.
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
