import { useState, useMemo, useCallback } from "react";
import { toPW } from "matsci-parse";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";

import Modal from "./Modal";

export default function QEInputModal({ structure }) {
  const [open, setOpen] = useState(false);

  // options state
  const [calculation, setCalculation] = useState("scf");
  const [ecutwfc, setEcutwfc] = useState(30);
  const [kmode, setKmode] = useState("kspacing");
  const [kgrid, setKgrid] = useState([4, 4, 4]);
  const [kspacing, setKspacing] = useState(0.15);
  const [etotConvIdx, setEtotConvIdx] = useState(1); // 0=tight 1=normal 2=fast
  const [forcConvIdx, setForcConvIdx] = useState(1);
  const [pseudoDir, setPseudoDir] = useState("./");

  const ETOT_VALS = [5e-6, 1e-5, 1e-4];
  const FORC_VALS = [5e-5, 1e-4, 1e-3];

  // species → pseudo mapping
  const species = useMemo(() => {
    if (!structure) return [];
    const seen = new Set();
    const order = [];
    for (const site of structure.sites) {
      const sym = site.species.symbol;
      if (!seen.has(sym)) {
        seen.add(sym);
        order.push(sym);
      }
    }
    return order;
  }, [structure]);

  const [pseudos, setPseudos] = useState({});

  // rebuild pseudos when species changes (fill defaults)
  const resolvedPseudos = useMemo(() => {
    const out = {};
    for (const sym of species) {
      out[sym] = pseudos[sym] ?? `${sym}.upf`;
    }
    return out;
  }, [species, pseudos]);

  // log-scale slider helpers
  const fmtSci = (v) =>
    v.toExponential(0).replace("e+", "e").replace("e-0", "e-");

  // generate QE input
  const content = useMemo(() => {
    if (!structure) return "";
    const kpoints =
      kmode === "grid"
        ? { grid: [kgrid[0], kgrid[1], kgrid[2]] }
        : { kspacing };
    return toPW(structure, {
      control: {
        calculation,
        pseudo_dir: pseudoDir,
        etot_conv_thr: ETOT_VALS[etotConvIdx],
        forc_conv_thr: FORC_VALS[forcConvIdx],
      },
      system: { ecutwfc },
      kpoints,
      pseudo: { pseudos: resolvedPseudos },
    });
  }, [
    structure,
    calculation,
    ecutwfc,
    kmode,
    kgrid,
    kspacing,
    etotConvIdx,
    forcConvIdx,
    pseudoDir,
    resolvedPseudos,
  ]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [content]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qe-input.in";
    a.click();
    URL.revokeObjectURL(url);
  }, [content]);

  const [copied, setCopied] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Generate Quantum ESPRESSO PW input file"
        className="buttonSimple blue"
      >
        QE Input
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="QE Input Generator"
        maxWidth="max-w-[1400px]"
        footer={
          <>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Download .in
            </button>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </>
        }
      >
        <div className="flex gap-4 min-h-[70vh]">
          {/* Left column — controls */}
          <div className="w-[625px] shrink-0 space-y-5 overflow-y-auto">
            {/* Calculation type */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Calculation</label>
              <select
                value={calculation}
                onChange={(e) => setCalculation(e.target.value)}
                className="text-xs border rounded px-2 py-1"
              >
                <option value="scf">scf</option>
                <option value="relax">relax</option>
                <option value="vc-relax">vc-relax</option>
                <option value="bands">bands</option>
                <option value="nscf">nscf</option>
              </select>
            </div>

            {/* ecutwfc */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">ecutwfc (Ry)</label>
              <input
                type="number"
                min={1}
                value={ecutwfc}
                onChange={(e) =>
                  setEcutwfc(Math.max(1, parseFloat(e.target.value) || 30))
                }
                className="text-xs border rounded px-2 py-1 w-24 font-mono"
              />
            </div>

            {/* Energy convergence threshold */}
            <div className="flex flex-col gap-3 pb-2">
              <span className="text-xs text-left">
                Energy convergence (Ry) {fmtSci(ETOT_VALS[etotConvIdx])}
              </span>
              <div className="flex items-center gap-3">
                <div className="flex-1 px-4 py-2">
                  <Slider
                    min={0}
                    max={2}
                    step={1}
                    value={etotConvIdx}
                    onChange={(v) => setEtotConvIdx(v)}
                    marks={{
                      0: {
                        label: (
                          <span className="text-gray-500 font-medium">
                            tight
                          </span>
                        ),
                        style: { color: "#6b7280" },
                      },
                      1: {
                        label: (
                          <span className="text-gray-500 font-medium">
                            normal
                          </span>
                        ),
                        style: { color: "#6b7280" },
                      },
                      2: {
                        label: (
                          <span className="text-gray-500 font-medium">
                            fast
                          </span>
                        ),
                        style: { color: "#6b7280" },
                      },
                    }}
                    styles={{ track: { background: "#2563eb" } }}
                  />
                </div>
              </div>
            </div>

            {/* Force convergence threshold */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-left">
                Force convergence (Ry/bohr) {fmtSci(FORC_VALS[forcConvIdx])}
              </span>
              <div className="flex items-center gap-3 pb-2">
                <div className="flex-1 px-4 py-2">
                  <Slider
                    min={0}
                    max={2}
                    step={1}
                    value={forcConvIdx}
                    onChange={(v) => setForcConvIdx(v)}
                    marks={{
                      0: {
                        label: (
                          <span className="text-gray-500 font-medium">
                            tight
                          </span>
                        ),
                        style: { color: "#6b7280" },
                      },
                      1: {
                        label: (
                          <span className="text-gray-500 font-medium">
                            normal
                          </span>
                        ),
                        style: { color: "#6b7280" },
                      },
                      2: {
                        label: (
                          <span className="text-gray-500 font-medium">
                            fast
                          </span>
                        ),
                        style: { color: "#6b7280" },
                      },
                    }}
                    styles={{ track: { background: "#2563eb" } }}
                  />
                </div>
              </div>
            </div>

            {/* K-points */}
            <div className="flex flex-col gap-1 pb-2">
              <label className="text-xs text-left pb-2">K-points</label>
              <div className="flex rounded-md border overflow-hidden text-xs">
                <button
                  onClick={() => setKmode("kspacing")}
                  className={`flex-1 py-1 ${
                    kmode === "kspacing"
                      ? "bg-blue-100 text-blue-700 font-medium"
                      : "bg-gray-50 text-gray-600"
                  }`}
                >
                  kspacing
                </button>
                <button
                  onClick={() => setKmode("grid")}
                  className={`flex-1 py-1 ${
                    kmode === "grid"
                      ? "bg-blue-100 text-blue-700 font-medium"
                      : "bg-gray-50 text-gray-600"
                  }`}
                >
                  grid
                </button>
              </div>
              {kmode === "kspacing" ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1 px-1 py-3">
                    <Slider
                      min={0.01}
                      max={0.5}
                      step={0.01}
                      value={kspacing}
                      onChange={(v) => setKspacing(v)}
                      marks={{
                        0.01: "0.01",
                        0.1: {
                          label: (
                            <span className="text-gray-500 font-medium">
                              tight
                            </span>
                          ),
                          style: { color: "#6b7280" },
                        },
                        0.15: {
                          label: (
                            <span className="text-gray-500 font-medium">
                              normal
                            </span>
                          ),
                          style: { color: "#6b7280" },
                        },
                        0.3: {
                          label: (
                            <span className="text-gray-500 font-medium">
                              loose
                            </span>
                          ),
                          style: { color: "#6b7280" },
                        },
                        0.5: "0.5",
                      }}
                      styles={{ track: { background: "#2563eb" } }}
                    />
                  </div>
                  <span className="text-xs font-mono w-10 text-right">
                    {kspacing.toFixed(2)}
                  </span>
                </div>
              ) : (
                <div className="flex gap-2">
                  {["h", "k", "l"].map((axis, i) => (
                    <div key={axis} className="flex flex-col items-center">
                      <input
                        type="number"
                        min={1}
                        value={kgrid[i]}
                        onChange={(e) => {
                          const next = [...kgrid];
                          next[i] = Math.max(1, parseInt(e.target.value) || 1);
                          setKgrid(next);
                        }}
                        className="w-14 px-2 py-1 text-xs border rounded font-mono text-center"
                      />
                      <span className="text-[10px] text-gray-500">{axis}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pseudopotentials */}
            <div className="flex flex-col gap-1">
              <div className="flex flex-col gap-1.5 px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 shrink-0">
                    Pseudopotential directory:
                  </span>
                  <input
                    value={pseudoDir}
                    onChange={(e) => setPseudoDir(e.target.value)}
                    className="flex-1 text-xs border rounded px-2 py-1 font-mono"
                  />
                </div>
                <div className="border rounded divide-y text-xs">
                  <div className="flex px-2 py-1 font-medium text-gray-500">
                    <span className="flex-1">Species</span>
                    <span className="flex-1">Pseudo file</span>
                  </div>
                  {species.map((sym) => (
                    <div key={sym} className="flex items-center px-2 py-1">
                      <span className="flex-1 font-mono">{sym}</span>
                      <input
                        value={resolvedPseudos[sym]}
                        onChange={(e) =>
                          setPseudos((prev) => ({
                            ...prev,
                            [sym]: e.target.value,
                          }))
                        }
                        className="flex-1 text-xs border rounded px-2 py-0.5 font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right column — output */}
          <div className="flex-1 flex flex-col min-w-0">
            <label className="text-xs font-medium text-gray-600 mb-1">
              Generated input
            </label>
            <textarea
              readOnly
              value={content}
              className="flex-1 text-[11px] font-mono border rounded p-2 bg-gray-50 resize-none select-all"
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
