import { useState } from "react";

import { perturb } from "matsci-parse";
import { showToast } from "../common/toastStore";

export default function PerturbPanel({ structure, setStructure, pushUndo }) {
  const [distance, setDistance] = useState(0.05);
  // Empty = every atom moves by exactly `distance`.
  const [minDistance, setMinDistance] = useState("");

  const applyPerturb = () => {
    if (!structure) return;
    const min = minDistance === "" ? undefined : Number(minDistance);

    try {
      const next = perturb(structure, Number(distance), { minDistance: min });
      pushUndo({
        action: "perturb",
        label:
          min === undefined
            ? `Perturbed atoms by ${distance} Å`
            : `Perturbed atoms by ${min}–${distance} Å`,
      });
      setStructure(next);
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  return (
    <div className="bg-white rounded-md border min-h-[150px] overflow-y-auto">
      <div className="px-3 py-2 border-b bg-gray-50">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Perturb atoms
        </h3>
      </div>

      <div className="p-3 flex flex-col gap-3">
        <div className="flex gap-3 items-center text-xs">
          <label className="flex items-center gap-1">
            Distance
            <input
              type="number"
              min={0}
              step={0.01}
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className="w-16 px-2 py-1 border rounded font-mono text-center"
            />
            <span className="text-gray-500">Å</span>
          </label>
          <label className="flex items-center gap-1">
            Min
            <input
              type="number"
              min={0}
              step={0.01}
              placeholder="—"
              value={minDistance}
              onChange={(e) => setMinDistance(e.target.value)}
              className="w-16 px-2 py-1 border rounded font-mono text-center"
            />
            <span className="text-gray-500">Å</span>
          </label>
        </div>

        <button
          onClick={applyPerturb}
          title="Move every atom in a random direction by the given distance (or a random distance between Min and Distance)"
          className="px-3 py-1.5 text-sm rounded-md bg-purple-100 hover:bg-purple-200"
        >
          Perturb atoms
        </button>
      </div>
    </div>
  );
}
