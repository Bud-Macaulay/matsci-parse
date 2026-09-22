/**
 * PSP8 (ABINIT format 8) pseudopotential adapter.
 *
 * PSP8 is a norm-conserving pseudopotential format produced by ONCVPSP
 * and used widely in the ABINIT/PseudoDojo ecosystem. This adapter converts
 * between PSP8 text and the first-class Pseudopotential object (canonical
 * units Ry / Bohr).
 *
 * Native units: Hartree (energy), Bohr (length). Energies are converted to
 * Ry on parse (×2) and back to Hartree on serialize (×0.5).
 * Grid: Linear, r(i) = (i-1) * dr, starting at r=0.
 *
 * Loss notes: PSP8 carries only KB projectors (no semilocal, no PAW, no
 * augmentation charge, no pseudo-wavefunctions). US/PAW objects cannot be
 * faithfully written; `canWritePSP8()` reports whether conversion is safe.
 *
 * Reference: https://docs.abinit.org/developers/psp8_info/
 */

import type {
  Pseudopotential,
  PseudopotentialMesh,
  PseudopotentialLocal,
  PseudopotentialNonlocal,
  BetaProjector,
} from "../../pseudopotential/pseudopotential";

import { CANONICAL_UNITS } from "../../pseudopotential/pseudopotential";
import {
  RY_TO_HA,
  haToRy,
  haArrayToRy,
} from "../../pseudopotential/units";

import {
  parseFortranNumber,
  parseFloat64Array,
  formatFortranNumber,
  formatDataArray,
  parseIntSafe,
} from "./fortran-helpers";

import { guessElement, elementToZ, pspxcToFunctional, functionalToPspxc } from "./elements";

export interface PSP8ConversionCheck {
  ok: boolean;
  reasons: string[];
}

/**
 * Report whether a first-class pseudopotential can be written as PSP8.
 * PSP8 supports norm-conserving KB data only: no US/PAW, no augmentation,
 * no spin-orbit coupling, no semilocal potentials.
 */
export function canWritePSP8(pp: Pseudopotential): PSP8ConversionCheck {
  const reasons: string[] = [];
  if (pp.header.isUltrasoft || pp.header.isPaw || pp.header.pseudoType !== "NC") {
    reasons.push(`pseudoType ${pp.header.pseudoType} is not norm-conserving`);
  }
  if (pp.nonlocal.augmentation) {
    reasons.push("augmentation data has no PSP8 representation");
  }
  if (pp.header.hasSo || pp.spinOrbit) {
    reasons.push("spin-orbit data has no PSP8 representation");
  }
  if (pp.semilocal && pp.semilocal.length > 0) {
    reasons.push("semilocal potentials are not written to PSP8");
  }
  if (pp.paw || pp.fullWfc) {
    reasons.push("PAW data has no PSP8 representation");
  }
  return { ok: reasons.length === 0, reasons };
}

/**
 * Parse a PSP8 pseudopotential file into a first-class Pseudopotential.
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
  const pspd = line2.length > 2 ? line2[2] : "";

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
  const r2well = line3.length > 5 ? parseFortranNumber(line3[5]) : undefined;

  // Line 4: rchrg, fchrg, qchrg
  const line4 = allLines[lineIdx++].trim().split(/\s+/);
  const rchrg = parseFortranNumber(line4[0]);
  const fchrg = parseFortranNumber(line4[1]);
  const qchrg = line4.length > 2 ? parseFortranNumber(line4[2]) : 0;

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

  const hasSo = extensionSwitch === 2 || extensionSwitch === 3;
  const hasRhoatom = extensionSwitch === 1 || extensionSwitch === 3;

  // Read the radial grid from the first data block (all blocks share it).
  // We collect r(i) here as blocks are consumed, then validate at the end.
  const rValues = new Float64Array(mmax);

  const readDataBlock = (
    cols: number,
    skipHeader = true,
  ): { headerParts: string[]; grid: Float64Array; data: Float64Array[] } => {
    const headerParts = skipHeader
      ? allLines[lineIdx++].trim().split(/\s+/)
      : [];
    const grid = new Float64Array(mmax);
    const data: Float64Array[] = [];
    for (let p = 0; p < cols; p++) data.push(new Float64Array(mmax));
    for (let i = 0; i < mmax && lineIdx < allLines.length; i++) {
      const parts = allLines[lineIdx++].trim().split(/\s+/);
      if (parts.length >= 2) grid[i] = parseFortranNumber(parts[1]);
      for (let p = 0; p < cols && p + 2 < parts.length; p++) {
        data[p][i] = parseFortranNumber(parts[p + 2]);
      }
    }
    return { headerParts, grid, data };
  };

  // Parse projector blocks and local potential
  const betas: BetaProjector[] = [];
  let localVloc: Float64Array = new Float64Array(mmax);
  const ekbValues: number[][] = [];
  let gridSet = false;

  const adoptGrid = (grid: Float64Array): void => {
    if (!gridSet) {
      rValues.set(grid);
      gridSet = true;
    }
  };

  // Data blocks appear in l order. If lloc <= lmax, the local potential
  // replaces the projector block at position lloc.
  for (let l = 0; l <= lmax; l++) {
    if (l === lloc && lloc <= lmax) {
      // Local potential block: header line carries just the l value.
      const { headerParts, grid, data } = readDataBlock(1);
      void headerParts;
      adoptGrid(grid);
      localVloc = data[0];
    } else if (nproj[l] > 0) {
      // Projector block: header line is "l ekb(1) ekb(2) ...".
      const { headerParts, grid, data } = readDataBlock(nproj[l]);
      adoptGrid(grid);
      const blockL = parseIntSafe(headerParts[0]);
      const ekb: number[] = [];
      for (let p = 1; p < headerParts.length; p++) {
        ekb.push(parseFortranNumber(headerParts[p]));
      }
      ekbValues.push(ekb);

      // Create one beta projector per ekb value. Beta arrays are
      // L2-normalized shapes and stay in file units; energies (ekb, vloc)
      // convert separately.
      for (let p = 0; p < nproj[l]; p++) {
        betas.push({
          angularMomentum: Number.isNaN(blockL) ? l : blockL,
          ultrasoftCutoffRadius: 0,
          label: `${l}${"spdf"[l] ?? l}`,
          beta: data[p],
        });
      }
    }
  }

  // If lloc > lmax, local potential comes after all projector blocks
  if (lloc > lmax) {
    const { grid, data } = readDataBlock(1);
    adoptGrid(grid);
    localVloc = data[0];
  }
  localVloc = haArrayToRy(localVloc);

  // Build D_ij matrix (Ha → Ry) from ekb values.
  // For single projectors per l: dij[i][i] = ekb[i]; block-diagonal otherwise.
  const dij: Array<[number, number, number]> = [];
  let projIdx = 1;
  let ekbIdx = 0;
  for (let l = 0; l <= lmax; l++) {
    if (l === lloc && lloc <= lmax) continue;
    if (nproj[l] > 0) {
      const nProjL = nproj[l];
      const ekbL = ekbValues[ekbIdx++] ?? [];
      for (let i = 0; i < nProjL; i++) {
        for (let j = 0; j < nProjL; j++) {
          const val = i === j ? haToRy(ekbL[i] ?? 1.0) : 0;
          dij.push([projIdx + i, projIdx + j, val]);
        }
      }
      projIdx += nProjL;
    }
  }

  // Parse SO projector blocks (extension_switch == 2 or 3).
  // ekbso values are stored as diagonal D_ij entries for the "-so" projectors.
  if (hasSo) {
    for (let l = 1; l <= lmax; l++) {
      const nProjSo = nprojso[l - 1] ?? 0;
      if (nProjSo > 0) {
        const { headerParts, data } = readDataBlock(nProjSo);
        const soEkb: number[] = [];
        for (let p = 1; p < headerParts.length; p++) {
          soEkb.push(parseFortranNumber(headerParts[p]));
        }
        for (let p = 0; p < nProjSo; p++) {
          betas.push({
            angularMomentum: l,
            ultrasoftCutoffRadius: 0,
            label: `${l}${"spdf"[l] ?? l}-so`,
            beta: data[p],
          });
          dij.push([projIdx + p, projIdx + p, haToRy(soEkb[p] ?? 1.0)]);
        }
        projIdx += nProjSo;
      }
    }
  }

  // Parse NLCC block if present (no header line — mmax bare data lines)
  let nlcc: Float64Array | undefined;
  if (fchrg > 0) {
    const { data } = readDataBlock(1, false);
    nlcc = data[0];
  }

  // Parse pseudo valence charge block if extension_switch == 1 or 3
  // (no header line — mmax bare data lines)
  const rhoatom = new Float64Array(mmax);
  if (hasRhoatom) {
    const { data } = readDataBlock(1, false);
    rhoatom.set(data[0]);
  }

  // Build mesh (linear grid, Bohr)
  const rmax = rValues[mmax - 1] || 0;
  const dr = mmax > 1 && rmax > 0 ? rValues[1] - rValues[0] : 0;
  const rab = new Float64Array(mmax).fill(dr);

  const mesh: PseudopotentialMesh = {
    gridType: "linear",
    rmax,
    r: rValues,
    rab,
  };

  // Guess element from zatom
  const element = guessElement(zatom);

  // Map pspxc to functional string
  const functional = pspxcToFunctional(pspxc);

  return {
    format: "PSP8",
    units: { ...CANONICAL_UNITS },
    provenance: { sourceFormat: "PSP8", creator: title, date: pspd },
    header: {
      element,
      generated: title,
      date: pspd,
      pseudoType: "NC",
      relativistic: "scalar",
      isUltrasoft: false,
      isPaw: false,
      isCoulomb: false,
      hasSo,
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
      r2well,
      rchrg,
      fchrg,
      qchrg,
    },
    mesh,
    local: { vloc: localVloc } satisfies PseudopotentialLocal,
    nonlocal: { betas, dij } satisfies PseudopotentialNonlocal,
    pswfc: [],
    rhoatom,
    nlcc,
  };
}

/**
 * Serialize a first-class Pseudopotential to PSP8 format.
 *
 * Energies (vloc, projectors, ekb) are written back in Hartree. Only
 * norm-conserving data is supported; use `canWritePSP8()` to check first.
 */
export function toPSP8(pp: Pseudopotential): string {
  const lines: string[] = [];

  const lmax = pp.header.lMax;
  const mmax = pp.mesh.r.length;
  // QE uses lLocal < 0 for "no explicit local channel"; PSP8 has no such
  // notion, so map it to "separate local block" (lloc > lmax), which carries
  // the same semantics (local potential tabulated on its own).
  const rawLloc = pp.header.lLocal ?? 0;
  const lloc = rawLloc < 0 ? lmax + 1 : rawLloc;

  // Split betas into regular and spin-orbit groups (label suffix "-so").
  const isSoBeta = (b: BetaProjector): boolean => b.label.endsWith("-so");
  const regularBetas = pp.nonlocal.betas.filter((b) => !isSoBeta(b));
  const soBetas = pp.nonlocal.betas.filter(isSoBeta);

  const nproj: number[] = new Array(lmax + 1).fill(0);
  for (const beta of regularBetas) {
    if (beta.angularMomentum <= lmax && beta.angularMomentum >= 0) {
      nproj[beta.angularMomentum]++;
    }
  }
  const nprojso: number[] = new Array(Math.max(lmax, 0)).fill(0);
  for (const beta of soBetas) {
    if (beta.angularMomentum >= 1 && beta.angularMomentum <= lmax) {
      nprojso[beta.angularMomentum - 1]++;
    }
  }

  // extension_switch: prefer the stored value; derive it for objects from
  // formats without the concept (e.g. UPF) from the data actually present.
  const hasRhoatomData = pp.rhoatom.some((v) => v !== 0);
  const extensionSwitch =
    pp.header.extensionSwitch ??
    (hasRhoatomData ? 1 : 0) + (soBetas.length > 0 ? 2 : 0);

  // Header
  const zatom = elementToZ(pp.header.element);
  lines.push(pp.header.generated ?? `${pp.header.element} ${pp.header.functional}`);
  const pspd = pp.header.date ?? "000000";
  lines.push(
    `${zatom.toFixed(4).padStart(12)} ${pp.header.zValence.toFixed(4).padStart(12)} ${pspd.padStart(8)}`,
  );
  // XC code: prefer the stored value; reverse-map the functional string for
  // objects arriving via formats that only carry the name (e.g. UPF).
  const pspxc =
    pp.header.xcCode ?? functionalToPspxc(pp.header.functional) ?? 0;
  lines.push(
    `     8 ${pspxc} ${lmax} ${lloc} ${mmax} ${pp.header.r2well ?? 0}`,
  );
  const rchrg = pp.header.rchrg ?? 0;
  const fchrg =
    pp.header.fchrg ?? (pp.nlcc ? 1.0 : pp.header.coreCorrection ? 1.0 : 0.0);
  const qchrg = pp.header.qchrg ?? 0;
  lines.push(`${rchrg.toFixed(4).padStart(12)} ${fchrg.toFixed(4).padStart(12)} ${qchrg.toFixed(4).padStart(12)}`);
  lines.push(` ${nproj.join("  ")}`);
  lines.push(`     ${extensionSwitch}`);
  if (extensionSwitch === 2 || extensionSwitch === 3) {
    lines.push(` ${nprojso.join("  ")}`);
  }

  // Projector blocks (regular). ekb recovered from diagonal D_ij entries.
  const ekb = pp.nonlocal.dij;
  const ekbOf = (globalIdx: number): number => {
    const entry = ekb.find(([nb, mb]) => nb === globalIdx && mb === globalIdx);
    return entry ? entry[2] * RY_TO_HA : 1.0;
  };

  let projOffset = 1;
  for (let l = 0; l <= lmax; l++) {
    if (l === lloc && lloc <= lmax) {
      // Local potential replaces the block at the lloc position.
      lines.push(`   ${l}`);
      for (let i = 0; i < mmax; i++) {
        lines.push(
          `${(i + 1).toString().padStart(5)} ${formatFortranNumber(pp.mesh.r[i])} ${formatFortranNumber(pp.local.vloc[i] * RY_TO_HA)}`,
        );
      }
      continue;
    }
    const lBetas = regularBetas.filter((b) => b.angularMomentum === l);
    if (lBetas.length === 0) continue;

    const ekbValues = lBetas.map((_, i) => ekbOf(projOffset + i));
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

  // Local potential block (Hartree) — only when it does not replace a
  // channel block above (lloc > lmax means a separate trailing block).
  if (lloc > lmax) {
    lines.push(`   ${lloc}`);
    for (let i = 0; i < mmax; i++) {
      lines.push(
        `${(i + 1).toString().padStart(5)} ${formatFortranNumber(pp.mesh.r[i])} ${formatFortranNumber(pp.local.vloc[i] * RY_TO_HA)}`,
      );
    }
  }

  // SO projector blocks
  if (extensionSwitch === 2 || extensionSwitch === 3) {
    for (let l = 1; l <= lmax; l++) {
      const lBetas = soBetas.filter((b) => b.angularMomentum === l);
      if (lBetas.length === 0) continue;
      const ekbValues = lBetas.map((_, i) => ekbOf(projOffset + i));
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
  }

  // NLCC block
  if (pp.nlcc) {
    for (let i = 0; i < mmax; i++) {
      lines.push(
        `${(i + 1).toString().padStart(5)} ${formatFortranNumber(pp.mesh.r[i])} ${formatFortranNumber(pp.nlcc[i])}`,
      );
    }
  }

  // Pseudo valence charge block (if extension_switch == 1 or 3)
  if (extensionSwitch === 1 || extensionSwitch === 3) {
    for (let i = 0; i < mmax; i++) {
      lines.push(
        `${(i + 1).toString().padStart(5)} ${formatFortranNumber(pp.mesh.r[i])} ${formatFortranNumber(pp.rhoatom[i])}`,
      );
    }
  }

  return lines.join("\n");
}
