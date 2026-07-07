import StructureVisualizer from "mc-react-structure-visualizer";

import BaseTable from "../common/BaseTable";
import StructureDownload from "../common/structureDownload";

import SymmetrySubpanel from "./SymmetrySubPanel";
import TransformLatticePanel from "./TransformLatticePanel";

import {
  replaceSite,
  removeSite,
  replaceSites,
  removeSites,
  findSitesBySpecies,
} from "matsci-parse";

function replaceSpecies(structure, oldSpecies, newSpecies) {
  const indices = findSitesBySpecies(
    structure,
    structure.sites.find((s) => s.species.symbol === oldSpecies)?.species,
  );

  return replaceSites(
    structure,
    indices.map((index) => ({
      index,
      site: {
        ...structure.sites[index],
        species: {
          symbol: newSpecies,
        },
      },
    })),
  );
}

function removeSpecies(structure, species) {
  const indices = findSitesBySpecies(structure, {
    symbol: species,
  });

  return removeSites(structure, indices);
}

export default function MainPanel({ tab, updateTab }) {
  if (!tab) return null;

  const { structure, undoStack = [], redoStack = [] } = tab;

  const pushUndo = (meta = {}) => {
    updateTab((t) => ({
      ...t,
      undoStack: [
        ...t.undoStack,
        {
          structure: t.structure,
          timestamp: Date.now(),
          ...meta,
        },
      ],
      redoStack: [],
    }));
  };

  const setStructure = (newStructure) => {
    updateTab((t) => ({
      ...t,
      structure: newStructure,
    }));
  };

  const replace = (idx, newSpecies) => {
    pushUndo({
      action: "replace-site",
      label: `Replaced atom ${idx} with ${newSpecies}`,
    });

    const currentPos = structure.sites[idx].frac;
    const newSite = { species: { symbol: newSpecies }, frac: currentPos };

    const newStructure = replaceSite(structure, idx, newSite);

    setStructure(newStructure);
  };

  const remove = (idx) => {
    pushUndo({
      action: "replace-site",
      label: `Removed atom ${idx}`,
    });

    const newStructure = removeSite(structure, idx);

    setStructure(newStructure);
  };

  const replaceAllSpecies = (oldSpecies, newSpecies) => {
    pushUndo({
      action: "replace-species",
      label: `Replaced ${oldSpecies} with ${newSpecies}`,
    });

    const newStructure = replaceSpecies(structure, oldSpecies, newSpecies);

    setStructure(newStructure);
  };

  const removeAllSpecies = (species) => {
    pushUndo({
      action: "remove-species",
      label: `Removed all ${species}`,
    });

    const newStructure = removeSpecies(structure, species);

    console.log(newStructure);

    setStructure(newStructure);
  };

  const undo = () => {
    updateTab((t) => {
      if (!t.undoStack.length) return t;

      const last = t.undoStack[t.undoStack.length - 1];

      return {
        ...t,
        undoStack: t.undoStack.slice(0, -1),
        redoStack: [
          ...t.redoStack,
          {
            structure: t.structure,
            label: last.label,
            timestamp: Date.now(),
          },
        ],
        structure: last.structure,
      };
    });
  };

  const redo = () => {
    updateTab((t) => {
      if (!t.redoStack.length) return t;

      const last = t.redoStack[t.redoStack.length - 1];

      return {
        ...t,
        redoStack: t.redoStack.slice(0, -1),
        undoStack: [
          ...t.undoStack,
          {
            structure: t.structure,
            label: last.label,
            timestamp: Date.now(),
          },
        ],
        structure: last.structure,
      };
    });
  };

  if (!structure) return null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Controls */}
      <div className="px-6 py-2 flex items-center justify-between gap-3 border-b">
        {" "}
        {/* LEFT: undo/redo */}
        <div className="flex gap-2">
          <button
            onClick={undo}
            disabled={!undoStack.length}
            className="px-3 py-1.5 text-sm rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
          >
            Undo
          </button>

          <button
            onClick={redo}
            disabled={!redoStack || !redoStack.length}
            className="px-3 py-1.5 text-sm rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
          >
            Redo
          </button>
        </div>
        {/* RIGHT: history bar */}
        <div className="flex items-center gap-1 text-[11px] text-gray-600 overflow-x-auto max-w-[85%]">
          HISTORY:
          {undoStack.slice(-6).map((h, i) => (
            <div
              key={h.timestamp || i}
              className="px-2 py-2 bg-gray-50 border-r whitespace-nowrap"
              title={h.label || h.action}
            >
              {h.label || h.action || "edit"}
            </div>
          ))}
        </div>
      </div>

      {/* Split view */}
      <div className="flex flex-1 overflow-hidden p-4 gap-4">
        {/* LEFT COLUMN (atoms + lattice) */}
        <div className="w-[425px] min-w-[380px] max-w-[450px] flex flex-col gap-4">
          <div className="flex justify-between items-center text-[12px]">
            <span className="text-sm">Atoms ({structure.sites.length})</span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const oldSp = prompt("Remove species:");
                  if (!oldSp) return;

                  removeAllSpecies(oldSp);
                }}
                className="buttonSimple red"
              >
                Remove Species
              </button>
              <button
                onClick={() => {
                  const oldSp = prompt("Replace species:");
                  if (!oldSp) return;

                  const newSp = prompt(`Replace ${oldSp} with:`);
                  if (!newSp) return;

                  replaceAllSpecies(oldSp, newSp);
                }}
                className="buttonSimple gray"
              >
                Replace Species
              </button>
            </div>
          </div>
          {/* ATOMS TABLE (max 2/3) */}
          <div className="bg-white rounded-md border border-b-0 overflow-hidden flex flex-col max-h-[25%]">
            <div className="overflow-y-auto">
              <table className="table-nice">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Species</th>
                    <th>X</th>
                    <th>Y</th>
                    <th>Z</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {structure.sites.map((site, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 text-[12px]">
                      <td className="px-2 py-1 border-b">{idx}</td>
                      <td className="px-2 py-1 border-b">
                        {site.species.symbol}
                      </td>
                      <td className="px-2 py-1 border-b">
                        {site.frac[0].toFixed(3)}
                      </td>
                      <td className="px-2 py-1 border-b">
                        {site.frac[1].toFixed(3)}
                      </td>
                      <td className="px-2 py-1 border-b">
                        {site.frac[2].toFixed(3)}
                      </td>
                      <td className="px-2 py-1 border-b">
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              const newSp = prompt("New species:");
                              if (newSp) replace(idx, newSp);
                            }}
                            className="buttonSimple gray"
                          >
                            Replace
                          </button>

                          <button
                            onClick={() => remove(idx)}
                            className="buttonSimple red"
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

          {/* LATTICE */}
          <BaseTable title="Lattice">
            {Array.from({ length: structure.lattice.basis.rows }).map(
              (_, i) => {
                const { data, cols } = structure.lattice.basis;

                return (
                  <tr key={i} className="hover:bg-gray-50">
                    {Array.from({ length: cols }).map((_, j) => (
                      <td key={j} className="px-2 py-1 border-b font-mono">
                        {data[i * cols + j].toFixed(3)}
                      </td>
                    ))}
                  </tr>
                );
              },
            )}
          </BaseTable>

          {/* RECIP LATTICE
          <BaseTable title="Reciprocal Lattice">
            {reciprocalLattice?.map((vec, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-1 border-b font-mono">
                  {vec[0].toFixed(5)}
                </td>
                <td className="px-2 py-1 border-b font-mono">
                  {vec[1].toFixed(5)}
                </td>
                <td className="px-2 py-1 border-b font-mono">
                  {vec[2].toFixed(5)}
                </td>
              </tr>
            ))}
          </BaseTable> */}

          <SymmetrySubpanel
            structure={structure}
            setStructure={setStructure}
            pushUndo={pushUndo}
          />

          <TransformLatticePanel
            structure={structure}
            setStructure={setStructure}
            pushUndo={pushUndo}
          />
        </div>

        {/* RIGHT: VISUALIZER */}
        <div className="flex-1 bg-white overflow-hidden relative">
          <div className="absolute top-2 right-2 z-10">
            <StructureDownload structure={structure} />
          </div>

          <StructureVisualizer
            // key={cifText} dont pass cifText, to avoid regen.
            structure={structure}
            initSupercell={[1, 1, 1]}
          />
        </div>
      </div>
    </div>
  );
}
