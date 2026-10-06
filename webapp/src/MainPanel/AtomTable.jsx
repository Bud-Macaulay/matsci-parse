import { useState } from "react";
import { replaceSite, elementBySymbol } from "matsci-parse";

export default function AtomTable({
  structure,
  pushUndo,
  setStructure,
  onRemove,
}) {
  // Local edit state: keystrokes re-render only this table,
  // not MainPanel or the 3D visualizer.
  const [editingCell, setEditingCell] = useState(null);
  const [cellValue, setCellValue] = useState("");

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

  return (
    <div className="bg-white rounded-md border border-b-0 overflow-hidden flex flex-col max-h-[25%]">
      <div className="overflow-y-auto">
        <table className="table-nice">
          <thead>
            <tr>
              <th className="w-8">#</th>
              <th className="w-16">Species</th>
              <th className="w-[70px]">X</th>
              <th className="w-[70px]">Y</th>
              <th className="w-[70px]">Z</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {structure.sites.map((site, idx) => (
              <tr key={idx} className="hover:bg-gray-50 text-[12px]">
                <td className="px-2 py-1 border-b">{idx}</td>
                {["species", "x", "y", "z"].map((field) => {
                  const isEditing =
                    editingCell?.idx === idx && editingCell?.field === field;
                  const display =
                    field === "species"
                      ? site.species.symbol
                      : site.frac[["x", "y", "z"].indexOf(field)].toFixed(3);

                  return (
                    <td
                      key={field}
                      className={`px-1 py-1 border-b font-mono cursor-pointer ${
                        isEditing ? "bg-blue-50" : ""
                      }`}
                      onClick={() => {
                        setEditingCell({ idx, field });
                        setCellValue(
                          field === "species"
                            ? site.species.symbol
                            : site.frac[
                                ["x", "y", "z"].indexOf(field)
                              ].toString(),
                        );
                      }}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          type={field === "species" ? "text" : "number"}
                          step={field === "species" ? undefined : "0.001"}
                          value={cellValue}
                          onChange={(e) => setCellValue(e.target.value)}
                          onBlur={commitCellEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitCellEdit();
                            if (e.key === "Escape") setEditingCell(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-1 py-0.5 text-[11px] border border-blue-300 rounded bg-white font-mono tabular-nums"
                        />
                      ) : (
                        display
                      )}
                    </td>
                  );
                })}
                <td className="px-1 py-1 border-b text-center">
                  <button
                    onClick={() => onRemove(idx)}
                    className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 text-sm font-medium leading-none"
                    title="Remove atom"
                  >
                    &times;
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
