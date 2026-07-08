# matsci-parse

A TypeScript library and web toolset for parsing, transforming, and analyzing atomistic materials science data.

Crystal structures, periodic systems, volumetric fields (electron density, electrostatic potentials), symmetry operations, lattice geometry — all handled in a fully **functional**, **tree-shakeable** style.

```
pnpm add matsci-parse
```

---

### What's inside

| Module | What it does |
|---|---|
| **`io/`** | Parse/write CIF, VASP (POSCAR, CHGCAR), Quantum ESPRESSO (pw), XYZ, XSF, PDB, GRO, Gaussian cube, AiiDA, Optimade |
| **`structure/`** | Create, query, and manipulate crystal structures — sites, species, supercells, canonicalization, hashing |
| **`lattice/`** | Lattice creation (cubic, hexagonal, monoclinic, etc.), parameters, metric tensor, reciprocal space, volumes |
| **`symmetry/`** | Space group data, Brillouin zone paths (seekpath), symmetry operations via moyo-wasm |
| **`site/`** | Site-level operations: cartesian/fractional conversion, distances, periodic wrapping |
| **`species/`** | Element/species types with optional arbitrary properties |
| **`volumetric/`** | N-dimensional volumetric data arrays — creation, elementwise ops, channel ops, spatial transforms (crop, pad, resize, upsample, downsample, sample) |
| **`matrix/`** | Linear algebra primitives (3×3, 4×4): inverse, determinant, LLL reduction, vector ops |
| **`units/`** | Length, angle, and energy conversions |
| **`data/`** | Periodic table reference (symbols, atomic numbers, masses) |

---

### Quick example

```ts
import { fromCIF } from "matsci-parse";
import { volume } from "matsci-parse/core/lattice/volume";

const structure = fromCIF(cifText);
const V = volume(structure.lattice); // cell volume in Å³
```

### Docs

Full API reference: `pnpm run docs` → `docs/index.html`
