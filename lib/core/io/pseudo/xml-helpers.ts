import { parseFortranNumber, parseIntSafe, parseFortranBool } from "./fortran-helpers";

/** An XML node as returned by fast-xml-parser. */
export type XmlNode = Record<string, any>;

/** Get an attribute value from an XML node. */
export function attr(node: XmlNode | undefined, name: string): string {
  return node?.[`@_${name}`] ?? "";
}

/** Get an attribute as a Fortran-number. */
export function attrNum(node: XmlNode | undefined, name: string, fallback = 0): number {
  const v = attr(node, name);
  return v ? parseFortranNumber(v) : fallback;
}

/** Get an attribute as an integer. */
export function attrInt(node: XmlNode | undefined, name: string, fallback = 0): number {
  const v = attr(node, name);
  return v ? parseIntSafe(v) : fallback;
}

/** Get an attribute as a Fortran boolean. */
export function attrBool(node: XmlNode | undefined, name: string): boolean {
  return parseFortranBool(attr(node, name) || ".false.");
}

/** Extract text content from an XML node. */
export function textOf(node: XmlNode | string | undefined): string {
  if (typeof node === "string") return node;
  if (node && "#text" in node) return String(node["#text"]);
  return "";
}

/** Normalize a value or array to an array (ensuring T[]). */
export function toArray<T>(v: T | T[] | undefined | null): T[] {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  return [v];
}
