import { Site } from "./site";

function wrapValue(x: number): number {
  return ((x % 1) + 1) % 1;
}

export function wrap<T>(site: Site<T>): Site<T> {
  return {
    ...site,
    frac: [
      wrapValue(site.frac[0]),
      wrapValue(site.frac[1]),
      wrapValue(site.frac[2]),
    ],
  };
}
