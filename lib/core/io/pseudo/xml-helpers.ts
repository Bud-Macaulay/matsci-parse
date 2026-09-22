import { parse as parseTxml } from "txml/txml";

import {
  parseFortranNumber,
  parseIntSafe,
  parseFortranBool,
} from "./fortran-helpers";

/** An XML node: attributes under `@_<name>`, leaf text under `#text`. */
export type XmlNode = Record<string, any>;

/** Get an attribute value from an XML node. */
export function attr(node: XmlNode | undefined, name: string): string {
  return node?.[`@_${name}`] ?? "";
}

/** Get an attribute as a Fortran-number. */
export function attrNum(
  node: XmlNode | undefined,
  name: string,
  fallback = 0,
): number {
  const v = attr(node, name);
  return v ? parseFortranNumber(v) : fallback;
}

/** Get an attribute as an integer. */
export function attrInt(
  node: XmlNode | undefined,
  name: string,
  fallback = 0,
): number {
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

/** Object entries of an XML node, typed for section iteration. */
export function entries(node: XmlNode | undefined): Array<[string, XmlNode]> {
  return Object.entries(node ?? {}) as Array<[string, XmlNode]>;
}

const ENTITY_RE = /&(amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);/g;

/**
 * Decode XML entities. txml leaves them raw, so the adapter decodes the
 * predefined set plus decimal/hex character references.
 */
export function decodeEntities(s: string): string {
  if (!s.includes("&")) return s;
  return s.replace(ENTITY_RE, (m, body: string) => {
    switch (body) {
      case "amp":
        return "&";
      case "lt":
        return "<";
      case "gt":
        return ">";
      case "quot":
        return '"';
      case "apos":
        return "'";
      default: {
        const hex = body[1] === "x" || body[1] === "X";
        const code = parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
    }
  });
}

interface TxmlNode {
  tagName: string;
  attributes: Record<string, string>;
  children: Array<TxmlNode | string>;
}

function convertNode(node: TxmlNode, out: XmlNode): void {
  for (const k of Object.keys(node.attributes)) {
    // trimValues equivalent: attribute values are trimmed.
    out[`@_${k}`] = decodeEntities(node.attributes[k]).trim();
  }
  for (const child of node.children) {
    if (typeof child === "string") {
      if (child.trim() === "") continue;
      const text = decodeEntities(child);
      const prev = out["#text"];
      out["#text"] = prev === undefined ? text : `${prev as string}${text}`;
      continue;
    }
    // Skip processing instructions (e.g. <?xml ...?>).
    if (child.tagName.startsWith("?")) continue;
    appendChild(out, child.tagName, convertElement(child));
  }
  if (typeof out["#text"] === "string") out["#text"] = out["#text"].trim();
}

/**
 * Convert one element, mirroring fast-xml-parser value collapsing:
 * attribute-less leaves become bare strings ("" when empty).
 */
function convertElement(node: TxmlNode): XmlNode | string {
  const hasAttrs = Object.keys(node.attributes).length > 0;
  if (!hasAttrs) {
    const parts: string[] = [];
    for (const child of node.children) {
      if (typeof child === "string") {
        if (child.trim() !== "") parts.push(decodeEntities(child));
      } else if (!child.tagName.startsWith("?")) {
        // Has element children: fall through to object form below.
        const out: XmlNode = {};
        convertNode(node, out);
        return out;
      }
    }
    return parts.join("").trim();
  }
  const out: XmlNode = {};
  convertNode(node, out);
  return out;
}

function appendChild(out: XmlNode, tag: string, sub: XmlNode | string): void {
  const existing = out[tag];
  if (existing === undefined) out[tag] = sub;
  else if (Array.isArray(existing)) existing.push(sub);
  else out[tag] = [existing, sub];
}

/**
 * Parse XML text into an XmlNode tree (txml-backed).
 *
 * Equivalent semantics to the previous fast-xml-parser configuration:
 * attributes under `@_`, leaf text under `#text`, repeated tags as arrays.
 * Singletons stay objects — use toArray() when iterating sections.
 */
export function parseXml(text: string): XmlNode {
  const doc: XmlNode = {};
  for (const node of parseTxml(text) as TxmlNode[]) {
    if (typeof node === "string") continue;
    if (node.tagName.startsWith("?")) continue;
    appendChild(doc, node.tagName, convertElement(node));
  }
  return doc;
}
