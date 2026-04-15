import { useEffect, useState } from "react";
import { cifToStructure, structureToCif } from "matsci-parse";
import StructureVisualizer from "mc-react-structure-visualizer";
import StructureDownload from "../common/structureDownload";

export default function MainPanel({ tab, updateTab }) {
  if (!tab) return null;

  const { structure, undoStack } = tab;
  const cifText = structure ? structureToCif(structure) : "";

  const pushUndo = () => {
    updateTab((t) => ({
      ...t,
      undoStack: [...t.undoStack, structureToCif(t.structure)],
    }));
  };

  const setStructure = (newStructure) => {
    updateTab((t) => ({
      ...t,
      structure: newStructure,
    }));
  };

  const replaceSite = (idx, newSpecies) => {
    pushUndo();

    const copy = cifToStructure(structureToCif(structure));
    copy.replaceSite(idx, newSpecies);

    setStructure(copy);
  };

  const removeSite = (idx) => {
    pushUndo();

    const copy = cifToStructure(structureToCif(structure));
    copy.removeSite(idx);

    setStructure(copy);
  };

  const undo = () => {
    if (!undoStack.length) return;

    const last = undoStack.at(-1);

    updateTab((t) => ({
      ...t,
      undoStack: t.undoStack.slice(0, -1),
      structure: cifToStructure(last),
    }));
  };

  if (!structure) return null;

  console.log("loaded Structure", structure);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Controls */}
      <div className="px-6 pt-1.5 flex gap-2">
        <button
          onClick={undo}
          disabled={!undoStack.length}
          className="px-3 py-1.5 text-sm rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
        >
          Undo
        </button>
      </div>

      {/* Split view */}
      <div className="flex flex-1 overflow-hidden p-4 gap-4">
        {/* LEFT COLUMN (atoms + lattice) */}
        <div className="w-[425px] min-w-[380px] max-w-[450px] flex flex-col gap-3">
          {/* ATOMS TABLE (max 2/3) */}
          <div className="bg-white rounded-md border border-b-0 overflow-hidden flex flex-col max-h-[66.9%]">
            <div className="overflow-y-auto">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead className="sticky top-0 bg-gray-100 text-gray-700 text-[12px]">
                  <tr>
                    <th className="px-2 py-1 text-left border-b">#</th>
                    <th className="px-2 py-1 text-left border-b">Species</th>
                    <th className="px-2 py-1 text-left border-b">X</th>
                    <th className="px-2 py-1 text-left border-b">Y</th>
                    <th className="px-2 py-1 text-left border-b">Z</th>
                    <th className="px-2 py-1 text-left border-b">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {structure.sites.map((site, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 text-[12px]">
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

          {/* LATTICE (fills remaining space) */}
          <div className="bg-white rounded-md border border-b-0 overflow-hidden">
            <div className="px-3 py-2 border-b bg-gray-50">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Lattice
              </h3>
            </div>

            <div className="overflow-y-auto max-h-[150px]">
              <table className="w-full text-xs border-separate border-spacing-0">
                <thead className="bg-gray-100 text-gray-600"></thead>
                <tbody>
                  {structure.lattice.map((vec, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-1 border-b font-mono">
                        {vec[0].toFixed(3)}
                      </td>
                      <td className="px-2 py-1 border-b font-mono">
                        {vec[1].toFixed(3)}
                      </td>
                      <td className="px-2 py-1 border-b font-mono">
                        {vec[2].toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT: VISUALIZER */}
        <div className="flex-1 bg-white overflow-hidden relative">
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
  );
}
