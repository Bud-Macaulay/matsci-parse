import { useState, useEffect } from "react";
import { makeSupercell } from "matsci-parse";

export default function TransformLatticePanel({
  structure,
  setStructure,
  pushUndo,
}) {
  // supercell dimensions instead of matrix
  const [dims, setDims] = useState([1, 1, 1]);

  const updateDim = (i, value) => {
    const next = [...dims];
    next[i] = Math.max(1, Number(value) || 1); // enforce ≥1
    setDims(next);
  };

  const applyTransform = () => {
    if (!structure) return;

    pushUndo({
      action: "supercell",
      label: `Built ${dims[0]}×${dims[1]}×${dims[2]} supercell`,
    });

    try {
      const newStructure = makeSupercell(structure, dims);
      setStructure(newStructure);
    } catch (e) {
      console.error("Supercell failed:", e);
    }
  };

  useEffect(() => {
    setDims([1, 1, 1]);
  }, [structure]);

  return (
    <div className="bg-white rounded-md border overflow-hidden">
      <div className="px-3 py-2 border-b bg-gray-50">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Apply Supercell transform
        </h3>
      </div>

      <div className="p-3 flex flex-col gap-3">
        {/* Inputs */}
        <div className="flex gap-2 items-center">
          {dims.map((val, i) => (
            <div key={i} className="flex flex-col items-center">
              <input
                type="number"
                min={1}
                value={val}
                onChange={(e) => updateDim(i, e.target.value)}
                className="w-14 px-2 py-1 text-xs border rounded font-mono text-center"
              />
              <span className="text-[10px] text-gray-500">
                {i === 0 ? "a" : i === 1 ? "b" : "c"}
              </span>
            </div>
          ))}
        </div>

        {/* Apply */}
        <button
          onClick={applyTransform}
          className="px-3 py-1.5 text-sm rounded-md bg-purple-100 hover:bg-purple-200"
        >
          Build supercell
        </button>
      </div>
    </div>
  );
}
