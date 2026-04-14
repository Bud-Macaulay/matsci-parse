import { useState, useEffect } from "react";
import {
  pwToStructure,
  xsfToStructure,
  xyzToStructure,
  poscarToStructure,
  cifToStructure,
  structureToCif,
} from "matsci-parse";
import StructureVisualizer from "mc-react-structure-visualizer";

import detectFormat from "./common/detectFormat";
import StructureDownload from "./common/structureDownload";

const STORAGE_KEY = "matsci_saved_structures";

export default function App() {
  const [structure, setStructure] = useState(null);
  const [cifText, setCifText] = useState("");
  const [error, setError] = useState("");
  const [undoStack, setUndoStack] = useState([]);
  const [savedList, setSavedList] = useState([]);
  const [autosave, setAutosave] = useState(true);

  // -----------------------------
  // Storage helpers
  // -----------------------------
  const loadSaved = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  };

  const persist = (list) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  useEffect(() => {
    setSavedList(loadSaved());
  }, []);

  // -----------------------------
  // Core structure handling
  // -----------------------------
  const saveUndo = (s) => {
    setUndoStack((prev) => [...prev, structureToCif(s)]);
  };

  const setNewStructure = (parsed) => {
    setStructure(parsed);
    const cif = structureToCif(parsed);
    setCifText(cif);
    setUndoStack([]);

    // autosave on upload
    if (autosave) {
      const entry = {
        id: crypto.randomUUID(),
        name: `Imported ${new Date().toLocaleString()}`,
        cif,
      };

      const updated = [...loadSaved(), entry];
      persist(updated);
      setSavedList(updated);
    }
  };

  // -----------------------------
  // File upload
  // -----------------------------
  const handleFile = async (event) => {
    setError("");
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const format = detectFormat(text);

      let parsed;

      switch (format) {
        case "pw":
          parsed = pwToStructure(text);
          break;
        case "cif":
          parsed = cifToStructure(text);
          break;
        case "xsf":
          parsed = xsfToStructure(text);
          break;
        case "xyz":
          parsed = xyzToStructure(text);
          break;
        case "poscar":
          parsed = poscarToStructure(text);
          break;
        default:
          throw new Error("Unsupported format");
      }

      setNewStructure(parsed);
    } catch (err) {
      setError(err.message);
      setStructure(null);
      setCifText("");
    }
  };

  // -----------------------------
  // Editing actions
  // -----------------------------
  const replaceSite = (idx, newSpecies) => {
    if (!structure) return;
    saveUndo(structure);
    structure.replaceSite(idx, newSpecies);
    setStructure(structure);
    setCifText(structureToCif(structure));
  };

  const removeSite = (idx) => {
    if (!structure) return;
    saveUndo(structure);
    structure.removeSite(idx);
    setStructure(structure);
    setCifText(structureToCif(structure));
  };

  const undo = () => {
    if (!undoStack.length) return;

    const last = undoStack.at(-1);
    setUndoStack((p) => p.slice(0, -1));

    const restored = cifToStructure(last);
    setStructure(restored);
    setCifText(last);
  };

  // -----------------------------
  // Saved structure actions
  // -----------------------------
  const saveCurrent = () => {
    if (!structure) return;

    const entry = {
      id: crypto.randomUUID(),
      name: `Structure ${savedList.length + 1}`,
      cif: structureToCif(structure),
    };

    const updated = [...savedList, entry];
    persist(updated);
    setSavedList(updated);
  };

  const loadStructure = (cif) => {
    const parsed = cifToStructure(cif);
    setStructure(parsed);
    setCifText(cif);
    setUndoStack([]);
  };

  const deleteSaved = (id) => {
    const updated = savedList.filter((x) => x.id !== id);
    persist(updated);
    setSavedList(updated);
  };

  const renameSaved = (id, name) => {
    const updated = savedList.map((x) => (x.id === id ? { ...x, name } : x));
    persist(updated);
    setSavedList(updated);
  };

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="flex h-screen overflow-hidden">
      {" "}
      {/* LEFT PANEL */}
      <aside className="w-80 border-r bg-gray-50 flex flex-col h-full">
        <div className="py-4 px-2 text-center border-b bg-gray-200">
          <h2 className="text-sm font-semibold text-gray-800">
            Saved Structures
          </h2>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Autosave */}
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={autosave}
              onChange={(e) => setAutosave(e.target.checked)}
              className="accent-blue-600"
            />
            Autosave on upload
          </label>

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
                {/* Name input */}
                <input
                  value={item.name}
                  onChange={(e) => renameSaved(item.id, e.target.value)}
                  className="w-full text-sm px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                />

                {/* Actions */}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => loadStructure(item.cif)}
                    className="flex-1 text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 transition"
                  >
                    Load
                  </button>

                  <button
                    onClick={() => deleteSaved(item.id)}
                    className="flex-1 text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
      {/* MAIN PANEL */}
      {/* MAIN PANEL */}
      <main className="flex-1 flex flex-col h-full bg-gray-50">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-white">
          <h1 className="text-lg font-semibold text-gray-800">
            Matsci Parse Demo
          </h1>

          <div className="mt-3 flex items-center gap-4 flex-wrap">
            {/* File upload */}
            <label className="px-3 py-2 text-sm border rounded-md cursor-pointer bg-gray-100 hover:bg-gray-200 transition">
              Choose File
              <input type="file" onChange={handleFile} className="hidden" />
            </label>

            <span className="text-xs text-gray-500">CIF, XYZ, XSF, POSCAR</span>
          </div>

          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>

        {/* Content */}
        {structure && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Controls */}
            <div className="px-6 pt-1.5   flex gap-2">
              <button
                onClick={undo}
                disabled={!undoStack.length}
                className="px-3 py-1.5 text-sm rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
              >
                Undo
              </button>
            </div>

            {/* Main split */}
            <div className="flex flex-1 overflow-hidden p-4 gap-4">
              {/* Table */}
              <div className="w-[425px] min-w-[380px] max-w-[450px] bg-white rounded-md border overflow-hidden flex flex-col">
                <div className="overflow-y-auto flex-1">
                  <table className="w-full text-sm border-separate border-spacing-0">
                    <thead className="sticky top-0 bg-gray-100 text-gray-700 text-[12px]">
                      <tr>
                        <th className="px-2 py-1 text-left border-b">#</th>
                        <th className="px-2 py-1 text-left border-b">
                          Species
                        </th>
                        <th className="px-2 py-1 text-left border-b">X</th>
                        <th className="px-2 py-1 text-left border-b">Y</th>
                        <th className="px-2 py-1 text-left border-b">Z</th>
                        <th className="px-2 py-1 text-left border-b">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {structure.sites.map((site, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-gray-50 transition text-[12px]"
                        >
                          <td className="px-2 py-1 border-b">{idx}</td>
                          <td className="px-2 py-1 border-b">
                            {structure.species[site.speciesIndex]}
                          </td>
                          <td className="px-2 py-1 border-b">
                            {site.cart[0].toFixed(3)}
                          </td>
                          <td className="px-2 py-1 border-b">
                            {site.cart[1].toFixed(3)}
                          </td>
                          <td className="px-2 py-1 border-b">
                            {site.cart[2].toFixed(3)}
                          </td>
                          <td className="px-2 py-1 border-b">
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  const newSp = prompt("New species:");
                                  if (newSp) replaceSite(idx, newSp);
                                }}
                                className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                              >
                                Replace
                              </button>

                              <button
                                onClick={() => removeSite(idx)}
                                className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100"
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Visualizer */}
              {/* Visualizer */}
              <div className="flex-1 bg-white overflow-hidden relative">
                {/* Top-right toolbar */}
                <div className="absolute top-2 right-2 z-10">
                  <StructureDownload structure={structure} />
                </div>

                <StructureVisualizer
                  key={cifText}
                  cifText={cifText}
                  initSupercell={[1, 1, 1]}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
