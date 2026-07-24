import { useState, useMemo } from "react";
import { useStore } from "@tanstack/react-store";
import { appStore, actions } from "../store/appStore";
import { elementBySymbol, fromJSON } from "matsci-parse";
import Modal, { ModalButton } from "../common/Modal";
import { showToast } from "../common/toastStore";

export default function BulkSpeciesModal({ open, mode, onClose }) {
  const savedList = useStore(appStore, (s) => s.savedStructures);

  const allSpecies = useMemo(() => {
    const species = new Set();
    let skipped = 0;
    for (const item of savedList) {
      try {
        const structure = fromJSON(item.structure);
        for (const site of structure.sites) {
          species.add(site.species.symbol);
        }
      } catch {
        skipped++;
      }
    }
    if (skipped) {
      showToast(`${skipped} structure(s) skipped (unparseable)`, "warning");
    }
    return [...species].sort();
  }, [savedList]);

  const handleConfirm = (oldSp, newSp) => {
    if (mode === "replace") {
      actions.bulkReplaceSpecies(oldSp, newSp);
    } else {
      actions.bulkRemoveSpecies(oldSp);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        mode === "replace"
          ? "Replace Species in All Saved Structures"
          : "Remove Species from All Saved Structures"
      }
      footer={
        <ModalButton variant="cancel" onClick={onClose}>
          Cancel
        </ModalButton>
      }
    >
      {mode === "remove" ? (
        <BulkRemoveSpeciesForm
          speciesList={allSpecies}
          count={savedList.length}
          onConfirm={(sp) => handleConfirm(sp)}
        />
      ) : (
        <BulkReplaceSpeciesForm
          speciesList={allSpecies}
          count={savedList.length}
          onConfirm={(oldSp, newSp) => handleConfirm(oldSp, newSp)}
        />
      )}
    </Modal>
  );
}

function BulkRemoveSpeciesForm({ speciesList, count, onConfirm }) {
  const [species, setSpecies] = useState("");

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        This will remove all atoms of the selected element from {count} saved
        structures.
      </p>
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

function BulkReplaceSpeciesForm({ speciesList, count, onConfirm }) {
  const [oldSp, setOldSp] = useState("");
  const [newSp, setNewSp] = useState("");
  const validNew = newSp.trim() && !!elementBySymbol[newSp.trim()];

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        This will replace species in all {count} saved structures.
      </p>
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
          list="bulk-replace-element-list"
          placeholder="e.g. Fe, O, Li"
          className={`w-full px-3 py-1.5 text-sm border rounded-md ${
            newSp && !validNew ? "border-red-400" : "border-gray-300"
          }`}
        />
        <datalist id="bulk-replace-element-list">
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
          Replace all {oldSp} → {newSp.trim()} in all structures
        </button>
      )}
    </div>
  );
}
