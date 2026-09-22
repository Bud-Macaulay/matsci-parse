import { describe, it, expect } from "vitest";

import {
  guessElement,
  elementToZ,
  pspxcToFunctional,
  functionalToPspxc,
} from "@/core/io/pseudo/elements";

describe("elements", () => {
  it("maps atomic numbers to symbols with X fallback", () => {
    expect(guessElement(1)).toBe("H");
    expect(guessElement(6)).toBe("C");
    expect(guessElement(999)).toBe("X");
  });

  it("maps symbols to atomic numbers with 0 fallback", () => {
    expect(elementToZ("He")).toBe(2);
    expect(elementToZ("Xx")).toBe(0);
  });

  it("maps pspxc codes with xc= fallback", () => {
    expect(pspxcToFunctional(11)).toBe("PBE");
    expect(pspxcToFunctional(999)).toBe("xc=999");
  });

  it("reverse-maps functional names with undefined fallback", () => {
    expect(functionalToPspxc("PBE")).toBe(11);
    expect(functionalToPspxc("NOPE")).toBeUndefined();
  });
});
