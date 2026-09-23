/**
 * Unified entry point for pseudopotential I/O.
 *
 * Every format adapter converts between text and the first-class
 * Pseudopotential object. This registry adds format detection plus
 * `parse` / `serialize` / `convert` dispatch so callers never need to know
 * which adapter to use.
 */

import type { Pseudopotential, PseudopotentialFormat } from "../../pseudopotential/pseudopotential";

export type { PseudopotentialFormat };

import { fromUPF, toUPF } from "./upf";
import { fromUPFv1, toUPFv1 } from "./upf-v1";
import { fromPSP8, toPSP8, canWritePSP8 } from "./psp8";
import { fromPSML, toPSML, canWritePSML } from "./psml";
import { fromFHI, toFHI, canWriteFHI } from "./fhi";
import { fromGTH, toGTH, canWriteGTH } from "./gth";

/** Non-empty lines of a text, for header sniffing. */
function nonEmptyLines(text: string): string[] {
  return text.split("\n").filter((l) => l.trim().length > 0);
}

/**
 * Detect the pseudopotential format of a text buffer.
 *
 * Heuristics (first match wins):
 * - `<psml` tag → PSML
 * - `<UPF` root → UPF2
 * - `<PP_HEADER>` without `<UPF` → UPF1
 * - element + GTH/HGH header line → GTH
 * - pspcod=8 header line → PSP8
 * - FHI title / numeric lead → CPI (fromFHI auto-detects .fhi vs .cpi)
 *
 * @throws If no known format signature is found.
 */
export function detectFormat(text: string): PseudopotentialFormat {
  // Root-tag checks run on the file head only: these tags always open their
  // documents, and full-text regex scans dominate detection cost on
  // multi-MB PAW files.
  const head = text.slice(0, 4096);
  if (/<psml[\s>]/i.test(head)) return "PSML";
  if (/<UPF[\s>]/.test(head)) return "UPF2";
  if (/<PP_HEADER>/.test(head)) return "UPF1";

  const lines = nonEmptyLines(text);
  if (lines.length === 0) throw new Error("Cannot detect format of empty input");

  // First content line (skipping #-comments, which lead GTH files and our
  // own serializer output).
  const content = lines.filter((l) => !l.trim().startsWith("#"));
  const first = (content[0] ?? lines[0]).trim();
  if (/^[A-Z][a-z]?\s+\S*HGH/i.test(first)) return "HGH";
  if (/^[A-Z][a-z]?\s+\S*(GTH|HGH)/i.test(first)) return "GTH";

  if (lines.length >= 3 && /^\s*8\s+\d+/.test(lines[2])) return "PSP8";

  if (
    /fhi98|troullier|martins|pspdat/i.test(first) ||
    (/fhi/i.test(text.slice(0, 500)) && lines.length > 7 && /^\s*\d/.test(lines[7] ?? ""))
  ) {
    return "CPI";
  }

  if (/^\s*[-+.\d]/.test(first)) return "CPI";

  throw new Error("Unknown pseudopotential format: no recognized signature");
}

/**
 * Parse pseudopotential text into a first-class Pseudopotential object.
 * The format is auto-detected unless explicitly given.
 */
export function parse(
  text: string,
  format?: PseudopotentialFormat,
): Pseudopotential {
  const fmt = format ?? detectFormat(text);
  switch (fmt) {
    case "UPF2":
      return fromUPF(text);
    case "UPF1":
      return fromUPFv1(text);
    case "PSP8":
      return fromPSP8(text);
    case "PSML":
      return fromPSML(text);
    case "CPI":
      return fromFHI(text);
    case "GTH":
    case "HGH":
      return fromGTH(text);
    default:
      throw new Error(`Unsupported pseudopotential format: ${fmt as string}`);
  }
}

/**
 * Serialize a first-class Pseudopotential to the requested format
 * (default UPF2, the lossless superset).
 */
export function serialize(
  pp: Pseudopotential,
  format: PseudopotentialFormat = "UPF2",
): string {
  switch (format) {
    case "UPF2":
      return toUPF(pp);
    case "UPF1":
      return toUPFv1(pp);
    case "PSP8":
      return toPSP8(pp);
    case "PSML":
      return toPSML(pp);
    case "CPI":
      return toFHI(pp);
    case "GTH":
    case "HGH":
      return toGTH(pp);
    default:
      throw new Error(`Unsupported pseudopotential format: ${format as string}`);
  }
}

/**
 * Convert pseudopotential text from its (auto-detected) source format to a
 * target format. Lossy conversions (e.g. PAW → PSP8) produce best-effort
 * output; check `canSerialize()` first for safety.
 */
export function convert(
  text: string,
  target: PseudopotentialFormat,
  source?: PseudopotentialFormat,
): string {
  return serialize(parse(text, source), target);
}

export interface SerializationCheck {
  ok: boolean;
  reasons: string[];
}

/**
 * Report whether a first-class pseudopotential can be faithfully written to
 * the requested format. UPF2 (the superset) is always safe.
 */
export function canSerialize(
  pp: Pseudopotential,
  format: PseudopotentialFormat,
): SerializationCheck {
  switch (format) {
    case "UPF2":
    case "UPF1":
      return { ok: true, reasons: [] };
    case "PSP8":
      return canWritePSP8(pp);
    case "PSML":
      return canWritePSML(pp);
    case "CPI":
      return canWriteFHI(pp);
    case "GTH":
    case "HGH":
      return canWriteGTH(pp);
    default:
      return { ok: false, reasons: [`unknown format ${(format as string) ?? ""}`] };
  }
}
