import { useState, useCallback, useRef } from "react";
import { getSymmetry, supercell } from "matsci-parse";

import Modal from "../../common/Modal";
import { formatSpaceGroupSymbol } from "../../common/textFormatting";

export default function SymmetryPanel({ structure, setStructure, pushUndo }) {
  const [open, setOpen] = useState(false);
  // The analysis is only valid for the structure it was computed from. This
  // component is reused across tabs and edits, so track which one that was.
  const [analysis, setAnalysis] = useState(null);
  const [analyzedFor, setAnalyzedFor] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const latestStructure = useRef(structure);
  latestStructure.current = structure;

  const runAnalysis = useCallback(async () => {
    const target = structure;
    setAnalyzing(true);
    try {
      let result;
      try {
        result = await getSymmetry(target);
      } catch {
        const sc = supercell(target, [2, 2, 2]);
        result = await getSymmetry(sc);
      }
      // Drop results for a structure that is no longer current (tab switch
      // or edit while the analysis was running).
      if (latestStructure.current !== target) return;
      setAnalysis(result);
      setAnalyzedFor(target);
    } catch (e) {
      console.error("analyzeCrystal failed:", e);
    } finally {
      setAnalyzing(false);
    }
  }, [structure]);

  const isCurrent = analysis !== null && analyzedFor === structure;

  const handleOpen = () => {
    setOpen(true);
    if (!isCurrent) runAnalysis();
  };

  const applySym = useCallback(
    (mode = "conventional") => {
      if (!analysis || analyzedFor !== structure) return;
      pushUndo({
        action: "symmetry-transform",
        label: `Symmetry → ${mode}`,
      });
      setStructure(
        mode === "primitive" ? analysis.primitive : analysis.conventional,
      );
    },
    [analysis, analyzedFor, structure, pushUndo, setStructure],
  );

  const calc = isCurrent ? analysis.calculationResults : undefined;
  const cleanSymbol = calc?.hm_symbol?.replace(/\s+/g, "");

  return (
    <>
      <button onClick={handleOpen} title="Detect crystal symmetry and view space group information" className="buttonSimple blue w-full">
        Analyze Symmetry
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Symmetry Analysis"
        maxWidth="max-w-lg"
        footer={
          analysis && calc ? (
            <div className="flex gap-2">
              <button
                onClick={() => applySym("conventional")}
                title="Apply the conventional cell transformation"
                className="px-3 py-1.5 text-sm rounded-md bg-lime-100 hover:bg-lime-200 text-lime-800"
              >
                Apply Conventional
              </button>
              <button
                onClick={() => applySym("primitive")}
                title="Apply the primitive cell transformation"
                className="px-3 py-1.5 text-sm rounded-md bg-green-100 hover:bg-green-200 text-green-800"
              >
                Apply Primitive
              </button>
            </div>
          ) : null
        }
      >
        <div className="space-y-4">
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="px-3 py-1.5 text-sm rounded-md bg-blue-100 hover:bg-blue-200 disabled:opacity-40"
          >
            {analyzing ? "Analyzing..." : "Recalculate"}
          </button>

          {analysis && calc && (
            <table className="w-full text-xs border-separate border-spacing-0">
              <tbody>
                <tr>
                  <td className="px-3 py-1.5 text-gray-500 border-b">
                    Space group
                  </td>
                  <td className="px-3 py-1.5 font-mono border-b">
                    {calc.number ?? "-"} (
                    {formatSpaceGroupSymbol(cleanSymbol) ?? "-"})
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5 text-gray-500 border-b">
                    Pearson
                  </td>
                  <td className="px-3 py-1.5 font-mono border-b">
                    {calc.pearson_symbol ?? "-"}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5 text-gray-500 border-b">Hall #</td>
                  <td className="px-3 py-1.5 font-mono border-b">
                    {calc.hall_number ?? "-"}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5 text-gray-500 border-b">
                    Symmetrized sites
                  </td>
                  <td className="px-3 py-1.5 font-mono border-b">
                    {calc?.prim_std_cell?.positions?.length ?? "-"}
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {isCurrent && !calc && (
            <p className="text-sm text-gray-500">
              No symmetry data found for this structure.
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
