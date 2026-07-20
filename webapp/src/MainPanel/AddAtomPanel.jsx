import { useState } from "react";
import { appendSite, insertSite, elementBySymbol } from "matsci-parse";
import Modal, { ModalButton } from "../common/Modal";

const ALL_ELEMENTS = Object.keys(elementBySymbol);

export default function AddAtomPanel({ structure, setStructure, pushUndo }) {
  const [open, setOpen] = useState(false);
  const [species, setSpecies] = useState("Si");
  const [frac, setFrac] = useState([0.0, 0.0, 0.0]);
  const [insertAt, setInsertAt] = useState("append");

  const reset = () => {
    setSpecies("Si");
    setFrac([0.0, 0.0, 0.0]);
    setInsertAt("append");
  };

  const handleAdd = () => {
    const sym = species.trim();
    if (!sym || !elementBySymbol[sym]) return;

    const newSite = {
      species: { symbol: sym },
      frac: new Float64Array(frac.map(Number)),
    };

    pushUndo({
      action: "add-site",
      label: `Added ${sym} at [${frac.join(", ")}]`,
    });

    if (insertAt === "append") {
      setStructure(appendSite(structure, newSite));
    } else {
      const idx = Math.min(
        Math.max(0, parseInt(insertAt, 10)),
        structure.sites.length,
      );
      setStructure(insertSite(structure, idx, newSite));
    }

    reset();
    setOpen(false);
  };

  const validSpecies = species.trim() && !!elementBySymbol[species.trim()];

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={() => setOpen(true)}
          className="buttonSimple blue w-1/2"
        >
          + Add Atom
        </button>
      </div>

      <Modal
        open={open}
        onClose={() => {
          reset();
          setOpen(false);
        }}
        title="Add Atom"
        footer={
          <>
            <ModalButton
              variant="cancel"
              onClick={() => {
                reset();
                setOpen(false);
              }}
            >
              Cancel
            </ModalButton>
            <ModalButton onClick={handleAdd} disabled={!validSpecies}>
              Add
            </ModalButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Element
            </label>
            <input
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              list="element-list"
              className={`w-full px-3 py-1.5 text-sm border rounded-md ${
                species && !validSpecies ? "border-red-400" : "border-gray-300"
              }`}
              placeholder="e.g. Fe, Si, O"
            />
            <datalist id="element-list">
              {ALL_ELEMENTS.map((el) => (
                <option key={el} value={el} />
              ))}
            </datalist>
            {species && !validSpecies && (
              <p className="text-xs text-red-500 mt-1">Unknown element</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Fractional Coordinates
            </label>
            <div className="flex gap-2">
              {["x", "y", "z"].map((axis, i) => (
                <input
                  key={axis}
                  type="number"
                  step="0.01"
                  value={frac[i]}
                  onChange={(e) => {
                    const next = [...frac];
                    next[i] = e.target.value;
                    setFrac(next);
                  }}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md font-mono"
                  placeholder={axis.toUpperCase()}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Position
            </label>
            <div className="flex gap-2 items-center">
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="radio"
                  name="insert-pos"
                  value="append"
                  checked={insertAt === "append"}
                  onChange={() => setInsertAt("append")}
                  className="accent-blue-600"
                />
                Append to end
              </label>
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="radio"
                  name="insert-pos"
                  value={insertAt === "append" ? "0" : insertAt}
                  checked={insertAt !== "append"}
                  onChange={() => setInsertAt("0")}
                  className="accent-blue-600"
                />
                Insert at index
              </label>
              {insertAt !== "append" && (
                <input
                  type="number"
                  min="0"
                  max={structure.sites.length}
                  value={insertAt}
                  onChange={(e) => setInsertAt(e.target.value)}
                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md font-mono"
                />
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Current structure has {structure.sites.length} sites (indices 0–
              {structure.sites.length - 1})
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
