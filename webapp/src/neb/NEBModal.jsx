import { useRef, useState, useEffect } from "react";
import {
  cartesian,
  createFIRE,
  createLBFGS,
  createCG,
  createNEB,
  interpolateBand,
} from "matsci-parse";
import Modal from "../common/Modal";
import AtomTable from "../MainPanel/AtomTable";
import {
  getSharedWorker,
  buildSystemArrays,
  useSharedModel,
} from "../mlip/sharedWorker";

const NEB_OPTIMIZERS = {
  fire: { label: "FIRE", create: createFIRE },
  lbfgs: { label: "L-BFGS", create: createLBFGS },
  cg: { label: "CG", create: createCG },
};

function cloneStructure(s) {
  return {
    ...s,
    sites: s.sites.map((site) => ({
      ...site,
      frac: Float64Array.from(site.frac),
    })),
  };
}

function cartPositions(struct) {
  const pos = new Float64Array(struct.sites.length * 3);
  for (let i = 0; i < struct.sites.length; i++) {
    const c = cartesian(struct.lattice, struct.sites[i]);
    pos[i * 3] = c[0];
    pos[i * 3 + 1] = c[1];
    pos[i * 3 + 2] = c[2];
  }
  return pos;
}

/** Calculator seam: anything returning { energies, forcesList } plugs in.
 * MLIP-backed for now (fixed cell: one setSystem, positions per image). */
async function calcBandMlip(client, images) {
  const sys = buildSystemArrays(images[0]);
  await client.setSystem({ ...sys, periodic: true });
  const energies = [];
  const forcesList = [];
  for (const img of images) {
    const pred = await client.predict(cartPositions(img));
    energies.push(pred.energy);
    forcesList.push(pred.forces);
  }
  return { energies, forcesList };
}

export default function NEBModal({
  open,
  onClose,
  structure,
  pushUndo,
  setStructure,
}) {
  const sharedModel = useSharedModel();
  const modelReady = sharedModel != null;
  const [endA, setEndA] = useState(() => structure && cloneStructure(structure));
  const [endB, setEndB] = useState(() => structure && cloneStructure(structure));
  const [nImages, setNImages] = useState(7);
  const [springK, setSpringK] = useState(0.1);
  const [fmax, setFmax] = useState(0.05);
  const [optKey, setOptKey] = useState("fire");
  const [maxSteps, setMaxSteps] = useState(100);
  const [running, setRunning] = useState(false);
  const [band, setBand] = useState(null);
  const [energies, setEnergies] = useState(null);
  const [prog, setProg] = useState(null);
  const [converged, setConverged] = useState(false);
  const [error, setError] = useState("");
  const cancelRef = useRef(false);

  // Cancel any run if the modal unmounts mid-relaxation.
  useEffect(() => {
    return () => {
      cancelRef.current = true;
    };
  }, []);

  if (!endA || !endB) return null;

  const clearRun = () => {
    setBand(null);
    setEnergies(null);
    setProg(null);
    setConverged(false);
    setError("");
  };

  const removeSite = (which, idx) => {
    const setEnd = which === "A" ? setEndA : setEndB;
    const end = which === "A" ? endA : endB;
    setEnd({
      ...end,
      sites: end.sites.filter((_, i) => i !== idx),
    });
    clearRun();
  };

  const preview = (i) => {
    if (!band) return;
    pushUndo({ action: "neb-preview", label: `Preview NEB image ${i}` });
    setStructure(band[i]);
  };

  const run = async () => {
    setError("");
    setConverged(false);
    cancelRef.current = false;
    let images;
    try {
      images = interpolateBand(endA, endB, nImages);
    } catch (err) {
      setError(err?.message ?? String(err));
      return;
    }
    setRunning(true);
    setProg({ step: 0, maxForce: null });
    try {
      const client = await getSharedWorker();
      const neb = createNEB(NEB_OPTIMIZERS[optKey].create, {
        fmax,
        k: springK,
        inner: {},
      });
      let current = images;
      let steps = 0;
      let conv = false;
      let lastMax = null;
      while (steps < maxSteps && !cancelRef.current) {
        const { energies: e, forcesList } = await calcBandMlip(
          client,
          current,
        );
        const out = neb.step(current, forcesList, e);
        current = out.images;
        lastMax = out.maxForce;
        steps += 1;
        conv = out.converged;
        setBand(current);
        setEnergies(e);
        setProg({ step: steps, maxForce: out.maxForce });
        if (conv) break;
      }
      setConverged(conv);
      if (!conv && !cancelRef.current) {
        setError(`Stopped after ${steps} steps without converging (max |F| ${lastMax?.toExponential(2) ?? "?"})`);
      }
    } catch (err) {
      setError(err?.message ?? String(err));
    } finally {
      setRunning(false);
    }
  };

  const eMin = energies && energies.length ? Math.min(...energies) : 0;
  const eMax = energies && energies.length ? Math.max(...energies) : 1;
  const eSpan = eMax - eMin || 1;

  return (
    <Modal
      open={open}
      onClose={() => {
        cancelRef.current = true;
        onClose();
      }}
      title="Nudged Elastic Band"
      maxWidth="max-w-4xl"
      footer={
        <button
          onClick={() => {
            cancelRef.current = true;
            onClose();
          }}
          className="px-3 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
        >
          Close
        </button>
      }
    >
      {!modelReady && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-2">
          Load a model in the MLIP panel first — the NEB driver needs a force
          calculator.
        </p>
      )}
      {modelReady && sharedModel?.source && (
        <p className="text-[0.65rem] text-gray-500 mb-2">
          Calculator: {sharedModel.source}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <div className="text-[0.65rem] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Endpoint A — click a coordinate to edit
          </div>
          <AtomTable
            structure={endA}
            pushUndo={() => {}}
            setStructure={(s) => {
              setEndA(s);
              clearRun();
            }}
            onRemove={(idx) => removeSite("A", idx)}
          />
        </div>
        <div>
          <div className="text-[0.65rem] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Endpoint B — click a coordinate to edit
          </div>
          <AtomTable
            structure={endB}
            pushUndo={() => {}}
            setStructure={(s) => {
              setEndB(s);
              clearRun();
            }}
            onRemove={(idx) => removeSite("B", idx)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 mb-2">
        <label htmlFor="neb-images" className="shrink-0">Images:</label>
        <input
          id="neb-images"
          type="number"
          min={3}
          max={15}
          value={nImages}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (v >= 3) setNImages(v);
          }}
          disabled={running}
          className="w-16 px-2 py-0.5 rounded border border-gray-300 text-xs font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
        />
        <span className="text-gray-400">|</span>
        <label htmlFor="neb-k" className="shrink-0">Spring k:</label>
        <input
          id="neb-k"
          type="number"
          min={0.01}
          max={5}
          step={0.05}
          value={springK}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (v > 0) setSpringK(v);
          }}
          disabled={running}
          className="w-20 px-2 py-0.5 rounded border border-gray-300 text-xs font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
        />
        <span className="text-gray-400">eV/&#197;&#178;</span>
        <span className="text-gray-400">|</span>
        <label htmlFor="neb-fmax" className="shrink-0">Convergence:</label>
        <input
          id="neb-fmax"
          type="number"
          min={0.001}
          max={10}
          step={0.01}
          value={fmax}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (v > 0) setFmax(v);
          }}
          disabled={running}
          className="w-20 px-2 py-0.5 rounded border border-gray-300 text-xs font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
        />
        <span className="text-gray-400">eV/&#197;</span>
        <span className="text-gray-400">|</span>
        <label htmlFor="neb-steps" className="shrink-0">Max steps:</label>
        <input
          id="neb-steps"
          type="number"
          min={1}
          max={10000}
          value={maxSteps}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (v > 0) setMaxSteps(v);
          }}
          disabled={running}
          className="w-20 px-2 py-0.5 rounded border border-gray-300 text-xs font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
        />
        <span className="text-gray-400">|</span>
        <select
          value={optKey}
          onChange={(e) => setOptKey(e.target.value)}
          disabled={running}
          title="Per-image optimizer"
          className="px-2 py-0.5 rounded border border-gray-300 text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
        >
          {Object.entries(NEB_OPTIMIZERS).map(([key, { label }]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={running ? () => { cancelRef.current = true; } : run}
        disabled={!modelReady || (!running && (!endA || !endB))}
        className="w-full px-3 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-2"
      >
        {running ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Cancel ({prog?.step ?? 0}/{maxSteps})
          </span>
        ) : (
          "Run NEB"
        )}
      </button>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 mb-2">
          {error}
        </div>
      )}

      {converged && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700 mb-2">
          Converged — click an image below to preview it in the visualizer.
        </div>
      )}

      {energies && band && (
        <div className="rounded-md border border-gray-200 bg-gray-50 overflow-hidden">
          <div className="flex items-end gap-1 h-24 px-3 pt-2">
            {energies.map((e, i) => (
              <div
                key={i}
                title={`Image ${i}: ${e.toFixed(3)} eV`}
                onClick={() => preview(i)}
                className="flex-1 rounded-t bg-indigo-400 hover:bg-indigo-600 cursor-pointer min-w-0"
                style={{ height: `${(8 + 92 * (e - eMin)) / eSpan}%` }}
              />
            ))}
          </div>
          <table className="w-full text-xs font-mono">
            <tbody>
              {energies.map((e, i) => (
                <tr
                  key={i}
                  onClick={() => preview(i)}
                  className="border-t border-gray-100 hover:bg-gray-100 cursor-pointer"
                  title="Preview in visualizer"
                >
                  <td className="px-3 py-1 text-gray-400">Image {i}</td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {e.toFixed(4)} eV
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {prog && (
            <div className="px-3 py-1 text-[0.65rem] font-mono text-gray-500 border-t border-gray-100">
              Step {prog.step}/{maxSteps} · Max |F|{" "}
              {prog.maxForce != null ? prog.maxForce.toExponential(2) : "—"}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
