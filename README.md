Here’s a clean README-style summary based strictly on your actual structure (no assumptions added).

---

# matsci-parse

A TypeScript-based library and web toolset for parsing, transforming, and analyzing atomistic materials science data, including crystal structures, symmetry data, and common simulation file formats.

This project is written to be functional, allowing tree-shakability.

---

### Project overview

#### `io/`

Parsers and data models for multiple file formats:

- CIF
- VASP (POSCAR, CHGCAR)
- Quantum ESPRESSO (pw)
- Gaussian cube files
- XYZ
- XSF
- AiiDA structure objects
- Generic crystal and molecular structures

#### `math/`

Linear algebra and crystallographic geometry utilities:

- Matrix operations
- Coordinate transformations
- Lattice calculations

#### `symmetry/`

Symmetry and reciprocal space tools:

- Space group data and operations (using moyo-wasm)

#### `units/`

Unit systems and conversions:

- Length units
- Energy units
- Angle units
- General conversion utilities

---

### A frontend demo of some of the utilities possible is available (`webapp/`)
