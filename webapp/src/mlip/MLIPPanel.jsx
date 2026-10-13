import { useState, useRef, useCallback, useEffect } from "react";
import {
  cartesian,
  createFIRE,
  createLBFGS,
  createCG,
  volume,
} from "matsci-parse";

import {
  getSharedWorker,
  peekSharedWorker,
  noteModelLoaded,
  buildSystemArrays,
} from "./sharedWorker";

const MODEL_URL = `${import.meta.env.BASE_URL}models/pet-mad-xs.gguf`;

const LOCAL_OPTIMIZERS = {
  lbfgs: { label: "L-BFGS", create: createLBFGS },
  cg: { label: "CG", create: createCG },
  fire: { label: "FIRE", create: createFIRE },
};

export default function MLIPPanel({ structure, setStructure, pushUndo }) {
  const [status, setStatus] = useState("idle");
  const [modelInfo, setModelInfo] = useState(null);
  const [error, setError] = useState("");
  const [predictResult, setPredictResult] = useState(null);
  const [relaxing, setRelaxing] = useState(false);
  const [relaxProgress, setRelaxProgress] = useState(null);
  const [maxSteps, setMaxSteps] = useState(100);
  const [forceThreshold, setForceThreshold] = useState(0.05);
  const [maxStep, setMaxStep] = useState(0.2);
  const [relaxCell, setRelaxCell] = useState(false);
  const [stressThreshold, setStressThreshold] = useState(0.01);
  const [cellStrain, setCellStrain] = useState(0.02);
  const [localOpt, setLocalOpt] = useState("lbfgs");
  const cancelRef = useRef(false);

  // Stop a running relaxation when the panel unmounts (modal closed);
  // otherwise the loop keeps rewriting the structure with no way to cancel.
  useEffect(() => {
    return () => {
      cancelRef.current = true;
    };
  }, []);

  const loadModelFromBuffer = useCallback(
    async (buffer, source) => {
      setStatus("loading");
      setError("");
      try {
        const client = await getSharedWorker();
        const info = await client.loadModel(buffer);
        const model = { source, type: info.modelType, cutoff: info.cutoff };
        setModelInfo(model);
        noteModelLoaded(model);
        setStatus("ready");
        setPredictResult(null);
      } catch (err) {
        setError(err?.message ?? String(err));
        setStatus("error");
      }
    },
    [],
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

  const handleCancelRelax = useCallback(() => {
    cancelRef.current = true;
    peekSharedWorker()?.stop();
  }, []);

  /** Relax with a local optimizer (lib/core/structure/optimize),
   * driven by MLIP forces. Updates the structure live so the trajectory
   * is visible in the visualizer. Positions-only. */
  const handleFireRelax = useCallback(async () => {
    if (!structure) return;
    setRelaxing(true);
    setRelaxProgress(null);
    setPredictResult(null);
    setError("");
    cancelRef.current = false;

    try {
      const client = await getSharedWorker();
      const sys = buildSystemArrays(structure);
      await client.setSystem({
        ...sys,
        periodic: true,
      });

      const fire = LOCAL_OPTIMIZERS[localOpt].create({
        fmax: forceThreshold,
        maxStep,
        smax: stressThreshold,
        maxCellStrain: cellStrain,
      });
      const optLabel = LOCAL_OPTIMIZERS[localOpt].label;
      let current = structure;
      let steps = 0;
      let energy = null;
      let maxForce = null;
      let converged = false;

      const cartPositions = (struct) => {
        const pos = new Float64Array(struct.sites.length * 3);
        for (let i = 0; i < struct.sites.length; i++) {
          const c = cartesian(struct.lattice, struct.sites[i]);
          pos[i * 3] = c[0];
          pos[i * 3 + 1] = c[1];
          pos[i * 3 + 2] = c[2];
        }
        return pos;
      };

      while (steps < maxSteps && !cancelRef.current) {
        let forces;
        let stress;
        if (relaxCell) {
          // Cell moves too: push positions+cell, then predict in place.
          // The worker has no per-step cell arg, so this costs an extra
          // round trip per step — fine for a playground.
          const sys = buildSystemArrays(current);
          await client.setSystem({ ...sys, periodic: true });
          const pred = await client.predict();
          energy = pred.energy;
          forces = pred.forces;
          stress = pred.stress ?? undefined;
        } else {
          // Predict at the CURRENT positions — the worker holds the initial
          // geometry from setSystem, so it must be told where we are.
          const pred = await client.predict(cartPositions(current));
          energy = pred.energy;
          forces = pred.forces;
          stress = undefined;
        }
        maxForce = 0;
        for (let i = 0; i < forces.length; i++) {
          const a = Math.abs(forces[i]);
          if (a > maxForce) maxForce = a;
        }
        const out = fire.step(current, forces, stress);
        if (steps === 0) {
          // Snapshot the pre-relax structure before the first live update,
          // so undo (also after a cancel) restores the starting geometry.
          pushUndo({
            action: "fire-relax",
            label: `${optLabel}${relaxCell ? "+cell" : ""} relax`,
          });
        }
        current = out.structure;
        steps += 1;
        converged = out.converged;
        setStructure(current);
        setRelaxProgress({
          step: steps,
          energy,
          maxForce,
          maxStress: out.maxStress,
          volume: volume(current),
        });
        if (converged) break;
      }

      if (cancelRef.current) return;

      // The loop's last prediction was at the pre-step geometry; evaluate the
      // final structure so the displayed energy/forces/stress match it.
      const finalSys = buildSystemArrays(current);
      await client.setSystem({ ...finalSys, periodic: true });
      const t0 = performance.now();
      const final = await client.predict();
      const timing = performance.now() - t0;
      setPredictResult({
        energy: final.energy,
        forces: final.forces ? Array.from(final.forces) : null,
        stress: final.stress ? Array.from(final.stress) : null,
        timing,
        numAtoms: current.sites.length,
      });
    } catch (err) {
      setError(`Local relaxation failed: ${err?.message ?? err}`);
    } finally {
      setRelaxing(false);
      setRelaxProgress(null);
    }
  }, [
    structure,
    pushUndo,
    setStructure,
    maxSteps,
    forceThreshold,
    maxStep,
    localOpt,
    relaxCell,
    stressThreshold,
    cellStrain,
  ]);

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
              setStatus("idle");
              setModelInfo(null);
              noteModelLoaded(null);
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
      <div className="flex gap-2">
        <select
          value={localOpt}
          onChange={(e) => setLocalOpt(e.target.value)}
          disabled={relaxing}
          title="Local optimizer (live trajectory)"
          className="px-2 py-2 rounded-md border border-gray-300 text-sm font-semibold text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-50"
        >
          {Object.entries(LOCAL_OPTIMIZERS).map(([key, { label }]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <button
          onClick={relaxing ? handleCancelRelax : handleFireRelax}
          disabled={status !== "ready" || !structure}
          title="Relax with the local optimizer (live trajectory)"
          className="flex-1 px-3 py-2 rounded-md bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {relaxing ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Cancel
            </span>
          ) : (
            `Relax (${LOCAL_OPTIMIZERS[localOpt].label})`
          )}
        </button>
      </div>
      {/* Relaxation parameters */}
      {status === "ready" && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
          <label htmlFor="mlip-max-steps" className="shrink-0">
            Max steps:
          </label>
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
          <label htmlFor="mlip-force-thresh" className="shrink-0">
            Convergence:
          </label>
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
          <span className="text-gray-400">|</span>
          <label htmlFor="mlip-max-step" className="shrink-0">
            Max step:
          </label>
          <input
            id="mlip-max-step"
            type="number"
            min={0.01}
            max={2}
            step={0.05}
            value={maxStep}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v > 0) setMaxStep(v);
            }}
            disabled={relaxing}
            className="w-20 px-2 py-0.5 rounded border border-gray-300 text-xs font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
          />
          <span className="text-gray-400">&#197;</span>
          <span className="text-gray-400">|</span>
          <label
            htmlFor="mlip-relax-cell"
            className="shrink-0 flex items-center gap-1"
          >
            <input
              id="mlip-relax-cell"
              type="checkbox"
              checked={relaxCell}
              onChange={(e) => setRelaxCell(e.target.checked)}
              disabled={true}
              title="Disabled: this model build does not return stress"
              className="accent-teal-600"
            />
            Cell (not implemented yet)
          </label>
        </div>
      )}
      {status === "ready" && relaxCell && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
          <label htmlFor="mlip-stress-thresh" className="shrink-0">
            Stress tol:
          </label>
          <input
            id="mlip-stress-thresh"
            type="number"
            min={0.0001}
            max={10}
            step={0.005}
            value={stressThreshold}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v > 0) setStressThreshold(v);
            }}
            disabled={relaxing}
            className="w-20 px-2 py-0.5 rounded border border-gray-300 text-xs font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
          />
          <span className="text-gray-400">eV/&#197;&#179;</span>
          <span className="text-gray-400">|</span>
          <label htmlFor="mlip-cell-strain" className="shrink-0">
            Strain cap:
          </label>
          <input
            id="mlip-cell-strain"
            type="number"
            min={0.001}
            max={0.5}
            step={0.005}
            value={cellStrain}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v > 0) setCellStrain(v);
            }}
            disabled={relaxing}
            className="w-20 px-2 py-0.5 rounded border border-gray-300 text-xs font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
          />
        </div>
      )}

      {/* Relaxation progress */}
      {relaxing && relaxProgress && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-mono">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 border-2 border-emerald-400 border-t-emerald-700 rounded-full animate-spin" />
            <span className="font-semibold text-emerald-800">
              Relaxing&#8230;
            </span>
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
            {relaxProgress.maxStress != null && (
              <>
                <span>Max |σ|</span>
                <span className="text-right">
                  {relaxProgress.maxStress.toExponential(2)} eV/&#197;&#179;
                </span>
              </>
            )}
            {relaxProgress.volume != null && (
              <>
                <span>Volume</span>
                <span className="text-right">
                  {relaxProgress.volume.toFixed(3)} &#197;&#179;
                </span>
              </>
            )}
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
