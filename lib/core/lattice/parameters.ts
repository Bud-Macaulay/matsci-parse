import { lengths } from "./lengths";
import { angles } from "./angles";
import { Lattice } from "./lattice";

const RAD2DEG = 180 / Math.PI;

export function parameters(
  lattice: Lattice,
): [number, number, number, number, number, number] {
  const [a, b, c] = lengths(lattice);
  const [alpha, beta, gamma] = angles(lattice);

  return [a, b, c, alpha * RAD2DEG, beta * RAD2DEG, gamma * RAD2DEG];
}
