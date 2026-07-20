import StructureVisualizer from "mc-react-structure-visualizer";
import StructureDownload from "../common/structureDownload";
import QEInputButton from "../common/QEInputButton";
import { hillFormula, density, volume } from "matsci-parse";

export default function VisualizerPane({ structure }) {
  return (
    <div className="flex-1 bg-white overflow-hidden relative">
      <div className="absolute top-2 right-2 z-10">
        <StructureDownload structure={structure} />
      </div>
      <div className="absolute top-2 left-2 z-10">
        <QEInputButton structure={structure} />
      </div>
      <StructureVisualizer structure={structure} initSupercell={[1, 1, 1]} />
      <div className="absolute bottom-2 right-2 z-10 bg-slate-200/85 backdrop-blur-sm rounded-md px-3 py-1.5 shadow-sm text-xs">
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
