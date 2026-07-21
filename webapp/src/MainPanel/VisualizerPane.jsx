import { useState } from "react";
import StructureVisualizer from "mc-react-structure-visualizer";
import StructureDownload from "../common/structureDownload";
import QEInputButton from "../common/QEInputButton";
import MLIPPanel from "../mlip/MLIPPanel.jsx";
import { hillFormula, density, volume } from "matsci-parse";

export default function VisualizerPane({ structure, setStructure, pushUndo }) {
  const [mlipOpen, setMlipOpen] = useState(false);

  return (
    <div className="flex-1 bg-white overflow-hidden relative">
      <div className="absolute top-2 left-2 z-10 flex items-start gap-2">
        <QEInputButton structure={structure} />
        <button
          onClick={() => setMlipOpen((v) => !v)}
          className="px-3 py-1.5 rounded-md bg-amber-500 text-white text-xs font-semibold hover:brightness-110 transition-all"
        >
          {mlipOpen ? "▾" : "▸"} MLIP Calculator
        </button>
      </div>
      <div className="absolute top-2 right-2 z-10">
        <StructureDownload structure={structure} />
      </div>

      {/* Commented out while likely broken */}
      {/* {mlipOpen && (
        <div className="absolute top-12 left-2 z-20 w-[400px] max-h-[60vh] overflow-y-auto shadow-xl">
          <MLIPPanel structure={structure} setStructure={setStructure} pushUndo={pushUndo} />
        </div>
      )} */}

      <StructureVisualizer structure={structure} initSupercell={[1, 1, 1]} />
      <div className="absolute bottom-25 right-2 z-10 bg-slate-200/85 backdrop-blur-sm rounded-md px-3 py-1.5 shadow-sm text-xs">
        <span className="font-medium">{hillFormula(structure)}</span>
        <span className="text-gray-400 mx-1.5">&middot;</span>
        <span className="text-gray-500">
          {volume(structure).toFixed(1)} &#197;&#179;
        </span>
        <span className="text-gray-400 mx-1.5">&middot;</span>
        <span className="text-gray-500">
          {density(structure).toFixed(3)} amu/&#197;&#179;
        </span>
      </div>
    </div>
  );
}
