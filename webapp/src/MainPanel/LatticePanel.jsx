import { useState } from "react";
import { parameters } from "matsci-parse";

export default function LatticePanel({ lattice }) {
  const [view, setView] = useState("matrix");

  return (
    <div className="bg-white rounded-md border overflow-hidden">
      <div className="px-3 py-2 border-b bg-gray-50 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Lattice
        </h3>
        <div className="flex bg-gray-200 rounded text-[11px] overflow-hidden">
          <button
            onClick={() => setView("matrix")}
            className={`px-2 py-0.5 ${view === "matrix" ? "bg-white shadow-sm font-medium" : "text-gray-500 hover:text-gray-700"}`}
          >
            Matrix
          </button>
          <button
            onClick={() => setView("params")}
            className={`px-2 py-0.5 ${view === "params" ? "bg-white shadow-sm font-medium" : "text-gray-500 hover:text-gray-700"}`}
          >
            Parameters
          </button>
        </div>
      </div>
      <div className="p-2">
        {view === "matrix" ? (
          <table className="w-full text-xs border-separate border-spacing-0">
            <tbody>
              {Array.from({ length: lattice.basis.rows }).map((_, i) => {
                const { data, cols } = lattice.basis;
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    {Array.from({ length: cols }).map((_, j) => (
                      <td key={j} className="px-2 py-1 border-b font-mono">
                        {data[i * cols + j].toFixed(3)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <LatticeParams lattice={lattice} />
        )}
      </div>
    </div>
  );
}

function LatticeParams({ lattice }) {
  const [a, b, c, alpha, beta, gamma] = parameters(lattice);

  const lengths = [
    { label: "a", value: a },
    { label: "b", value: b },
    { label: "c", value: c },
  ];

  const angles = [
    { label: "\u03B1", value: alpha },
    { label: "\u03B2", value: beta },
    { label: "\u03B3", value: gamma },
  ];

  return (
    <div className="px-3 py-2 text-xs space-y-1">
      <div className="flex gap-x-4">
        {lengths.map(({ label, value }) => (
          <span key={label} className="whitespace-nowrap">
            <span className="text-gray-500">{label} =</span>{" "}
            <span className="font-mono">{value.toFixed(3)}</span>
            <span className="text-gray-400 ml-0.5"> &#197;</span>
          </span>
        ))}
      </div>
      <div className="flex gap-x-4">
        {angles.map(({ label, value }) => (
          <span key={label} className="whitespace-nowrap">
            <span className="text-gray-500">{label} =</span>{" "}
            <span className="font-mono">{value.toFixed(3)}</span>
            <span className="text-gray-400 ml-0.5">&deg;</span>
          </span>
        ))}
      </div>
    </div>
  );
}
