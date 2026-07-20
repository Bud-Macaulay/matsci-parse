import { useState } from "react";
import { slabFromMillerIndex, slabFromSites } from "matsci-parse";

import Modal from "../common/Modal";

export default function SlabModal({ structure, setStructure, pushUndo }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("miller");

  const [miller, setMiller] = useState({ h: 0, k: 0, l: 1 });
  const [siteIdx, setSiteIdx] = useState({ i: 0, j: 1, k: 2 });
  const [layers, setLayers] = useState(1);
  const [vacuum, setVacuum] = useState(0);

  const apply = () => {
    try {
      let result;

      if (mode === "miller") {
        const { h, k, l } = miller;
        if (h === 0 && k === 0 && l === 0) return;
        result = slabFromMillerIndex(structure, h, k, l, { layers, vacuum });
      } else {
        const { i, j, k } = siteIdx;
        if (i === j || j === k || i === k) return;
        if (i >= structure.sites.length || j >= structure.sites.length || k >= structure.sites.length) return;
        result = slabFromSites(structure, i, j, k, { layers, vacuum });
      }

      pushUndo({ action: "slab", label: `Slab (${mode === "miller" ? `${miller.h}${miller.k}${miller.l}` : `sites ${siteIdx.i},${siteIdx.j},${siteIdx.k}`})` });
      setStructure(result);
      setOpen(false);
    } catch (e) {
      console.error("Slab generation failed:", e);
    }
  };

  const siteCount = structure?.sites.length ?? 0;

  return (
    <>
      <button onClick={() => setOpen(true)} title="Create a slab surface from Miller indices or site triple" className="buttonSimple blue w-full">
        Build Slab
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Build Slab"
        maxWidth="max-w-sm"
        footer={
          <button onClick={apply} title="Apply the slab transformation" className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700">
            Apply
          </button>
        }
      >
        <div className="space-y-4">
          {/* Experimental warning */}
          <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            <span className="mt-0.5 shrink-0">⚠</span>
            <span>Slab generation is experimental. Results may need verification for production use.</span>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-md border overflow-hidden text-xs">
            <button
              onClick={() => setMode("miller")}
              className={`flex-1 py-1.5 ${mode === "miller" ? "bg-blue-100 text-blue-700 font-medium" : "bg-gray-50 text-gray-600"}`}
            >
              Miller Indices
            </button>
            <button
              onClick={() => setMode("sites")}
              className={`flex-1 py-1.5 ${mode === "sites" ? "bg-blue-100 text-blue-700 font-medium" : "bg-gray-50 text-gray-600"}`}
            >
              From Sites
            </button>
          </div>

          {/* Miller inputs */}
          {mode === "miller" && (
            <div className="flex gap-2 items-center">
              {["h", "k", "l"].map((key) => (
                <div key={key} className="flex flex-col items-center">
                  <input
                    type="number"
                    value={miller[key]}
                    onChange={(e) => setMiller({ ...miller, [key]: parseInt(e.target.value) || 0 })}
                    className="w-16 px-2 py-1 text-xs border rounded font-mono text-center"
                  />
                  <span className="text-[10px] text-gray-500">{key}</span>
                </div>
              ))}
            </div>
          )}

          {/* Site inputs */}
          {mode === "sites" && (
            <div className="flex gap-2 items-center">
              {["i", "j", "k"].map((key) => (
                <div key={key} className="flex flex-col items-center">
                  <input
                    type="number"
                    min={0}
                    max={siteCount - 1}
                    value={siteIdx[key]}
                    onChange={(e) => setSiteIdx({ ...siteIdx, [key]: parseInt(e.target.value) || 0 })}
                    className="w-16 px-2 py-1 text-xs border rounded font-mono text-center"
                  />
                  <span className="text-[10px] text-gray-500">{key}</span>
                </div>
              ))}
              <span className="text-[10px] text-gray-400 ml-1">0–{siteCount - 1}</span>
            </div>
          )}

          {/* Layers + Vacuum */}
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <input
                type="number"
                min={1}
                value={layers}
                onChange={(e) => setLayers(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 px-2 py-1 text-xs border rounded font-mono text-center"
              />
              <span className="text-[10px] text-gray-500">layers</span>
            </div>
            <div className="flex flex-col items-center">
              <input
                type="number"
                min={0}
                value={vacuum}
                onChange={(e) => setVacuum(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-20 px-2 py-1 text-xs border rounded font-mono text-center"
              />
              <span className="text-[10px] text-gray-500">vacuum (Å)</span>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
