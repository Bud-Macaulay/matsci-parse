import { useState } from "react";
import { useStore } from "@tanstack/react-store";
import { appStore } from "../store/appStore";
import { fromJSON, toJSON, getSymmetry, supercell } from "matsci-parse";
import Modal, { ModalButton } from "../common/Modal";
import { showToast } from "../common/toastStore";
import { saveSavedStructures } from "../storage/storage";

export default function BulkSymmetryModal({ open, onClose }) {
  const savedList = useStore(appStore, (s) => s.savedStructures);
  const [processing, setProcessing] = useState(false);

  const handleApply = async (mode) => {
    setProcessing(true);

    const current = appStore.state.savedStructures;
    let success = 0;
    let skipped = 0;

    const updated = await Promise.all(
      current.map(async (item) => {
        try {
          const structure = fromJSON(item.structure);
          let result;
          try {
            result = await getSymmetry(structure);
          } catch {
            const sc = supercell(structure, [2, 2, 2]);
            result = await getSymmetry(sc);
          }
          const symmetrized =
            mode === "primitive" ? result.primitive : result.conventional;
          success++;
          return { ...item, structure: toJSON(symmetrized) };
        } catch {
          skipped++;
          return item;
        }
      }),
    );

    appStore.setState((s) => ({ ...s, savedStructures: updated }));
    saveSavedStructures(updated);
    setProcessing(false);

    if (skipped) {
      showToast(`${skipped} structure(s) skipped (symmetry failed)`, "warning");
    }
    if (success) {
      showToast(`Symmetrized ${success} structure(s) as ${mode}`, "info");
    }

    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Symmetrize All Saved Structures"
      footer={
        <ModalButton variant="cancel" onClick={onClose}>
          Cancel
        </ModalButton>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-gray-500">
          Calculate symmetry and apply to all {savedList.length} saved
          structures.
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => handleApply("conventional")}
            disabled={processing}
            title="Apply the conventional cell transformation to all structures"
            className="flex-1 px-3 py-1.5 text-sm rounded-md bg-lime-100 hover:bg-lime-200 text-lime-800 disabled:opacity-40"
          >
            {processing ? "Processing..." : "Apply Conventional"}
          </button>
          <button
            onClick={() => handleApply("primitive")}
            disabled={processing}
            title="Apply the primitive cell transformation to all structures"
            className="flex-1 px-3 py-1.5 text-sm rounded-md bg-green-100 hover:bg-green-200 text-green-800 disabled:opacity-40"
          >
            {processing ? "Processing..." : "Apply Primitive"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
