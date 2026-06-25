import { generateBZVertices } from "./generateBZVertices";
import { getSymmetry } from "../spglib";
import { Structure } from "../../../structure";

import { spgroup_data } from "../spgData";

import { parameters } from "../../../../lattice/parameters";

function determineExtBravais(
  bL: string,
  spgN: number,
  a: number,
  b: number,
  c: number,
  alpha: number,
  beta: number,
  gamma: number,
): string {
  const threshold = 1e-7;

  switch (bL) {
    case "cP":
      if (spgN < 195 || spgN > 230)
        throw new Error("cP requires spacegroup number in [195, 230]");
      return spgN <= 206 ? "cP1" : "cP2";

    case "cF":
      if (spgN < 195 || spgN > 230)
        throw new Error("cF requires spacegroup number in [195, 230]");
      return spgN <= 206 ? "cF1" : "cF2";

    case "cI":
      return "cI1";

    case "tP":
      return "tP1";

    case "tI":
      if (c - a < threshold) {
        console.warn("tI lattice, a ≈ c");
      }
      return c <= a ? "tI1" : "tI2";

    case "oP":
      return "oP1";

    case "oF":
      if (1 / a ** 2 - (1 / b ** 2 + 1 / c ** 2) < threshold) {
        console.warn("oF degeneracy case");
      }

      if (1 / c ** 2 - (1 / a ** 2 + 1 / b ** 2) < threshold) {
        console.warn("oF degeneracy case");
      }

      if (1 / a ** 2 > 1 / b ** 2 + 1 / c ** 2) return "oF1";
      if (1 / c ** 2 > 1 / a ** 2 + 1 / b ** 2) return "oF2";
      return "oF3";

    case "oI": {
      const sorted = [
        { v: c, id: 1, label: "c" },
        { v: b, id: 3, label: "b" },
        { v: a, id: 2, label: "a" },
      ]
        .sort((x, y) => x.v - y.v)
        .reverse();

      if (Math.abs(sorted[0].v - sorted[1].v) < threshold) {
        console.warn("oI near-degeneracy");
      }

      return `${bL}${sorted[0].id}`;
    }

    case "oC":
      return a <= b ? "oC1" : "oC2";

    case "oA":
      return b <= c ? "oA1" : "oA2";

    case "hP":
      return [
        143, 144, 145, 156, 147, 148, 149, 151, 153, 157, 160, 161, 162, 163,
      ].includes(spgN)
        ? "hP1"
        : "hP2";

    case "hR":
      return Math.sqrt(3) * a < Math.sqrt(2) * c ? "hR1" : "hR2";

    case "mP":
      return "mP1";

    case "mC": {
      const rad = Math.PI / 180;
      const cosbeta = Math.cos(beta * rad);
      const sinbeta = Math.sin(beta * rad);

      const term1 = b - a * Math.sqrt(1 - sinbeta);

      if (Math.abs(term1) < threshold) {
        console.warn("mC near-degeneracy");
      }

      if (b < a * Math.sqrt(1 - sinbeta)) return "mC1";

      const expr = (-a * cosbeta) / c + a ** 2 * (1 - cosbeta ** 2 / b ** 2);

      if (Math.abs(expr - 1.0) < threshold) {
        console.warn("mC second degeneracy");
      }

      return expr <= 1 ? "mC2" : "mC3";
    }

    case "aP":
      console.warn("aP not implemented, defaulting");
      return "aP1";

    default:
      throw new Error(`Unknown bravais lattice: ${bL}`);
  }
}

export async function getSeekPathHighSymPath(
  structure: Structure,
  symTol = 1e-6,
): Promise<null> {
  const symData = await getSymmetry(structure, symTol);

  const spgN = symData.calculationResults.number;

  const props = spgroup_data[spgN];
  const bL = `${props[0]}${props[1]}`;

  const [a, b, c, alpha, beta, gamma] = parameters(
    symData.conventional.lattice,
  );

  const extBrav = determineExtBravais(bL, spgN, a, b, c, alpha, beta, gamma);

  return extBrav;
}
