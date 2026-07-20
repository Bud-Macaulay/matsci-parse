import { useState } from "react";
import { elementBySymbol } from "matsci-parse";
import Modal, { ModalButton } from "../common/Modal";

export default function SpeciesModal({ open, mode, onClose, structure, onRemoveAll, onReplaceAll }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "replace" ? "Replace Species" : "Remove Species"}
      footer={
        <ModalButton variant="cancel" onClick={onClose}>
          Cancel
        </ModalButton>
      }
    >
      {mode === "remove" ? (
        <RemoveSpeciesForm
          structure={structure}
          onConfirm={(sp) => {
            onRemoveAll(sp);
            onClose();
          }}
        />
      ) : (
        <ReplaceSpeciesForm
          structure={structure}
          onConfirm={(oldSp, newSp) => {
            onReplaceAll(oldSp, newSp);
            onClose();
          }}
        />
      )}
    </Modal>
  );
}

function RemoveSpeciesForm({ structure, onConfirm }) {
  const [species, setSpecies] = useState("");
  const speciesList = [...new Set(structure.sites.map((s) => s.species.symbol))];

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-gray-600">
        Remove all atoms of element:
      </label>
      <div className="flex flex-wrap gap-2">
        {speciesList.map((sp) => (
          <button
            key={sp}
            onClick={() => onConfirm(sp)}
            className="px-3 py-1.5 text-sm rounded-md bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
          >
            {sp}
          </button>
        ))}
      </div>
      <div className="flex gap-2 items-center">
        <input
          value={species}
          onChange={(e) => setSpecies(e.target.value)}
          placeholder="or type symbol..."
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md"
        />
        {species && (
          <button
            onClick={() => onConfirm(species.trim())}
            className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

function ReplaceSpeciesForm({ structure, onConfirm }) {
  const [oldSp, setOldSp] = useState("");
  const [newSp, setNewSp] = useState("");
  const speciesList = [...new Set(structure.sites.map((s) => s.species.symbol))];
  const validNew = newSp.trim() && !!elementBySymbol[newSp.trim()];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          From element
        </label>
        <div className="flex flex-wrap gap-2">
          {speciesList.map((sp) => (
            <button
              key={sp}
              onClick={() => setOldSp(sp)}
              className={`px-3 py-1.5 text-sm rounded-md border ${
                oldSp === sp
                  ? "bg-blue-100 border-blue-400 text-blue-800"
                  : "bg-gray-50 border-gray-200 hover:bg-gray-100"
              }`}
            >
              {sp}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          To element
        </label>
        <input
          value={newSp}
          onChange={(e) => setNewSp(e.target.value)}
          list="replace-element-list"
          placeholder="e.g. Fe, O, Li"
          className={`w-full px-3 py-1.5 text-sm border rounded-md ${
            newSp && !validNew ? "border-red-400" : "border-gray-300"
          }`}
        />
        <datalist id="replace-element-list">
          {Object.keys(elementBySymbol).map((el) => (
            <option key={el} value={el} />
          ))}
        </datalist>
      </div>
      {oldSp && validNew && (
        <button
          onClick={() => onConfirm(oldSp, newSp.trim())}
          className="w-full px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          Replace all {oldSp} → {newSp.trim()}
        </button>
      )}
    </div>
  );
}
