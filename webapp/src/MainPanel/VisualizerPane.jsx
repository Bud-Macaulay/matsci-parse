import { useMemo /* , useState */ } from "react";
import StructureVisualizer from "mc-react-structure-visualizer";
// import WeasViewer from "./WeasViewer"; // WEAS demo, commented out
import StructureDownload from "../common/structureDownload";
import QEInputButton from "../common/QEInputButton";
import { hillFormula, density, volume } from "matsci-parse";

export default function VisualizerPane({ structure /* , setStructure, pushUndo: for WEAS */ }) {
  // Demo: compare WEAS with mc-react-structure-visualizer (commented out)
  // const [viewer, setViewer] = useState("weas");
  const stats = useMemo(() => {
    let formula = "";
    let vol = "";
    let dens = "";

    try {
      formula = hillFormula(structure);
    } catch {
      formula = "-";
    }

    try {
      vol = `${volume(structure).toFixed(1)} Å³`;
    } catch {
      vol = "-";
    }

    try {
      const d = density(structure);
      dens = d > 0 ? `${d.toFixed(3)} amu/Å³` : "-";
    } catch {
      dens = "-";
    }

    return { formula, vol, dens };
  }, [structure]);
  return (
    <div className="flex-1 bg-white overflow-hidden relative">
      <div className="absolute top-2 left-2 z-10 flex items-start gap-2">
        <QEInputButton structure={structure} />
        {/* <button
          type="button"
          className="rounded-md bg-slate-200/85 px-2 py-1 text-xs shadow-sm hover:bg-slate-300"
          onClick={() => setViewer(viewer === "weas" ? "mc" : "weas")}
        >
          Viewer: {viewer === "weas" ? "WEAS" : "mc-react-structure-visualizer"}
        </button> */}
      </div>
      <div className="absolute top-2 right-2 z-10">
        <StructureDownload structure={structure} />
      </div>

      {/* {viewer === "weas" ? (
        <WeasViewer structure={structure} setStructure={setStructure} pushUndo={pushUndo} />
      ) : ( */}
      <StructureVisualizer structure={structure} initSupercell={[1, 1, 1]} />
      {/* )} */}
      <div className="absolute bottom-25 right-2 z-10 bg-slate-200/85 backdrop-blur-sm rounded-md px-3 py-1.5 shadow-sm text-xs">
        <span className="font-medium">{stats.formula}</span>
        <span className="text-gray-400 mx-1.5">&middot;</span>
        <span className="text-gray-500">{stats.vol}</span>
        <span className="text-gray-400 mx-1.5">&middot;</span>
        <span className="text-gray-500">{stats.dens}</span>
      </div>
    </div>
  );
}
