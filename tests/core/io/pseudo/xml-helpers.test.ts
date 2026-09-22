import { describe, it, expect } from "vitest";

import {
  attr,
  attrNum,
  attrInt,
  attrBool,
  textOf,
  toArray,
  entries,
  decodeEntities,
  parseXml,
} from "@/core/io/pseudo/xml-helpers";

describe("xml-helpers", () => {
  describe("attr family", () => {
    it("reads attributes with @_ prefix", () => {
      expect(attr({ "@_a": "x" }, "a")).toBe("x");
      expect(attr(undefined, "a")).toBe("");
    });

    it("parses numbers with fallbacks", () => {
      expect(attrNum({ "@_v": "2.5" }, "v")).toBe(2.5);
      expect(attrNum({}, "v")).toBe(0);
      expect(attrNum({}, "v", 7)).toBe(7);
      expect(attrInt({ "@_v": "3" }, "v")).toBe(3);
      expect(attrInt({}, "v", 9)).toBe(9);
    });

    it("parses Fortran booleans", () => {
      expect(attrBool({ "@_v": "T" }, "v")).toBe(true);
      expect(attrBool({}, "v")).toBe(false);
    });
  });

  describe("textOf", () => {
    it("handles strings, #text nodes and missing text", () => {
      expect(textOf("hi")).toBe("hi");
      expect(textOf({ "#text": "yo" })).toBe("yo");
      expect(textOf({})).toBe("");
      expect(textOf(undefined)).toBe("");
    });
  });

  describe("toArray/entries", () => {
    it("normalizes singletons and empties", () => {
      expect(toArray([1])).toEqual([1]);
      expect(toArray(1)).toEqual([1]);
      expect(toArray(null)).toEqual([]);
      expect(toArray(undefined)).toEqual([]);
    });

    it("iterates node entries", () => {
      expect(entries({ a: 1 })).toEqual([["a", 1]]);
      expect(entries(undefined)).toEqual([]);
    });
  });

  describe("decodeEntities", () => {
    it("passes through strings without ampersands", () => {
      expect(decodeEntities("plain")).toBe("plain");
    });

    it("decodes predefined entities", () => {
      expect(decodeEntities("a &amp; b")).toBe("a & b");
      expect(decodeEntities("&lt;&gt;&quot;&apos;")).toBe('<>"\'');
    });

    it("decodes decimal and hex character references", () => {
      expect(decodeEntities("&#65;")).toBe("A");
      expect(decodeEntities("&#x41;")).toBe("A");
    });

    it("leaves unknown entities raw", () => {
      expect(decodeEntities("&bogus;")).toBe("&bogus;");
    });
  });

  describe("parseXml", () => {
    it("skips processing instructions and whitespace text", () => {
      const doc = parseXml('<?xml version="1.0"?>\n<A>\n  <B>x</B>\n</A>');
      expect(doc).toEqual({ A: { B: "x" } });
    });

    it("collects repeated tags into arrays and trims attributes", () => {
      const doc = parseXml('<R><I v=" 1 ">a</I><I v="2">b</I><E/></R>');
      expect(doc).toEqual({
        R: { I: [{ "@_v": "1", "#text": "a" }, { "@_v": "2", "#text": "b" }], E: "" },
      });
    });

    it("decodes entities in text and attributes", () => {
      const doc = parseXml('<R a="x &amp; y">t &lt; u</R>');
      expect(doc).toEqual({ R: { "@_a": "x & y", "#text": "t < u" } });
    });
  });
});
