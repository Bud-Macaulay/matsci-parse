/**
 * PSP8 (ABINIT format 8) pseudopotential parser and serializer.
 *
 * PSP8 is a norm-conserving pseudopotential format produced by ONCVPSP
 * and used widely in the ABINIT/PseudoDojo ecosystem.
 *
 * Units: Hartree (energy), Bohr (length).
 * Grid: Linear, r(i) = (i-1) * dr, starting at r=0.
 *
 * Reference: https://docs.abinit.org/developers/psp8_info/
 */

import type {
  Pseudopotential,
  PseudopotentialHeader,
  PseudopotentialMesh,
  PseudopotentialLocal,
  PseudopotentialNonlocal,
  BetaProjector,
  PseudopotentialWfc,
} from "../../pseudopotential/pseudopotential";

function parseFortranNumber(s: string): number {
  return Number.parseFloat(s.replace(/[dD]/g, "e"));
}

function parseFloat64Array(text: string): Float64Array {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  const arr = new Float64Array(tokens.length);
  for (let i = 0; i < tokens.length; i++) {
    arr[i] = parseFortranNumber(tokens[i]);
  }
  return arr;
}

function formatFortranNumber(n: number, width = 20): string {
  const s = n.toExponential(15);
  const d = s.replace(/e/, "D").replace(/e\+/, "D+").replace(/e-/, "D-");
  return d.padStart(width);
}

function formatDataArray(arr: Float64Array, columns = 4): string {
  const lines: string[] = [];
  for (let i = 0; i < arr.length; i += columns) {
    const row: string[] = [];
    for (let j = 0; j < columns && i + j < arr.length; j++) {
      row.push(formatFortranNumber(arr[i + j]));
    }
    lines.push(row.join(" "));
  }
  return lines.join("\n");
}

function parseIntSafe(s: string): number {
  return Number.parseInt(s.trim(), 10);
}

/**
 * Parse a PSP8 pseudopotential file.
 *
 * Structure:
 * Header (6-7 lines):
 *   Line 1: title
 *   Line 2: zatom, zion, pspd
 *   Line 3: pspcod(=8), pspxc, lmax, lloc, mmax, r2well
 *   Line 4: rchrg, fchrg, qchrg
 *   Line 5: nproj(0..lmax)
 *   Line 6: extension_switch
 *   Line 7 (if extension_switch=2 or 3): nprojso(1..lmax)
 *
 * Data blocks:
 *   For each l with nproj(l) > 0: projector block
 *   Local potential block
 *   If extension_switch=2 or 3: SO projector blocks
 *   If fchrg > 0: NLCC block
 */
export function fromPSP8(text: string): Pseudopotential {
  const allLines = text.split("\n").filter((l) => l.trim().length > 0);
  if (allLines.length < 6) {
    throw new Error("PSP8 file too short to parse");
  }

  let lineIdx = 0;

  // Line 1: title
  const title = allLines[lineIdx++].trim();

  // Line 2: zatom, zion, pspd
  const line2 = allLines[lineIdx++].trim().split(/\s+/);
  const zatom = parseFortranNumber(line2[0]);
  const zion = parseFortranNumber(line2[1]);

  // Line 3: pspcod, pspxc, lmax, lloc, mmax, r2well
  const line3 = allLines[lineIdx++].trim().split(/\s+/);
  const pspcod = parseIntSafe(line3[0]);
  if (pspcod !== 8) {
    throw new Error(`Expected pspcod=8 for PSP8 format, got ${pspcod}`);
  }
  const pspxc = parseIntSafe(line3[1]);
  const lmax = parseIntSafe(line3[2]);
  const lloc = parseIntSafe(line3[3]);
  const mmax = parseIntSafe(line3[4]);

  // Line 4: rchrg, fchrg, qchrg
  const line4 = allLines[lineIdx++].trim().split(/\s+/);
  const rchrg = parseFortranNumber(line4[0]);
  const fchrg = parseFortranNumber(line4[1]);

  // Line 5: nproj(0..lmax)
  const line5 = allLines[lineIdx++].trim().split(/\s+/);
  const nproj: number[] = [];
  for (let l = 0; l <= lmax; l++) {
    nproj.push(l < line5.length ? parseIntSafe(line5[l]) : 0);
  }

  // Line 6: extension_switch
  const extensionSwitch = parseIntSafe(allLines[lineIdx++].trim());

  // Line 7 (if SO): nprojso(1..lmax)
  const nprojso: number[] = [];
  if (extensionSwitch === 2 || extensionSwitch === 3) {
    const line7 = allLines[lineIdx++].trim().split(/\s+/);
    for (let l = 1; l <= lmax; l++) {
      nprojso.push(l - 1 < line7.length ? parseIntSafe(line7[l - 1]) : 0);
    }
  }

  // Build linear radial grid
  const rValues = new Float64Array(mmax);
  for (let i = 0; i < mmax; i++) {
    rValues[i] = i * (mmax > 1 ? (rValues[mmax - 1] || 1.0) / (mmax - 1) : 0);
  }
  // We'll fill in actual r values from data blocks

  // Parse projector blocks and local potential
  const betas: BetaProjector[] = [];
  let localVloc = new Float64Array(mmax);
  const ekbValues: number[][] = [];

  // Data blocks appear in l order. If lloc <= lmax, the local potential
  // replaces the projector block at position lloc.
  for (let l = 0; l <= lmax; l++) {
    if (l === lloc && lloc <= lmax) {
      // This is the local potential block
      // Header line: just the l value
      const headerLine = allLines[lineIdx++].trim();
      // Data: mmax lines of (index, r, vloc)
      const vlocValues = new Float64Array(mmax);
      for (let i = 0; i < mmax && lineIdx < allLines.length; i++) {
        const parts = allLines[lineIdx++].trim().split(/\s+/);
        if (parts.length >= 3) {
          const idx = parseIntSafe(parts[0]);
          if (i === 0) rValues[i] = parseFortranNumber(parts[1]);
          if (i > 0) rValues[i] = parseFortranNumber(parts[1]);
          vlocValues[i] = parseFortranNumber(parts[2]);
        }
      }
      localVloc = vlocValues;
    } else if (nproj[l] > 0) {
      // Projector block
      // Header line: l ekb(1) ekb(2) ...
      const headerParts = allLines[lineIdx++].trim().split(/\s+/);
      const blockL = parseIntSafe(headerParts[0]);
      const ekb: number[] = [];
      for (let p = 1; p < headerParts.length; p++) {
        ekb.push(parseFortranNumber(headerParts[p]));
      }
      ekbValues.push(ekb);

      // Data: mmax lines of (index, r, projector_1, projector_2, ...)
      const projectorData: Float64Array[] = [];
      for (let p = 0; p < nproj[l]; p++) {
        projectorData.push(new Float64Array(mmax));
      }

      for (let i = 0; i < mmax && lineIdx < allLines.length; i++) {
        const parts = allLines[lineIdx++].trim().split(/\s+/);
        if (parts.length >= 3) {
          if (i === 0) rValues[i] = parseFortranNumber(parts[1]);
          if (i > 0) rValues[i] = parseFortranNumber(parts[1]);
          for (let p = 0; p < nproj[l] && p + 2 < parts.length; p++) {
            projectorData[p][i] = parseFortranNumber(parts[p + 2]);
          }
        }
      }

      // Create one beta projector per ekb value
      for (let p = 0; p < nproj[l]; p++) {
        betas.push({
          angularMomentum: l,
          ultrasoftCutoffRadius: 0,
          label: `${l}${String.fromCharCode(115 + l)}`,
          beta: projectorData[p],
        });
      }
    } else {
      // No projectors for this l, and not local channel — skip (shouldn't happen)
    }
  }

  // If lloc > lmax, local potential comes after all projector blocks
  if (lloc > lmax) {
    // Header line
    const headerLine = allLines[lineIdx++].trim();
    const vlocValues = new Float64Array(mmax);
    for (let i = 0; i < mmax && lineIdx < allLines.length; i++) {
      const parts = allLines[lineIdx++].trim().split(/\s+/);
      if (parts.length >= 3) {
        if (i === 0) rValues[i] = parseFortranNumber(parts[1]);
        if (i > 0) rValues[i] = parseFortranNumber(parts[1]);
        vlocValues[i] = parseFortranNumber(parts[2]);
      }
    }
    localVloc = vlocValues;
  }

  // Skip SO projector blocks (extension_switch == 2 or 3)
  if (extensionSwitch === 2 || extensionSwitch === 3) {
    for (let l = 1; l <= lmax; l++) {
      if (nprojso[l - 1] > 0) {
        // Header line
        lineIdx++;
        // Data lines
        for (let i = 0; i < mmax; i++) lineIdx++;
      }
    }
  }

  // Skip NLCC block if present
  if (fchrg > 0) {
    for (let i = 0; i < mmax; i++) lineIdx++;
  }

  // Skip pseudo valence charge block if extension_switch == 1 or 3
  if (extensionSwitch === 1 || extensionSwitch === 3) {
    for (let i = 0; i < mmax; i++) lineIdx++;
  }

  // Build mesh
  const rmax = rValues[mmax - 1] || 0;
  const dr = mmax > 1 ? rmax / (mmax - 1) : 0;
  const rab = new Float64Array(mmax).fill(dr);

  const mesh: PseudopotentialMesh = {
    gridType: "linear",
    rmax,
    r: rValues,
    rab,
  };

  // Build D_ij matrix from ekb values
  // For single projectors per l: dij[i][i] = ekb[i]
  // For multiple projectors: dij is block-diagonal
  const dij: Array<[number, number, number]> = [];
  let projIdx = 1;
  for (let l = 0; l <= lmax; l++) {
    if (l === lloc && lloc <= lmax) continue;
    if (nproj[l] > 0) {
      const nProjL = nproj[l];
      const ekbL = ekbValues.find(() => true) ?? []; // simplified
      for (let i = 0; i < nProjL; i++) {
        for (let j = 0; j < nProjL; j++) {
          const val = i === j ? (ekbL[i] ?? 1.0) : 0;
          dij.push([projIdx + i, projIdx + j, val]);
        }
      }
      projIdx += nProjL;
    }
  }

  // Guess element from zatom
  const element = guessElement(zatom);

  // Map pspxc to functional string
  const functional = pspxcToFunctional(pspxc);

  return {
    format: "PSP8",
    version: "2.0.1",
    header: {
      element,
      pseudoType: "NC",
      relativistic: "scalar",
      isUltrasoft: false,
      isPaw: false,
      isCoulomb: false,
      hasSo: extensionSwitch === 2 || extensionSwitch === 3,
      hasWfc: false,
      hasGipaw: false,
      pawAsGipaw: false,
      coreCorrection: fchrg > 0,
      functional,
      zValence: zion,
      totalPsenergy: 0,
      wfcCutoff: 0,
      rhoCutoff: 0,
      lMax: lmax,
      lMaxRho: lmax,
      lLocal: lloc,
      meshSize: mmax,
      numberOfWfc: 0,
      numberOfProj: betas.length,
      xcCode: pspxc,
      extensionSwitch,
    },
    mesh,
    local: { vloc: localVloc },
    nonlocal: { betas, dij },
    pswfc: [],
    rhoatom: new Float64Array(mmax),
    nlcc: fchrg > 0 ? new Float64Array(mmax) : undefined,
  };
}

/**
 * Serialize a Pseudopotential to PSP8 format.
 */
export function toPSP8(pp: Pseudopotential): string {
  const lines: string[] = [];

  const lmax = pp.header.lMax;
  const mmax = pp.mesh.r.length;
  const lloc = pp.header.lLocal ?? 0;
  const nproj: number[] = new Array(lmax + 1).fill(0);

  // Count projectors per l channel
  for (const beta of pp.nonlocal.betas) {
    if (beta.angularMomentum <= lmax) {
      nproj[beta.angularMomentum]++;
    }
  }

  // Header
  const zatom = elementToZ(pp.header.element);
  lines.push(`${pp.header.element} ${pp.header.functional} ${pp.header.generated ?? ""}`);
  lines.push(
    `${zatom.toFixed(4).padStart(12)} ${pp.header.zValence.toFixed(4).padStart(12)} ${pp.header.date ?? "000000".padStart(8)}`,
  );
  lines.push(
    `     8 ${pp.header.xcCode ?? 0} ${lmax} ${lloc} ${mmax}     0`,
  );
  lines.push(` 0.00000000  ${pp.nlcc ? "1.0" : "0.0"}  0.00000000`);
  lines.push(` ${nproj.join("  ")}`);
  lines.push(`     ${pp.header.extensionSwitch ?? 0}`);

  // Projector blocks
  const ekb = pp.nonlocal.dij;
  let projOffset = 1;
  for (let l = 0; l <= lmax; l++) {
    if (l === lloc && lloc <= lmax) continue;
    if (nproj[l] === 0) continue;

    // Find ekb values for this l channel using global projector indices
    const lBetas = pp.nonlocal.betas.filter((b) => b.angularMomentum === l);
    const ekbValues = lBetas.map((_, i) => {
      const globalIdx = projOffset + i;
      const entry = ekb.find(([nb, mb]) => nb === globalIdx && mb === globalIdx);
      return entry ? entry[2] : 1.0;
    });

    lines.push(`   ${l}  ${ekbValues.map((e) => formatFortranNumber(e)).join(" ")}`);

    for (let i = 0; i < mmax; i++) {
      const parts = [
        (i + 1).toString().padStart(5),
        formatFortranNumber(pp.mesh.r[i]),
      ];
      for (const beta of lBetas) {
        parts.push(formatFortranNumber(beta.beta[i] ?? 0));
      }
      lines.push(parts.join(" "));
    }

    projOffset += lBetas.length;
  }

  // Local potential block
  lines.push(`   ${lloc}`);
  for (let i = 0; i < mmax; i++) {
    lines.push(
      `${(i + 1).toString().padStart(5)} ${formatFortranNumber(pp.mesh.r[i])} ${formatFortranNumber(pp.local.vloc[i])}`,
    );
  }

  return lines.join("\n");
}

function guessElement(z: number): string {
  const elements = [
    "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne",
    "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar",
    "K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn",
    "Ga", "Ge", "As", "Se", "Br", "Kr",
  ];
  const idx = Math.round(z) - 1;
  return idx >= 0 && idx < elements.length ? elements[idx] : "X";
}

function elementToZ(element: string): number {
  const elements = [
    "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne",
    "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar",
    "K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn",
    "Ga", "Ge", "As", "Se", "Br", "Kr",
  ];
  const idx = elements.indexOf(element);
  return idx >= 0 ? idx + 1 : 0;
}

function pspxcToFunctional(pspxc: number): string {
  const map: Record<number, string> = {
    1: "LDA (PW)",
    2: "LDA (PW92)",
    7: "PW92",
    11: "PBE",
    14: "PBEsol",
    23: "B3LYP",
  };
  return map[pspxc] ?? `xc=${pspxc}`;
}
