import { useState } from "react";
import { useStore } from "@tanstack/react-store";
import JSZip from "jszip";
import { appStore } from "../store/appStore";
import { fromJSON, toCIF, toXYZ, toXSF, toPOSCAR } from "matsci-parse";
import Modal, { ModalButton } from "../common/Modal";
import { showToast } from "../common/toastStore";

const formats = {
  cif: { label: "CIF", ext: "cif", serialize: toCIF },
  xyz: { label: "XYZ", ext: "xyz", serialize: toXYZ },
  xsf: { label: "XSF", ext: "xsf", serialize: toXSF },
  poscar: { label: "VASP", ext: "vasp", serialize: toPOSCAR },
  json: {
    label: "JSON",
    ext: "json",
    serialize: (s) => JSON.stringify(s, null, 2),
  },
};

export default function BulkExportModal({ open, onClose }) {
  const savedList = useStore(appStore, (s) => s.savedStructures);
  const [exporting, setExporting] = useState(false);

  const handleExport = async (formatKey) => {
    const fmt = formats[formatKey];
    if (!fmt) return;

    setExporting(true);

    const zip = new JSZip();
    let success = 0;
    let skipped = 0;

    for (const item of savedList) {
      try {
        const structure = fromJSON(item.structure);
        const text = fmt.serialize(structure);
        const safeName = item.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        zip.file(`${safeName}.${fmt.ext}`, text);
        success++;
      } catch {
        skipped++;
      }
    }

    if (!success) {
      setExporting(false);
      showToast("No structures could be exported", "error");
      return;
    }

    try {
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `structures_${fmt.ext}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      showToast("Failed to create zip file", "error");
    }

    setExporting(false);

    if (skipped) {
      showToast(`${skipped} structure(s) skipped (unparseable)`, "warning");
    }
    showToast(`Exported ${success} structure(s) as ${fmt.label}`, "info");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export All Saved Structures"
      footer={
        <ModalButton variant="cancel" onClick={onClose}>
          Cancel
        </ModalButton>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-gray-500">
          Export all {savedList.length} saved structures as a zip file.
        </p>
        <p className="text-[10px] text-amber-600">
          Note: atomic symbols are exported as-is. Formats with strict element
          conventions (e.g. VASP) may produce malformed files for non-standard
          symbols.
        </p>

        <div className="grid grid-cols-2 gap-2">
          {Object.entries(formats).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => handleExport(key)}
              disabled={exporting}
              className="px-3 py-2 text-sm rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 disabled:opacity-40 transition"
            >
              {exporting ? "Exporting..." : label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
