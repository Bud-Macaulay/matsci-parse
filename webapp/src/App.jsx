import { useState } from "react";
import {
  pwToStructure,
  xsfToStructure,
  xyzToStructure,
  poscarToStructure,
  cifToStructure,
  structureToCif,
} from "matsci-parse";
import StructureVisualizer from "mc-react-structure-visualizer";
import "./styles.css";

import detectFormat from "./common/detectFormat";
import StructureDownload from "./common/structureDownload";

export default function App() {
  const [structure, setStructure] = useState(null);
  const [cifText, setCifText] = useState("");
  const [error, setError] = useState("");
  const [scaleValue, setScaleValue] = useState(1);
  const [undoStack, setUndoStack] = useState([]);

  const saveUndo = (s) => setUndoStack((prev) => [...prev, structureToCif(s)]);

  const handleFile = async (event) => {
    setError("");
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const format = detectFormat(text);
      let parsed;

      switch (format) {
        case "pw":
          parsed = pwToStructure(text);
          break;
        case "cif":
          parsed = cifToStructure(text);
          break;
        case "xsf":
          parsed = xsfToStructure(text);
          break;
        case "xyz":
          parsed = xyzToStructure(text);
          break;
        case "poscar":
          parsed = poscarToStructure(text);
          break;
        default:
          throw new Error("Unsupported or unrecognized file format");
      }

      setStructure(parsed);
      setCifText(structureToCif(parsed));
      setUndoStack([]);
    } catch (err) {
      setError(err.message);
      setStructure(null);
      setCifText("");
    }
  };

  const replaceSite = (idx, newSpecies) => {
    if (!structure) return;
    saveUndo(structure);
    structure.replaceSite(idx, newSpecies);
    setStructure(structure);
    setCifText(structureToCif(structure));
  };

  const removeSite = (idx) => {
    if (!structure) return;
    saveUndo(structure);
    structure.removeSite(idx);
    setStructure(structure);
    setCifText(structureToCif(structure));
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    const lastCif = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    const lastStructure = cifToStructure(lastCif);
    setStructure(lastStructure);
    setCifText(lastCif);
  };

  return (
    <div className="App">
      <h1>Matsci Parse demo</h1>

      <label className="file-upload">
        Choose File
        <input type="file" onChange={handleFile} />
      </label>

      <div>Supported formats: P1-cif, ext-XYZ, xsf, POSCAR</div>

      <div>
        <strong>Note:</strong> Modifications to the supercell is strictly visual
        only
      </div>

      {error && <p className="error">{error}</p>}

      {structure && (
        <>
          <div className="controls">
            <button onClick={undo} disabled={undoStack.length === 0}>
              Undo
            </button>
          </div>

          <div className="app-content">
            <div className="site-table-container">
              <table className="site-table">
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
                    <tr key={idx}>
                      <td>{idx}</td>
                      <td>{structure.species[site.speciesIndex]}</td>
                      <td>{site.cart[0].toFixed(3)}</td>
                      <td>{site.cart[1].toFixed(3)}</td>
                      <td>{site.cart[2].toFixed(3)}</td>
                      <td>
                        <button
                          onClick={() => {
                            const newSp = prompt(
                              "New species:",
                              structure.species[site.speciesIndex],
                            );
                            if (newSp) replaceSite(idx, newSp);
                          }}
                        >
                          Replace
                        </button>
                        <button onClick={() => removeSite(idx)}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="visualizer-container">
              <StructureVisualizer
                key={cifText}
                cifText={cifText}
                initSupercell={[1, 1, 1]}
              />
            </div>
          </div>

          <div className="download-wrapper">
            <StructureDownload structure={structure} />
          </div>
        </>
      )}
    </div>
  );
}
