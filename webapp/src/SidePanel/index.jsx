import { useState } from "react";
import { useStore } from "@tanstack/react-store";
import { appStore, actions } from "../store/appStore";
import { fromJSON } from "matsci-parse";
import BulkSpeciesModal from "./BulkSpeciesModal";
import BulkSymmetryModal from "./BulkSymmetryModal";
import BulkExportModal from "./BulkExportModal";
import { showToast } from "../common/toastStore";

export default function SidePanel({ setAutosave, structure, onLoadStructure }) {
  const autosave = useStore(appStore, (s) => s.autosave);
  const [flashId, setFlashId] = useState(null);
  const [bulkModal, setBulkModal] = useState({ open: false, mode: null });
  const [symmetryOpen, setSymmetryOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const savedList = useStore(appStore, (s) => s.savedStructures);

  const saveCurrent = () => {
    if (!structure) return;

    const name = `Structure ${savedList.length + 1}`;

    actions.saveStructure(structure, name);

    const newItem = appStore.state.savedStructures.at(-1);

    setFlashId(newItem.id);

    setTimeout(() => {
      setFlashId(null);
    }, 2500);
  };

  const deleteSaved = (id) => {
    actions.deleteSaved(id);
  };

  const renameSaved = (id, name) => {
    actions.renameSaved(id, name);
  };

  const loadStructure = (structure, name) => {
    try {
      const parsed = fromJSON(structure);
      onLoadStructure(parsed, {
        name,
        source: "saved",
      });
    } catch (err) {
      console.error(err);
      showToast(`${name} failed to load, see console for details`);
    }
  };

  const handleFile = async (event) => {
    const files = event.target.files;
    if (!files?.length) return;

    for (const file of files) {
      try {
        await actions.importFile(file, { saveOnly: true });
      } catch (err) {
        console.error(err);
        showToast(`${file.name} failed to parse, see console for details`);
      }
    }

    event.target.value = "";
  };

  return (
    <aside className="w-80 border-r bg-gray-50 flex flex-col ">
      <div className="py-4 px-2 text-center border-b bg-gray-200 h-[58px]">
        <h2 className="text-sm font-semibold text-gray-800">
          Saved Structures
        </h2>
      </div>

      <div className="p-4 flex items-center gap-4 flex-wrap">
        {/* File upload */}
        <label
          title="Import CIF, XYZ, XSF, POSCAR, or zip files containing structure files"
          className="px-1 py-2 text-sm border rounded-md cursor-pointer bg-gray-100 hover:bg-gray-200 transition"
        >
          Choose Files
          <input
            type="file"
            multiple
            onChange={handleFile}
            accept=".cif,.xyz,.xsf,.vasp,.poscar,.json,.zip"
            className="hidden"
          />
        </label>

        <span className="text-xs text-gray-500">
          CIF, XYZ, XSF, POSCAR, zip
        </span>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autosave}
            onChange={(e) => setAutosave(e.target.checked)}
            className="accent-blue-600"
          />
          Autosave on upload
        </label>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* Save button */}
        <button
          onClick={saveCurrent}
          disabled={!structure}
          title="Save the current structure to local storage"
          className="w-full px-3 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Save current
        </button>

        {/* Bulk operations */}
        {savedList.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500 mb-2">Bulk Operations</p>
            <p className="text-[10px] text-gray-400 mb-2">
              Bulk operations do not modify open tabs.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setBulkModal({ open: true, mode: "replace" })}
                title="Replace species in all saved structures"
                className="flex-1 px-2 py-1.5 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 transition"
              >
                Replace Species
              </button>
              <button
                onClick={() => setBulkModal({ open: true, mode: "remove" })}
                title="Remove species from all saved structures"
                className="flex-1 px-2 py-1.5 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition"
              >
                Remove Species
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setSymmetryOpen(true)}
                title="Symmetrize all saved structures"
                className="flex-1 px-2 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition"
              >
                Symmetrize
              </button>
              <button
                onClick={() => setExportOpen(true)}
                title="Export all saved structures as a zip file"
                className="flex-1 px-2 py-1.5 text-xs font-medium rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition"
              >
                Export All
              </button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="space-y-2 pt-2">
          {savedList.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6">
              No saved structures
            </p>
          )}

          {savedList.map((item) => (
            <div
              key={item.id}
              className={`p-2 rounded-md border bg-white hover:shadow-sm transition ${flashId === item.id ? "duration-800 animate-pulse ring-2  ring-blue-700" : ""}`}
            >
              <input
                value={item.name}
                onChange={(e) => renameSaved(item.id, e.target.value)}
                className="w-full text-sm px-2 py-1 border rounded-md"
              />

              <div className="flex gap-2 mt-2 text-xs">
                <button
                  onClick={() => loadStructure(item.structure, item.name)}
                  title="Load this saved structure"
                  className="buttonSimple gray flex-1"
                >
                  Load
                </button>

                <button
                  onClick={() => deleteSaved(item.id)}
                  title="Delete this saved structure"
                  className="buttonSimple red flex-1"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BulkSpeciesModal
        open={bulkModal.open}
        mode={bulkModal.mode}
        onClose={() => setBulkModal({ open: false, mode: null })}
      />

      <BulkSymmetryModal
        open={symmetryOpen}
        onClose={() => setSymmetryOpen(false)}
      />

      <BulkExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
      />
    </aside>
  );
}
