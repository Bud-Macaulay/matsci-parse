import { useState, useRef, useCallback, useEffect } from "react";
import { cartesian, fractional } from "matsci-parse";

import { ELEMENT_BY_SYMBOL, massForZ } from "./elements";
import { createMlipWorker } from "./mlipWorkerClient";

const MODEL_URL = `${import.meta.env.BASE_URL}models/pet-mad-xs.gguf`;

function relaxedStructure(structure, cartPos) {
  const lattice = structure.lattice;
  const newSites = structure.sites.map((site, i) => {
    const cp = [cartPos[i * 3], cartPos[i * 3 + 1], cartPos[i * 3 + 2]];
    const f = fractional(lattice, cp);
    return { ...site, frac: [f[0], f[1], f[2]] };
  });
  return { ...structure, sites: newSites };
}

export default function MLIPPanel({ structure, setStructure, pushUndo }) {
  const [status, setStatus] = useState("idle");
  const [modelInfo, setModelInfo] = useState(null);
  const [error, setError] = useState("");
  const [predictResult, setPredictResult] = useState(null);
  const [relaxing, setRelaxing] = useState(false);
  const [relaxProgress, setRelaxProgress] = useState(null);
  const [maxSteps, setMaxSteps] = useState(100);
  const [forceThreshold, setForceThreshold] = useState(0.05);
  const workerRef = useRef(null);
  const structureRef = useRef(structure);

  // Keep structure ref in sync
  useEffect(() => {
    structureRef.current = structure;
  }, [structure]);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.destroy();
        workerRef.current = null;
      }
    };
  }, []);

  const getWorker = useCallback(async () => {
    if (workerRef.current?.isReady) return workerRef.current;
    const client = createMlipWorker();
    await client.init();
    workerRef.current = client;
    return client;
  }, []);

  const loadModelFromBuffer = useCallback(
    async (buffer, source) => {
      setStatus("loading");
      setError("");
      try {
        const client = await getWorker();
        const info = await client.loadModel(buffer);
        setModelInfo({ source, type: info.modelType, cutoff: info.cutoff });
        setStatus("ready");
        setPredictResult(null);
      } catch (err) {
        setError(err?.message ?? String(err));
        setStatus("error");
      }
    },
    [getWorker],
  );

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

  /** Build typed arrays from the current structure (no WASM calls). */
  const buildSystemArrays = useCallback((struct) => {
    const nAtoms = struct.sites.length;
    const pos = new Float64Array(nAtoms * 3);
    const atomicNums = new Int32Array(nAtoms);
    const massArr = new Float64Array(nAtoms);
    for (let i = 0; i < nAtoms; i++) {
      const c = cartesian(struct.lattice, struct.sites[i]);
      pos[i * 3] = c[0];
      pos[i * 3 + 1] = c[1];
      pos[i * 3 + 2] = c[2];
      const sym = struct.sites[i].species.symbol;
      const z = ELEMENT_BY_SYMBOL[sym] ?? 0;
      atomicNums[i] = z;
      massArr[i] = massForZ(z);
    }
    const cell = new Float64Array(struct.lattice.basis.data);
    return { positions: pos, atomicNumbers: atomicNums, cell, masses: massArr };
  }, []);

  const handleRelax = useCallback(async () => {
    if (!structure) return;
    setRelaxing(true);
    setRelaxProgress(null);
    setPredictResult(null);
    setError("");

    try {
      const client = await getWorker();
      const sys = buildSystemArrays(structure);
      await client.setSystem({
        ...sys,
        periodic: true,
      });

      const t0 = performance.now();
      const result = await client.startRelax(
        { maxSteps, forceThreshold },
        (stepMsg) => {
          setRelaxProgress({
            step: stepMsg.step,
            energy: stepMsg.energy,
            maxForce: stepMsg.maxForce,
          });
        },
      );
      const dt = performance.now() - t0;

      // Apply the relaxed structure
      const newStruct = relaxedStructure(structure, result.positions);
      pushUndo({
        action: "mlip-relax",
        label: `Relaxed (${result.steps} steps, ${result.energy.toFixed(2)} eV)`,
      });
      setStructure(newStruct);
      setRelaxProgress(null);

      // Get forces on the relaxed structure for display
      const relaxedSys = buildSystemArrays(newStruct);
      await client.setSystem({ ...relaxedSys, periodic: true });
      const finalResult = await client.predict();
      setPredictResult({
        energy: finalResult.energy,
        forces: finalResult.forces ? Array.from(finalResult.forces) : null,
        stress: finalResult.stress ? Array.from(finalResult.stress) : null,
        timing: dt,
        numAtoms: newStruct.sites.length,
      });
    } catch (err) {
      setError(`Relaxation failed: ${err?.message ?? err}`);
    } finally {
      setRelaxing(false);
      setRelaxProgress(null);
    }
  }, [structure, pushUndo, setStructure, getWorker, buildSystemArrays, maxSteps, forceThreshold]);

  const handleCancelRelax = useCallback(() => {
    if (workerRef.current) workerRef.current.stop();
  }, []);

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
              if (workerRef.current) {
                workerRef.current.destroy();
                workerRef.current = null;
              }
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
        <span className="font-mono">CPU (WASM in Worker)</span>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-200" />

      {/* Action buttons */}
      <button
        onClick={relaxing ? handleCancelRelax : handleRelax}
        disabled={status !== "ready" || relaxing || !structure}
        className="w-full px-3 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

      {/* Relaxation parameters */}
      {status === "ready" && (
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <label htmlFor="mlip-max-steps" className="shrink-0">Max steps:</label>
          <input
            id="mlip-max-steps"
            type="number"
            min={1}
            max={10000}
            value={maxSteps}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v > 0) setMaxSteps(v);
            }}
            disabled={relaxing}
            className="w-20 px-2 py-0.5 rounded border border-gray-300 text-xs font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
          />
          <span className="text-gray-400">|</span>
          <label htmlFor="mlip-force-thresh" className="shrink-0">Convergence:</label>
          <input
            id="mlip-force-thresh"
            type="number"
            min={0.001}
            max={10}
            step={0.01}
            value={forceThreshold}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v > 0) setForceThreshold(v);
            }}
            disabled={relaxing}
            className="w-20 px-2 py-0.5 rounded border border-gray-300 text-xs font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
          />
          <span className="text-gray-400">eV/&#197;</span>
        </div>
      )}

      {/* Relaxation progress */}
      {relaxing && relaxProgress && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-mono">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 border-2 border-emerald-400 border-t-emerald-700 rounded-full animate-spin" />
            <span className="font-semibold text-emerald-800">Relaxing&#8230;</span>
            <span className="text-emerald-600 ml-auto">
              Step {relaxProgress.step}/{maxSteps}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-emerald-700">
            <span>Energy</span>
            <span className="text-right">
              {relaxProgress.energy?.toFixed(4) ?? "\u2014"} eV
            </span>
            <span>Max |F|</span>
            <span className="text-right">
              {relaxProgress.maxForce?.toFixed(4) ?? "\u2014"} eV/&#197;
            </span>
          </div>
        </div>
      )}

      {/* Error (runtime errors not tied to status) */}
      {error && status !== "error" && (
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
                  [
                  {predictResult.stress
                    .map((v) => v.toFixed(3))
                    .join(", ")}]{" "}
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
