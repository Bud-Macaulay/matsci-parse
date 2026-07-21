import { useState, useCallback } from "react";
import { useHotkey } from "@tanstack/react-hotkeys";
import {
  canonicalize,
  replaceSite,
  removeSite,
  replaceSites,
  removeSites,
  findSitesBySpecies,
  elementBySymbol,
} from "matsci-parse";

import AtomTable from "./AtomTable";
import LatticePanel from "./LatticePanel";
import VisualizerPane from "./VisualizerPane";
import HistoryBar from "./HistoryBar";
import SpeciesModal from "./SpeciesModal";
import SymmetryPanel from "./SymmetrySubPanel";
import TransformLatticePanel from "./TransformLatticePanel";
import AddAtomPanel from "./AddAtomPanel";
import DistanceMatrixPanel from "./DistanceMatrixPanel";
import SlabModal from "./SlabModal";

export default function MainPanel({ tab, updateTab }) {
  const [speciesModal, setSpeciesModal] = useState({ open: false, mode: null });
  const [editingCell, setEditingCell] = useState(null);
  const [cellValue, setCellValue] = useState("");

  const pushUndo = useCallback(
    (meta = {}) => {
      updateTab((t) => ({
        ...t,
        undoStack: [
          ...t.undoStack,
          { structure: t.structure, timestamp: Date.now(), ...meta },
        ],
        redoStack: [],
      }));
    },
    [updateTab],
  );

  const setStructure = useCallback(
    (s) => updateTab((t) => ({ ...t, structure: s })),
    [updateTab],
  );

  const undo = useCallback(() => {
    updateTab((t) => {
      if (!t.undoStack.length) return t;
      const last = t.undoStack[t.undoStack.length - 1];
      return {
        ...t,
        undoStack: t.undoStack.slice(0, -1),
        redoStack: [
          ...t.redoStack,
          { structure: t.structure, label: last.label, timestamp: Date.now() },
        ],
        structure: last.structure,
      };
    });
  }, [updateTab]);

  const redo = useCallback(() => {
    updateTab((t) => {
      if (!t.redoStack.length) return t;
      const last = t.redoStack[t.redoStack.length - 1];
      return {
        ...t,
        redoStack: t.redoStack.slice(0, -1),
        undoStack: [
          ...t.undoStack,
          { structure: t.structure, label: last.label, timestamp: Date.now() },
        ],
        structure: last.structure,
      };
    });
  }, [updateTab]);

  useHotkey("Mod+z", undo);
  useHotkey("Mod+Shift+z", redo);
  useHotkey("Mod+y", redo);

  if (!tab) return null;

  const { structure, undoStack = [], redoStack = [] } = tab;

  if (!structure) return null;

  const commitCellEdit = () => {
    if (!editingCell) return;
    const { idx, field } = editingCell;
    const value = cellValue;

    if (field === "species") {
      const sym = value.trim();
      if (
        !sym ||
        !elementBySymbol[sym] ||
        sym === structure.sites[idx].species.symbol
      ) {
        setEditingCell(null);
        return;
      }
      pushUndo({
        action: "replace-site",
        label: `Changed atom ${idx} to ${sym}`,
      });
      setStructure(
        replaceSite(structure, idx, {
          ...structure.sites[idx],
          species: { symbol: sym },
        }),
      );
    } else {
      const num = parseFloat(value);
      if (isNaN(num)) {
        setEditingCell(null);
        return;
      }
      const axis = ["x", "y", "z"].indexOf(field);
      if (num === structure.sites[idx].frac[axis]) {
        setEditingCell(null);
        return;
      }

      pushUndo({
        action: "edit-coord",
        label: `Edited atom ${idx} ${field.toUpperCase()}`,
      });
      const newFrac = new Float64Array(structure.sites[idx].frac);
      newFrac[axis] = num;
      setStructure(
        replaceSite(structure, idx, { ...structure.sites[idx], frac: newFrac }),
      );
    }
    setEditingCell(null);
  };

  const remove = (idx) => {
    pushUndo({ action: "remove-site", label: `Removed atom ${idx}` });
    setStructure(removeSite(structure, idx));
  };

  const replaceAllSpecies = (oldSp, newSp) => {
    pushUndo({
      action: "replace-species",
      label: `Replaced ${oldSp} with ${newSp}`,
    });
    const indices = findSitesBySpecies(
      structure,
      structure.sites.find((s) => s.species.symbol === oldSp)?.species,
    );
    setStructure(
      replaceSites(
        structure,
        indices.map((i) => ({
          index: i,
          site: { ...structure.sites[i], species: { symbol: newSp } },
        })),
      ),
    );
  };

  const removeAllSpecies = (sp) => {
    pushUndo({ action: "remove-species", label: `Removed all ${sp}` });
    setStructure(
      removeSites(structure, findSitesBySpecies(structure, { symbol: sp })),
    );
  };

  const onCanonicalize = () => {
    pushUndo({ action: "canonicalize", label: "Canonicalized structure" });
    setStructure(canonicalize(structure));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <HistoryBar
        undoStack={undoStack}
        onUndo={undo}
        onRedo={redo}
        redoDisabled={!redoStack.length}
      />

      <div className="flex flex-1 overflow-hidden p-4 gap-4">
        {/* LEFT COLUMN */}
        <div className="w-[425px] min-w-[380px] max-w-[450px] flex flex-col gap-4 overflow-y-auto">
          <div className="flex justify-between items-center text-[12px]">
            <span className="text-sm">Atoms ({structure.sites.length})</span>
            <div className="flex gap-2">
              <button
                onClick={onCanonicalize}
                title="Wrap fractional coords to [0,1), clean near-zero values, and sort sites"
                className="buttonSimple blue"
              >
                Canonicalize
              </button>
              <button
                onClick={() => setSpeciesModal({ open: true, mode: "remove" })}
                title="Remove all atoms of a chosen element"
                className="buttonSimple red"
              >
                Remove Species
              </button>
              <button
                onClick={() => setSpeciesModal({ open: true, mode: "replace" })}
                title="Replace all atoms of one element with another"
                className="buttonSimple gray"
              >
                Replace Species
              </button>
            </div>
          </div>

          <AtomTable
            structure={structure}
            editingCell={editingCell}
            cellValue={cellValue}
            setEditingCell={setEditingCell}
            setCellValue={setCellValue}
            onCommitEdit={commitCellEdit}
            onRemove={remove}
          />

          <AddAtomPanel
            structure={structure}
            setStructure={setStructure}
            pushUndo={pushUndo}
          />
          <LatticePanel lattice={structure.lattice} />
          <TransformLatticePanel
            structure={structure}
            setStructure={setStructure}
            pushUndo={pushUndo}
          />

          <div className="grid grid-cols-3 gap-2">
            <SymmetryPanel
              structure={structure}
              setStructure={setStructure}
              pushUndo={pushUndo}
            />
            <DistanceMatrixPanel structure={structure} />
            <SlabModal
              structure={structure}
              setStructure={setStructure}
              pushUndo={pushUndo}
            />
          </div>
        </div>

        {/* RIGHT: VISUALIZER */}
        <VisualizerPane structure={structure} setStructure={setStructure} pushUndo={pushUndo} />
      </div>

      <SpeciesModal
        open={speciesModal.open}
        mode={speciesModal.mode}
        onClose={() => setSpeciesModal({ open: false, mode: null })}
        structure={structure}
        onRemoveAll={removeAllSpecies}
        onReplaceAll={replaceAllSpecies}
      />
    </div>
  );
}
