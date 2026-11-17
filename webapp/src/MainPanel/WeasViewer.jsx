// Demo: the structure in WEAS (https://github.com/superstar54/weas, branch
// materialscloud) instead of mc-react-structure-visualizer. Edits made in
// WEAS (move, rotate, delete, replace atoms) come back as a new structure.
import { useEffect, useRef } from "react";
import { Atoms, WEAS } from "weas";
import { cartesian, createLattice, createSite, createSpecies, fractional } from "matsci-parse";

/** matsci-parse structure -> WEAS Atoms (symbols, Cartesian positions, cell rows). */
function toWeasAtoms(structure) {
  const b = structure.lattice.basis.data;
  return new Atoms({
    symbols: structure.sites.map((site) => site.species.symbol),
    positions: structure.sites.map((site) => Array.from(cartesian(structure.lattice, site))),
    cell: [
      [b[0], b[1], b[2]],
      [b[3], b[4], b[5]],
      [b[6], b[7], b[8]],
    ],
    pbc: [true, true, true],
  });
}

/** WEAS Atoms -> matsci-parse structure. */
function fromWeasAtoms(atoms) {
  const lattice = createLattice(new Float64Array(atoms.cell.flat()));
  return {
    lattice,
    sites: atoms.symbols.map((symbol, i) =>
      createSite(createSpecies(symbol), fractional(lattice, atoms.positions[i])),
    ),
  };
}

export default function WeasViewer({ structure, setStructure, pushUndo }) {
  const container = useRef(null);
  const viewer = useRef(null);
  const applying = useRef(false); // we are setting WEAS's atoms ourselves
  const fromWeas = useRef(null); // the last structure WEAS sent up

  // One viewer per mount; its edits go up as a new structure
  useEffect(() => {
    const el = container.current;
    viewer.current = new WEAS({
      domElement: el,
      viewerConfig: { modelStyle: 1 },
      guiConfig: { controls: { enabled: false } }, // no WEAS settings panel
    });
    const onAtomsUpdated = () => {
      if (applying.current || !viewer.current) return;
      const edited = fromWeasAtoms(viewer.current.avr.atoms);
      fromWeas.current = edited;
      pushUndo?.({ action: "weas-edit", label: "Edited in WEAS" });
      setStructure?.(edited);
    };
    el.addEventListener("atomsUpdated", onAtomsUpdated);
    return () => {
      el.removeEventListener("atomsUpdated", onAtomsUpdated);
      viewer.current = null;
      el.replaceChildren();
    };
    // setStructure/pushUndo are stable callbacks of the main panel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A structure from elsewhere (not the one WEAS just sent): show it
  useEffect(() => {
    if (!viewer.current || !structure || structure === fromWeas.current) return;
    applying.current = true;
    try {
      viewer.current.avr.atoms = toWeasAtoms(structure);
      viewer.current.render();
    } finally {
      applying.current = false;
    }
  }, [structure]);

  return <div ref={container} className="absolute inset-0" />;
}
