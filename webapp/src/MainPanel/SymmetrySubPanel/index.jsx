import { useState, useCallback } from "react";
import { getSymmetry } from "matsci-parse";

import Modal from "../../common/Modal";
import { formatSpaceGroupSymbol } from "../../common/textFormatting";

export default function SymmetryPanel({ structure, setStructure, pushUndo }) {
  const [open, setOpen] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const runAnalysis = useCallback(async () => {
    setAnalyzing(true);
    try {
      const result = await getSymmetry(structure);
      setAnalysis(result);
    } catch (e) {
      console.error("analyzeCrystal failed:", e);
    } finally {
      setAnalyzing(false);
    }
  }, [structure]);

  const handleOpen = () => {
    setOpen(true);
    if (!analysis) runAnalysis();
  };

  const applySym = useCallback(
    (mode = "conventional") => {
      if (!analysis) return;
      pushUndo({
        action: "symmetry-transform",
        label: `Symmetry → ${mode}`,
      });
      setStructure(mode === "primitive" ? analysis.primitive : analysis.conventional);
    },
    [analysis, pushUndo, setStructure],
  );

  const calc = analysis?.calculationResults;
  const cleanSymbol = calc?.hm_symbol?.replace(/\s+/g, "");

  return (
    <>
      <button onClick={handleOpen} className="buttonSimple blue w-full">
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
                className="px-3 py-1.5 text-sm rounded-md bg-lime-100 hover:bg-lime-200 text-lime-800"
              >
                Apply Conventional
              </button>
              <button
                onClick={() => applySym("primitive")}
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
                  <td className="px-3 py-1.5 text-gray-500 border-b">Space group</td>
                  <td className="px-3 py-1.5 font-mono border-b">
                    {calc.number ?? "-"} ({formatSpaceGroupSymbol(cleanSymbol) ?? "-"})
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5 text-gray-500 border-b">Pearson</td>
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
                  <td className="px-3 py-1.5 text-gray-500 border-b">Symmetrized sites</td>
                  <td className="px-3 py-1.5 font-mono border-b">
                    {calc?.prim_std_cell?.positions?.length ?? "-"}
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {analysis && !calc && (
            <p className="text-sm text-gray-500">No symmetry data found for this structure.</p>
          )}
        </div>
      </Modal>
    </>
  );
}
