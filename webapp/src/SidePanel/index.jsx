import { useState } from "react";
import { loadSavedStructures, saveSavedStructures } from "../storage/storage";

import { parseFileText } from "../common/formats";

export default function SidePanel({
  autosave,
  setAutosave,
  structure,
  structureToCif,
  cifToStructure,
  onLoadStructure,
}) {
  const [error, setError] = useState("");

  const [savedList, setSavedList] = useState(() => loadSavedStructures());

  const saveCurrent = () => {
    if (!structure) return;

    const updated = [
      ...savedList,
      {
        id: crypto.randomUUID(),
        name: `Structure ${savedList.length + 1}`,
        cif: structureToCif(structure),
      },
    ];

    saveSavedStructures(updated);
    setSavedList(updated);
  };

  const deleteSaved = (id) => {
    const updated = savedList.filter((x) => x.id !== id);

    saveSavedStructures(updated);
    setSavedList(updated);
  };

  const renameSaved = (id, name) => {
    const updated = savedList.map((x) => (x.id === id ? { ...x, name } : x));

    saveSavedStructures(updated);
    setSavedList(updated);
  };

  const loadStructure = (cif, name) => {
    const parsed = cifToStructure(cif);
    onLoadStructure(parsed, {
      name,
      source: "saved",
    });
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();

      const { structure: parsed } = parseFileText(text);

      onLoadStructure(parsed, {
        name: `Imported ${new Date().toLocaleString()}`,
        source: "file",
      });

      if (autosave) {
        const updated = [
          ...savedList,
          {
            id: crypto.randomUUID(),
            name: `Imported ${new Date().toLocaleString()}`,
            cif: structureToCif(parsed),
          },
        ];

        saveSavedStructures(updated);
        setSavedList(updated);
      }
    } catch (err) {
      console.error(err);
    }
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
        <label className="px-1 py-2 text-sm border rounded-md cursor-pointer bg-gray-100 hover:bg-gray-200 transition">
          Choose File
          <input type="file" onChange={handleFile} className="hidden" />
        </label>

        <span className="text-xs text-gray-500">CIF, XYZ, XSF, POSCAR</span>
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

      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* Save button */}
        <button
          onClick={saveCurrent}
          disabled={!structure}
          className="w-full px-3 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Save current
        </button>

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
              className="p-2 rounded-md border bg-white hover:shadow-sm transition"
            >
              <input
                value={item.name}
                onChange={(e) => renameSaved(item.id, e.target.value)}
                className="w-full text-sm px-2 py-1 border rounded-md"
              />

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => loadStructure(item.cif, item.name)}
                  className="flex-1 text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                >
                  Load
                </button>

                <button
                  onClick={() => deleteSaved(item.id)}
                  className="flex-1 text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
