import { Structure } from "../structure/structure";
import { createLattice } from "../lattice/lattice";
import { VolumetricData, createVolumetricData } from "../volumetric/volumetric";
import { Site } from "../site/site";
import { Species } from "../species/species";
import { Matrix } from "../matrix/matrix";

export interface CHGCAROptions {
  includeAugmentation?: boolean;
  spinChannel?: "total" | "up" | "down" | "magnetization";
}

export function fromCHGCAR(
  text: string,
  options: CHGCAROptions = {},
): {
  volumetric: VolumetricData | VolumetricData[];
  structure: Structure;
  magnetization?: VolumetricData[];
} {
  const lines = text.split("\n");
  let lineIndex = 0;

  // Parse structure block (POSCAR format)
  const structure = parseStructureBlock(lines, lineIndex);
  lineIndex = structure.lineIndex;

  // Parse first FFT grid dimensions
  let gridLine = lines[lineIndex++].trim();
  while (gridLine === "" && lineIndex < lines.length) {
    gridLine = lines[lineIndex++].trim();
  }
  const gridParts = gridLine.split(/\s+/).map(Number);
  const ngx = gridParts[0];
  const ngy = gridParts[1];
  const ngz = gridParts[2];

  // Parse charge density data
  const totalGridPoints = ngx * ngy * ngz;
  const chargeData = parseVolumetricBlock(lines, lineIndex, totalGridPoints);
  lineIndex = chargeData.lineIndex;

  // Parse augmentation occupancies (skip for now)
  lineIndex = skipAugmentationBlock(lines, lineIndex);

  // Check for magnetization data (spin-polarized or noncollinear)
  const magnetizationData: VolumetricData[] = [];
  let hasMagnetization = false;

  // Try to read next grid dimensions for magnetization
  let nextLine = lines[lineIndex]?.trim();
  while (nextLine === "" && lineIndex < lines.length) {
    lineIndex++;
    nextLine = lines[lineIndex]?.trim();
  }

  if (nextLine && /^\s*\d+\s+\d+\s+\d+\s*$/.test(nextLine)) {
    hasMagnetization = true;
    const magGridParts = nextLine.split(/\s+/).map(Number);
    const magNgx = magGridParts[0];
    const magNgy = magGridParts[1];
    const magNgz = magGridParts[2];
    lineIndex++; // Consume grid line

    const magTotalPoints = magNgx * magNgy * magNgz;
    const magResult = parseVolumetricBlock(lines, lineIndex, magTotalPoints);

    // Create magnetization volumetric data
    const magVol = createVolumetricDataFromCHGCAR(
      magResult.data,
      [magNgx, magNgy, magNgz],
      structure.latticeVectors,
      options.spinChannel || "magnetization",
      true, // is magnetization
    );
    magnetizationData.push(magVol);
    lineIndex = magResult.lineIndex;
  }

  // Create the main volumetric data
  const volumetric = createVolumetricDataFromCHGCAR(
    chargeData.data,
    [ngx, ngy, ngz],
    structure.latticeVectors,
    options.spinChannel || "total",
    false, // is magnetization
  );

  return {
    volumetric,
    structure: structure.structure,
    ...(magnetizationData.length > 0 && { magnetization: magnetizationData }),
  };
}

interface StructureParseResult {
  structure: Structure;
  latticeVectors: number[][];
  lineIndex: number;
}

function parseStructureBlock(
  lines: string[],
  startIndex: number,
): StructureParseResult {
  let lineIndex = startIndex;

  // Parse header comment (line 1)
  const comment = lines[lineIndex++].trim();

  // Parse scaling factor (line 2)
  const scalingFactor = parseFloat(lines[lineIndex++]);

  // Parse lattice vectors (lines 3-5)
  const latticeVectors: number[][] = [];
  for (let i = 0; i < 3; i++) {
    const parts = lines[lineIndex++].trim().split(/\s+/).map(Number);
    latticeVectors.push(parts);
  }

  // Apply scaling factor to lattice vectors
  const scaledLatticeVectors = latticeVectors.map((row) =>
    row.map((val) => val * scalingFactor),
  );

  // Parse atomic species and counts
  let speciesNames: string[] = [];
  let speciesCounts: number[] = [];

  let speciesLine = lines[lineIndex++].trim().split(/\s+/);

  // Check if this line contains species names or counts
  if (speciesLine.some((part) => isNaN(Number(part)))) {
    speciesNames.push(...speciesLine);
    const countsLine = lines[lineIndex++].trim().split(/\s+/).map(Number);
    speciesCounts.push(...countsLine);
  } else {
    const counts = speciesLine.map(Number);
    const namesLine = lines[lineIndex++].trim().split(/\s+/);
    speciesNames.push(...namesLine);
    speciesCounts.push(...counts);
  }

  // Parse coordinate mode
  let coordMode = lines[lineIndex++].trim();
  if (coordMode.toLowerCase().startsWith("d")) {
    coordMode = "Direct";
  } else if (
    coordMode.toLowerCase().startsWith("c") ||
    coordMode.toLowerCase().startsWith("k")
  ) {
    coordMode = "Cartesian";
  }

  // Parse atomic coordinates
  const totalAtoms = speciesCounts.reduce((a, b) => a + b, 0);
  const coordinates: number[][] = [];
  for (let i = 0; i < totalAtoms; i++) {
    const parts = lines[lineIndex++].trim().split(/\s+/).map(Number);
    coordinates.push(parts);
  }

  // Build structure
  const structure = buildStructure(
    scaledLatticeVectors,
    speciesNames,
    speciesCounts,
    coordinates,
    coordMode,
  );

  return {
    structure,
    latticeVectors: scaledLatticeVectors,
    lineIndex,
  };
}

function parseVolumetricBlock(
  lines: string[],
  startIndex: number,
  totalPoints: number,
): { data: number[]; lineIndex: number } {
  const data: number[] = [];
  let lineIndex = startIndex;

  while (data.length < totalPoints && lineIndex < lines.length) {
    const line = lines[lineIndex++].trim();
    if (line === "") continue;
    const values = line.split(/\s+/).map(Number);
    data.push(...values);
  }

  return { data, lineIndex };
}

function skipAugmentationBlock(lines: string[], startIndex: number): number {
  let lineIndex = startIndex;

  // Augmentation occupancies are written with 5 values per line
  // We need to skip until we hit either:
  // 1. A line with 3 integers (next grid)
  // 2. End of file
  while (lineIndex < lines.length) {
    const line = lines[lineIndex].trim();
    if (line === "") {
      lineIndex++;
      continue;
    }

    // Check if this looks like grid dimensions (3 integers)
    const parts = line.split(/\s+/);
    if (parts.length === 3 && parts.every((p) => /^\d+$/.test(p))) {
      break;
    }

    // Check if we're at end of file or next block is empty
    if (lineIndex + 1 < lines.length && lines[lineIndex + 1].trim() === "") {
      // Check if the line after next is grid dimensions
      if (lineIndex + 2 < lines.length) {
        const nextNext = lines[lineIndex + 2].trim().split(/\s+/);
        if (nextNext.length === 3 && nextNext.every((p) => /^\d+$/.test(p))) {
          break;
        }
      }
    }

    lineIndex++;
  }

  return lineIndex;
}

function buildStructure(
  latticeVectors: number[][],
  speciesNames: string[],
  speciesCounts: number[],
  coordinates: number[][],
  coordMode: string,
): Structure {
  // Create lattice from vectors
  const lattice = createLattice(
    latticeVectors[0],
    latticeVectors[1],
    latticeVectors[2],
  );

  // Build sites
  const sites: Site[] = [];
  let atomIndex = 0;

  for (let i = 0; i < speciesNames.length; i++) {
    const speciesName = speciesNames[i];
    const count = speciesCounts[i];

    for (let j = 0; j < count; j++) {
      const coord = coordinates[atomIndex++];

      let fracCoord: [number, number, number];
      if (coordMode === "Cartesian") {
        // Convert Cartesian to fractional using inverse lattice
        // For CHGCAR, coordinates are usually fractional (Direct)
        // but we handle both cases
        const invLattice = Matrix.fromArray(latticeVectors).inverse();
        const cart = Matrix.fromArray([coord]);
        const frac = invLattice.multiply(cart.transpose());
        fracCoord = [frac.get(0, 0), frac.get(1, 0), frac.get(2, 0)];
      } else {
        fracCoord = [coord[0], coord[1], coord[2]];
      }

      const species = new Species(speciesName);
      const site = new Site(species, fracCoord, lattice);
      sites.push(site);
    }
  }

  return { lattice, sites };
}

function createVolumetricDataFromCHGCAR(
  dataValues: number[],
  grid: [number, number, number],
  latticeVectors: number[][],
  fieldType: string,
  isMagnetization: boolean,
): VolumetricData {
  const [ngx, ngy, ngz] = grid;
  const totalGridPoints = ngx * ngy * ngz;

  // Pad with zeros if data is incomplete
  const paddedData =
    dataValues.length < totalGridPoints
      ? [
          ...dataValues,
          ...new Array(totalGridPoints - dataValues.length).fill(0),
        ]
      : dataValues.slice(0, totalGridPoints);

  // CHGCAR stores data as: NX fastest, then NY, then NZ
  // Our VolumetricData expects: x fastest, then y, then z
  // So no reordering needed! The index function: ((z * H + y) * W + x) * channels + c
  // matches CHGCAR ordering where x varies fastest, then y, then z

  // Calculate cell volume
  const a = latticeVectors[0];
  const b = latticeVectors[1];
  const c = latticeVectors[2];

  // Cross product b × c
  const crossBc = [
    b[1] * c[2] - b[2] * c[1],
    b[2] * c[0] - b[0] * c[2],
    b[0] * c[1] - b[1] * c[0],
  ];

  // Dot product a · (b × c)
  const cellVolume = Math.abs(
    a[0] * crossBc[0] + a[1] * crossBc[1] + a[2] * crossBc[2],
  );

  const gridVolume = ngx * ngy * ngz;

  // Convert data to proper charge density units (1/Å³)
  // n(r) = data(r) / (V_grid * V_cell)
  const scaleFactor = 1.0 / (gridVolume * cellVolume);
  const scaledData = paddedData.map((val) => val * scaleFactor);

  // Create basis matrix from lattice vectors
  // The basis should be a 3x3 matrix where columns are lattice vectors
  const basis = Matrix.fromArray([
    [latticeVectors[0][0], latticeVectors[1][0], latticeVectors[2][0]],
    [latticeVectors[0][1], latticeVectors[1][1], latticeVectors[2][1]],
    [latticeVectors[0][2], latticeVectors[1][2], latticeVectors[2][2]],
  ]);

  const fieldName = isMagnetization
    ? `magnetization_${fieldType}`
    : `charge_density_${fieldType}`;

  // Create volumetric data
  return createVolumetricData({
    shape: [ngx, ngy, ngz],
    channels: 1,
    data: new Float64Array(scaledData),
    basis: basis,
    origin: [0, 0, 0],
    field: fieldName,
    metadata: {
      source: "CHGCAR",
      grid: [ngx, ngy, ngz],
      totalPoints: totalGridPoints,
      isMagnetization,
      cellVolume,
      gridVolume,
      scalingFactor: scaleFactor,
      fieldType,
    },
  });
}
