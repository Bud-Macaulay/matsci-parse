import { useState, useEffect, useCallback } from "react";
import { getSymmetry } from "matsci-parse";

import BaseTable from "../../common/BaseTable";
import { formatSpaceGroupSymbol } from "../../common/textFormatting";

export default function SymmetrySubpanel({
  structure,
  setStructure,
  pushUndo,
}) {
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [autoAnalyze, setAutoAnalyze] = useState(false);

  const runAnalysis = useCallback(async (targetStructure) => {
    setAnalyzing(true);

    try {
      const result = await getSymmetry(targetStructure);
      setAnalysis(result);
    } catch (e) {
      console.error("analyzeCrystal failed:", e);
    } finally {
      setAnalyzing(false);
    }
  }, []);

  // reset + optionally re-run when structure changes
  useEffect(() => {
    setAnalysis(null);

    if (autoAnalyze) {
      runAnalysis(structure);
    }
  }, [structure, autoAnalyze, runAnalysis]);

  // manual trigger
  const runManualAnalysis = () => {
    runAnalysis(structure);
  };

  const applySym = useCallback(
    (mode = "conventional") => {
      if (!analysis) return;

      pushUndo({
        action: "symmetry-transform",
        label: `Symmetry → ${mode}`,
      });

      const newStructure =
        mode === "primitive" ? analysis.primitive : analysis.conventional;

      setStructure(newStructure);
    },
    [analysis, pushUndo, setStructure],
  );

  const calc = analysis?.calculationResults;

  const cleanSymbol = calc?.hm_symbol?.replace(/\s+/g, "");

  return (
    <div className="flex flex-col gap-2">
      {/* Controls */}
      <div className="flex flex-row gap-2 items-center">
        <button
          onClick={runManualAnalysis}
          disabled={analyzing}
          className="px-3 py-1.5 text-sm rounded-md bg-blue-100 hover:bg-blue-200 disabled:opacity-40"
        >
          {analyzing ? "Analyzing..." : "Analyze symmetry"}
        </button>

        <label className="flex items-center gap-1 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={autoAnalyze}
            onChange={(e) => setAutoAnalyze(e.target.checked)}
          />
          Calculate on change
        </label>
      </div>

      {/* Results */}
      {analysis && calc && (
        <BaseTable title="Symmetry">
          <tr>
            <td className="px-3 py-1 text-gray-500 border-b">Space group #</td>
            <td className="px-3 py-1 font-mono border-b">
              {calc.number ?? "-"} ({formatSpaceGroupSymbol(cleanSymbol) ?? "-"}
              )
            </td>
          </tr>

          <tr>
            <td className="px-3 py-1 text-gray-500 border-b">Pearson Sym.</td>
            <td className="px-3 py-1 font-mono border-b">
              {calc.pearson_symbol ?? "-"}
            </td>
          </tr>

          <tr>
            <td className="px-3 py-1 text-gray-500 border-b">Hall #</td>
            <td className="px-3 py-1 font-mono border-b">
              {calc.hall_number ?? "-"}
            </td>
          </tr>

          <tr>
            <td className="px-3 py-1 text-gray-500 border-b">
              Symmetrized site count
            </td>
            <td className="px-3 py-1 font-mono border-b">
              {calc?.prim_std_cell?.positions?.length ?? "-"}
            </td>
          </tr>

          <tr>
            <td colSpan={2} className="px-2 py-2 border-b">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-800">
                  Convert current structure to:
                </span>

                <button
                  onClick={() => applySym("conventional")}
                  className="px-2 py-1 rounded bg-lime-100 hover:bg-lime-200"
                >
                  Conventional
                </button>

                <button
                  onClick={() => applySym("primitive")}
                  className="px-2 py-1 rounded bg-green-100 hover:bg-green-200"
                >
                  Primitive
                </button>
              </div>
            </td>
          </tr>
        </BaseTable>
      )}
    </div>
  );
}
