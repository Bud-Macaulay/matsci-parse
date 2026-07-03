import { Structure } from "../structure/structure";
import { VolumetricData, createVolumetricData } from "../volumetric/volumetric";
import { Matrix, identity } from "../matrix/matrix";
import { fromPOSCAR } from "./poscar";

export interface CHGCAROptions {
  spinChannel?: "total" | "up" | "down" | "magnetization";
  includeAugmentation?: boolean;
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

  // Find where the POSCAR part ends (after the coordinates)
  // The POSCAR part ends when we hit the grid dimensions (3 integers)
  let gridLineIndex = -1;

  // We need to find the first line with 3 integers (NGX, NGY, NGZ)
  // This marks the end of the POSCAR structure block
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "") continue;

    const parts = line.split(/\s+/).map(Number);
    // If we have 3 integers, this is the grid line
    if (
      parts.length === 3 &&
      parts.every((p) => Number.isInteger(p) && p > 0)
    ) {
      gridLineIndex = i;
      break;
    }
  }

  if (gridLineIndex === -1) {
    throw new Error("Could not find grid dimensions (NGX, NGY, NGZ) in CHGCAR");
  }

  // Get the POSCAR part (lines before the grid)
  const poscarLines = lines.slice(0, gridLineIndex);
  const poscarText = poscarLines.join("\n");

  // Parse the structure using the existing fromPOSCAR function
  const structure = fromPOSCAR(poscarText);

  // Parse grid dimensions
  const gridParts = lines[gridLineIndex].trim().split(/\s+/).map(Number);
  const [ngx, ngy, ngz] = gridParts;
  const totalGridPoints = ngx * ngy * ngz;

  // Parse the volumetric data (after the grid line)
  const dataValues: number[] = [];
  let lineIndex = gridLineIndex + 1;

  // Skip augmentation occupancies if present
  // We'll collect all numbers until we either:
  // 1. Have enough data for the grid
  // 2. Hit another grid line (for magnetization)
  // 3. Reach end of file

  while (lineIndex < lines.length && dataValues.length < totalGridPoints) {
    const line = lines[lineIndex++].trim();
    if (line === "") continue;

    // Check if this line could be another grid line (3 integers)
    const parts = line.split(/\s+/).map(Number);
    if (
      parts.length === 3 &&
      parts.every((p) => Number.isInteger(p) && p > 0)
    ) {
      // This is likely a new grid for magnetization
      break;
    }

    const values = line.split(/\s+/).map(Number);
    dataValues.push(...values);
  }

  // Get the lattice vectors from the structure
  // The basis from the lattice is already in the correct format
  const basis = structure.lattice.basis;

  // Create the volumetric data
  const volumetric = createVolumetricDataFromCHGCAR(
    dataValues,
    [ngx, ngy, ngz],
    basis,
    options.spinChannel || "total",
    false,
  );

  // Check if there's magnetization data (spin-polarized case)
  const magnetization: VolumetricData[] = [];
  if (lineIndex < lines.length) {
    // Try to read magnetization grid
    const nextLine = lines[lineIndex].trim();
    if (nextLine) {
      const parts = nextLine.split(/\s+/).map(Number);
      if (
        parts.length === 3 &&
        parts.every((p) => Number.isInteger(p) && p > 0)
      ) {
        // We found a second grid - this is spin-polarized
        const [magNgx, magNgy, magNgz] = parts;
        const magTotalPoints = magNgx * magNgy * magNgz;
        lineIndex++;

        const magData: number[] = [];
        while (lineIndex < lines.length && magData.length < magTotalPoints) {
          const line = lines[lineIndex++].trim();
          if (line === "") continue;

          // Check if we hit another grid
          const parts = line.split(/\s+/).map(Number);
          if (
            parts.length === 3 &&
            parts.every((p) => Number.isInteger(p) && p > 0)
          ) {
            break;
          }

          const values = line.split(/\s+/).map(Number);
          magData.push(...values);
        }

        const magVol = createVolumetricDataFromCHGCAR(
          magData,
          [magNgx, magNgy, magNgz],
          basis,
          "magnetization",
          true,
        );
        magnetization.push(magVol);
      }
    }
  }

  return {
    volumetric,
    structure,
    ...(magnetization.length > 0 && { magnetization }),
  };
}

function createVolumetricDataFromCHGCAR(
  dataValues: number[],
  grid: [number, number, number],
  basis: Matrix,
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

  // Calculate cell volume from basis
  // The basis matrix columns are the lattice vectors
  const basisData = basis.data;
  const a = [basisData[0], basisData[1], basisData[2]];
  const b = [basisData[3], basisData[4], basisData[5]];
  const c = [basisData[6], basisData[7], basisData[8]];

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

  const fieldName = isMagnetization
    ? `magnetization_${fieldType}`
    : `charge_density_${fieldType}`;

  // Create volumetric data using the existing createVolumetricData function
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
      dataPointsRead: dataValues.length,
      dataPadded: dataValues.length < totalGridPoints,
    },
  });
}
