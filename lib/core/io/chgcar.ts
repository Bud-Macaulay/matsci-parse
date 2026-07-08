import { Structure } from "../structure/structure";
import { VolumetricData, createVolumetricData } from "../volumetric/volumetric";
import { Matrix, identity } from "../matrix/matrix";
import { fromPOSCAR } from "./poscar";

/** Options for parsing VASP CHGCAR files. */
export interface CHGCAROptions {
  spinChannel?: "total" | "up" | "down" | "magnetization";
  includeAugmentation?: boolean;
}

// Currently only supports the first channel ... which is perhaps not the best...
// TODO: fix this to support multichannel
/** Parses a VASP CHGCAR string into volumetric data and structure. */
export function fromCHGCAR(
  text: string,
  options: CHGCAROptions = {},
): {
  volumetric: VolumetricData | VolumetricData[];
  structure: Structure;
  magnetization?: VolumetricData[];
} {
  const structure = fromPOSCAR(text);
  const lines = text.split("\n").map((l) => l.trim());

  // Parse the structure using the existing fromPOSCAR function
  const cursorEnd = structure._cursorEnd;

  if (cursorEnd == null) {
    throw new Error("POSCAR parser did not return cursor position");
  }

  let lineIndex = structure._cursorEnd as number;

  // skip empty lines safely
  while (lineIndex < lines.length && lines[lineIndex] === "") {
    lineIndex++;
  }

  const gridParts = lines[lineIndex++].split(/\s+/).map(Number);

  if (
    gridParts.length !== 3 ||
    !gridParts.every((p) => Number.isInteger(p) && p > 0)
  ) {
    throw new Error("Invalid CHGCAR grid dimensions");
  }

  const [ngx, ngy, ngz] = gridParts;
  const totalGridPoints = ngx * ngy * ngz;

  // Parse the volumetric data (after the grid line)
  const dataValues: number[] = [];

  while (lineIndex < lines.length && dataValues.length < totalGridPoints) {
    const line = lines[lineIndex++].trim();
    if (line === "") continue;

    // Check if this line could be another grid line (3 integers)
    const parts = line.split(/\s+/).map(Number);
    if (
      parts.length === 3 &&
      parts.every((p) => Number.isInteger(p) && p > 0)
    ) {
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

  // Throw if the number of gridpoints do not match
  if (dataValues.length !== totalGridPoints) {
    throw new Error(
      `CHGCAR grid contains ${dataValues.length} values, expected ${totalGridPoints}.`,
    );
  }

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
  const scaledData = new Float64Array(totalGridPoints);
  for (let i = 0; i < totalGridPoints; i++) {
    scaledData[i] = dataValues[i] * scaleFactor;
  }

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
      sourceGrid: [ngx, ngy, ngz],
      sourceTotalPoints: totalGridPoints,
      sourceMagnetization: isMagnetization,
      sourceCellVolume: cellVolume,
      sourceGridVolume: gridVolume,
      sourceFieldType: fieldType,
      sourceDataPointsRead: dataValues.length,
    },
  });
}
