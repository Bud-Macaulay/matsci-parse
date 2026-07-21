import { useState, useRef, useCallback } from "react";
import { cartesian, fractional } from "matsci-parse";

import createMlip from "@peterspackman/mlip.js";
import cpuWasmUrl from "@peterspackman/mlip.js/cpu-wasm?url";

const MODEL_URL = `${import.meta.env.BASE_URL}models/pet-mad-xs.gguf`;
const MAX_RELAX_STEPS = 100;
const FORCE_CONVERGENCE = 0.05;

const yieldToEventLoop = () => new Promise((r) => setTimeout(r, 0));

let mlipInitPromise = null;

function getMlipModule() {
  if (mlipInitPromise) return mlipInitPromise;
  mlipInitPromise = (async () => {
    return createMlip({ cpuWasmUrl });
  })();
  return mlipInitPromise;
}

function detectGpu() {
  if (typeof navigator === "undefined") return "available";
  if (!("gpu" in navigator)) return "unavailable";
  const ua = navigator.userAgent;
  if (/Firefox/i.test(ua)) return "unreliable";
  const isSafari = /Safari/i.test(ua) && !/Chrome|Chromium|Android/i.test(ua);
  if (isSafari) return "unreliable";
  return "available";
}

function relaxedStructure(structure, cartPos) {
  const lattice = structure.lattice;
  const newSites = structure.sites.map((site, i) => {
    const cp = [cartPos[i * 3], cartPos[i * 3 + 1], cartPos[i * 3 + 2]];
    const f = fractional(lattice, cp);
    return { ...site, frac: [f[0], f[1], f[2]] };
  });
  return { ...structure, sites: newSites };
}

function buildAtomicSystem(Module, structure, pos) {
  const atomicNumbers = new Int32Array(
    structure.sites.map((s) => ELEMENT_BY_SYMBOL[s.species.symbol] ?? 0),
  );
  const cell = new Float64Array(structure.lattice.basis.data);
  return Module.AtomicSystem.create(pos, atomicNumbers, cell, true);
}

export default function MLIPPanel({ structure, setStructure, pushUndo }) {
  const [status, setStatus] = useState("idle");
  const [modelInfo, setModelInfo] = useState(null);
  const [error, setError] = useState("");
  const [predictResult, setPredictResult] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [relaxing, setRelaxing] = useState(false);
  const [relaxProgress, setRelaxProgress] = useState(null);
  const modelRef = useRef(null);
  const cancelRef = useRef(false);
  const gpuStatus = detectGpu();

  const loadModelFromBuffer = useCallback(async (buffer, source) => {
    setStatus("loading");
    setError("");
    try {
      const Module = await getMlipModule();
      const model = Module.Model.loadFromBuffer(buffer);
      modelRef.current = model;
      setModelInfo({
        source,
        type: model.modelType(),
        cutoff: model.cutoff(),
      });
      setStatus("ready");
      setPredictResult(null);
    } catch (err) {
      setError(err?.message ?? String(err));
      setStatus("error");
    }
  }, []);

  const loadBundledModel = useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      const res = await fetch(MODEL_URL, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      const magic = new Uint8Array(buf, 0, 4);
      const isGguf =
        magic[0] === 0x47 &&
        magic[1] === 0x47 &&
        magic[2] === 0x55 &&
        magic[3] === 0x46;
      if (!isGguf) {
        throw new Error("Fetched file is not a valid GGUF model");
      }
      await loadModelFromBuffer(buf, "pet-mad-xs.gguf");
    } catch (err) {
      setError(`Failed to load bundled model: ${err?.message ?? err}`);
      setStatus("error");
    }
  }, [loadModelFromBuffer]);

  const handleFileDrop = useCallback(
    async (file) => {
      if (!/\.gguf$/i.test(file.name)) {
        setError("Model file must have .gguf extension");
        setStatus("error");
        return;
      }
      const buf = await file.arrayBuffer();
      await loadModelFromBuffer(buf, file.name);
    },
    [loadModelFromBuffer],
  );

  const handleCalculate = useCallback(async () => {
    if (!modelRef.current || !structure) return;
    setPredicting(true);
    setPredictResult(null);
    try {
      const Module = await getMlipModule();
      const nAtoms = structure.sites.length;
      const pos = new Float64Array(nAtoms * 3);
      for (let i = 0; i < nAtoms; i++) {
        const c = cartesian(structure.lattice, structure.sites[i]);
        pos[i * 3] = c[0];
        pos[i * 3 + 1] = c[1];
        pos[i * 3 + 2] = c[2];
      }

      const system = buildAtomicSystem(Module, structure, pos);

      const t0 = performance.now();
      const result = modelRef.current.predict(system);
      const dt = performance.now() - t0;

      setPredictResult({
        energy: result.energy,
        forces: result.forces ? Array.from(result.forces) : null,
        stress: result.stress ? Array.from(result.stress) : null,
        timing: dt,
        numAtoms: nAtoms,
      });
    } catch (err) {
      setError(`Prediction failed: ${err?.message ?? err}`);
    } finally {
      setPredicting(false);
    }
  }, [structure]);

  const handleRelax = useCallback(async () => {
    if (!modelRef.current || !structure) return;
    cancelRef.current = false;
    setRelaxing(true);
    setRelaxProgress(null);
    setPredictResult(null);
    setError("");

    try {
      const Module = await getMlipModule();
      const model = modelRef.current;
      const nAtoms = structure.sites.length;
      const n3 = nAtoms * 3;

      const pos = new Float64Array(n3);
      for (let i = 0; i < nAtoms; i++) {
        const c = cartesian(structure.lattice, structure.sites[i]);
        pos[i * 3] = c[0];
        pos[i * 3 + 1] = c[1];
        pos[i * 3 + 2] = c[2];
      }

      for (let step = 0; step < MAX_RELAX_STEPS; step++) {
        if (step % 5 === 0) {
          await yieldToEventLoop();
          if (cancelRef.current) break;
        }

        const system = buildAtomicSystem(Module, structure, pos);
        const result = model.predict(system);
        const forces = result.forces;
        const energy = result.energy;

        let maxForce = 0;
        for (let i = 0; i < forces.length; i++) {
          const af = Math.abs(forces[i]);
          if (af > maxForce) maxForce = af;
        }

        setRelaxProgress({ step, energy, maxForce });

        if (maxForce < FORCE_CONVERGENCE) {
          const newStruct = relaxedStructure(structure, pos);
          pushUndo({
            action: "mlip-relax",
            label: `Relaxed (${step + 1} steps, ${energy.toFixed(2)} eV)`,
          });
          setStructure(newStruct);
          setRelaxProgress(null);
          return;
        }

        let fNorm = 0;
        for (let i = 0; i < n3; i++) fNorm += forces[i] * forces[i];
        fNorm = Math.sqrt(fNorm);
        if (fNorm < 1e-10) break;

        const stepSize = Math.min(0.05, 0.01 * FORCE_CONVERGENCE / maxForce);
        for (let i = 0; i < n3; i++) {
          pos[i] += stepSize * forces[i];
        }
      }

      const system = buildAtomicSystem(Module, structure, pos);
      const finalResult = model.predict(system);
      const newStruct = relaxedStructure(structure, pos);
      pushUndo({
        action: "mlip-relax",
        label: `Relaxed (${MAX_RELAX_STEPS} steps, ${finalResult.energy.toFixed(2)} eV)`,
      });
      setStructure(newStruct);
    } catch (err) {
      setError(`Relaxation failed: ${err?.message ?? err}`);
    } finally {
      setRelaxing(false);
      setRelaxProgress(null);
    }
  }, [structure, pushUndo, setStructure]);

  const handleCancelRelax = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const busy = predicting || relaxing;

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg border border-gray-200 bg-white">
      <h3 className="text-[0.7rem] font-semibold text-gray-500 uppercase tracking-wider">
        MLIP Calculator
      </h3>

      {/* Model status */}
      {status === "ready" && modelInfo ? (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-green-50 border border-green-200 text-sm">
          <span className="text-green-600 font-bold">&#10003;</span>
          <div className="flex-1 min-w-0 leading-tight">
            <div className="font-semibold truncate">{modelInfo.source}</div>
            <div className="text-xs text-gray-500">{modelInfo.type}</div>
          </div>
          <button
            onClick={() => {
              modelRef.current = null;
              setStatus("idle");
              setModelInfo(null);
              setPredictResult(null);
            }}
            className="text-xs text-gray-400 underline hover:text-gray-700 shrink-0"
          >
            change
          </button>
        </div>
      ) : status === "loading" ? (
        <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-500">
          <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          <span>Loading model&#8230;</span>
        </div>
      ) : status === "error" ? (
        <div className="flex items-start gap-2 px-2 py-1.5 rounded-md bg-red-50 border border-red-200 text-sm">
          <span className="text-red-500 font-bold shrink-0">!</span>
          <span className="text-red-800">{error}</span>
        </div>
      ) : (
        <p className="text-xs text-gray-500 leading-relaxed">
          Load a machine-learning potential to compute energies and forces.
        </p>
      )}

      {status !== "ready" && (
        <>
          <button
            onClick={loadBundledModel}
            disabled={status === "loading"}
            className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-amber-500 text-white text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-base leading-none">&#11015;</span>
            <span className="flex flex-col leading-tight">
              <span>Use bundled model</span>
              <span className="text-[0.65rem] font-normal opacity-75">
                PET-MAD xs &#183; ~16 MB
              </span>
            </span>
          </button>

          <div className="flex items-center gap-2 text-[0.6rem] text-gray-400 uppercase tracking-wide">
            <div className="flex-1 h-px bg-gray-200" />
            <span>or load your own</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <ModelDropZone
            onFile={handleFileDrop}
            disabled={status === "loading"}
          />
        </>
      )}

      {/* Backend / GPU info */}
      <div className="text-xs text-gray-500">
        <span>Backend: </span>
        <span className="font-mono">
          {gpuStatus === "available" ? "CPU (WASM)" : "CPU"}
        </span>
      </div>

      {(gpuStatus === "unavailable" || gpuStatus === "unreliable") && (
        <p className="text-[0.65rem] text-gray-400 px-2 py-1 rounded bg-amber-50 border border-amber-200 leading-relaxed">
          WebGPU{" "}
          {gpuStatus === "unreliable"
            ? "is unreliable in this browser"
            : "not available"}{" "}
          &#8212; using CPU. For GPU acceleration, use Chrome or Edge.
        </p>
      )}

      {/* Divider */}
      <div className="h-px bg-gray-200" />

      {/* Action buttons row */}
      <div className="flex gap-2">
        <button
          onClick={handleCalculate}
          disabled={status !== "ready" || busy || !structure}
          className="flex-1 px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {predicting ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Calculating&#8230;
            </span>
          ) : (
            "Calculate"
          )}
        </button>

        <button
          onClick={relaxing ? handleCancelRelax : handleRelax}
          disabled={status !== "ready" || predicting || !structure}
          className="flex-1 px-3 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {relaxing ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Cancel
            </span>
          ) : (
            "Relax"
          )}
        </button>
      </div>

      {/* Relaxation progress */}
      {relaxing && relaxProgress && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-mono">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 border-2 border-emerald-400 border-t-emerald-700 rounded-full animate-spin" />
            <span className="font-semibold text-emerald-800">Relaxing&#8230;</span>
            <span className="text-emerald-600 ml-auto">
              Step {relaxProgress.step + 1}/{MAX_RELAX_STEPS}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-emerald-700">
            <span>Energy</span>
            <span className="text-right">
              {relaxProgress.energy?.toFixed(4) ?? "&#8212;"} eV
            </span>
            <span>Max |F|</span>
            <span className="text-right">
              {relaxProgress.maxForce?.toFixed(4) ?? "&#8212;"} eV/&#197;
            </span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !status.includes("error") && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {predictResult && (
        <div className="rounded-md border border-gray-200 bg-gray-50 overflow-hidden">
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 px-3 py-2 text-sm font-mono">
            <span className="text-gray-500 text-[0.7rem] font-sans">
              Energy
            </span>
            <span className="text-right tabular-nums font-semibold">
              {predictResult.energy.toFixed(4)} eV
            </span>
            {predictResult.stress && (
              <>
                <span className="text-gray-500 text-[0.7rem] font-sans">
                  Stress
                </span>
                <span className="text-right tabular-nums text-xs leading-relaxed">
                  [{predictResult.stress.map((v) => v.toFixed(3)).join(", ")}]{" "}
                  <span className="font-sans">eV/&#197;&#179;</span>
                </span>
              </>
            )}
            <span className="text-gray-500 text-[0.7rem] font-sans">Speed</span>
            <span className="text-right tabular-nums text-xs">
              {predictResult.timing.toFixed(1)} ms
            </span>
          </div>

          {predictResult.forces && (
            <div className="border-t border-gray-200">
              <div className="px-3 py-1 text-[0.6rem] font-semibold text-gray-500 uppercase tracking-wider">
                Forces (eV/&#197;)
              </div>
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-gray-400 text-[0.55rem] uppercase tracking-wider">
                    <th className="px-3 py-1 text-left">Atom</th>
                    <th className="px-2 py-1 text-right">Fx</th>
                    <th className="px-2 py-1 text-right">Fy</th>
                    <th className="px-2 py-1 text-right">Fz</th>
                  </tr>
                </thead>
                <tbody>
                  {structure.sites.map((site, i) => (
                    <tr
                      key={i}
                      className="border-t border-gray-100 hover:bg-gray-100"
                    >
                      <td className="px-3 py-1 text-gray-400">
                        {site.species.symbol}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums">
                        {predictResult.forces[i * 3].toFixed(4)}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums">
                        {predictResult.forces[i * 3 + 1].toFixed(4)}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums">
                        {predictResult.forces[i * 3 + 2].toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ModelDropZone({ onFile, disabled }) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) onFile(f);
  };

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 px-3 py-2 rounded-md border-2 border-dashed text-xs transition-colors cursor-copy ${
        dragging
          ? "border-green-500 bg-green-50 text-green-600"
          : "border-gray-300 text-gray-400"
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <span>
        Drop a{" "}
        <code className="px-1 rounded bg-gray-100 text-[0.65rem]">.gguf</code>{" "}
        file
      </span>
      <label className="underline cursor-pointer hover:text-gray-600">
        or browse&#8230;
        <input
          type="file"
          accept=".gguf"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}

const ELEMENT_BY_SYMBOL = {
  H: 1,
  He: 2,
  Li: 3,
  Be: 4,
  B: 5,
  C: 6,
  N: 7,
  O: 8,
  F: 9,
  Ne: 10,
  Na: 11,
  Mg: 12,
  Al: 13,
  Si: 14,
  P: 15,
  S: 16,
  Cl: 17,
  Ar: 18,
  K: 19,
  Ca: 20,
  Sc: 21,
  Ti: 22,
  V: 23,
  Cr: 24,
  Mn: 25,
  Fe: 26,
  Co: 27,
  Ni: 28,
  Cu: 29,
  Zn: 30,
  Ga: 31,
  Ge: 32,
  As: 33,
  Se: 34,
  Br: 35,
  Kr: 36,
  Rb: 37,
  Sr: 38,
  Y: 39,
  Zr: 40,
  Nb: 41,
  Mo: 42,
  Tc: 43,
  Ru: 44,
  Rh: 45,
  Pd: 46,
  Ag: 47,
  Cd: 48,
  In: 49,
  Sn: 50,
  Sb: 51,
  Te: 52,
  I: 53,
  Xe: 54,
  Cs: 55,
  Ba: 56,
  La: 57,
  Ce: 58,
  Pr: 59,
  Nd: 60,
  Pm: 61,
  Sm: 62,
  Eu: 63,
  Gd: 64,
  Tb: 65,
  Dy: 66,
  Ho: 67,
  Er: 68,
  Tm: 69,
  Yb: 70,
  Lu: 71,
  Hf: 72,
  Ta: 73,
  W: 74,
  Re: 75,
  Os: 76,
  Ir: 77,
  Pt: 78,
  Au: 79,
  Hg: 80,
  Tl: 81,
  Pb: 82,
  Bi: 83,
  Po: 84,
  At: 85,
  Rn: 86,
  Fr: 87,
  Ra: 88,
  Ac: 89,
  Th: 90,
  Pa: 91,
  U: 92,
  Np: 93,
  Pu: 94,
  Am: 95,
  Cm: 96,
  Bk: 97,
  Cf: 98,
  Es: 99,
  Fm: 100,
  Md: 101,
  No: 102,
  Lr: 103,
};
