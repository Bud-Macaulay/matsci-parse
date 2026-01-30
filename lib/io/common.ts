import { CrystalStructure } from "./crystal";

export type CartesianCoords = [number, number, number];

export type SiteProperties = Record<string, unknown>;

export class Site {
  speciesIndex: number;
  cart: CartesianCoords;
  props: SiteProperties;

  constructor(
    speciesIndex: number,
    cart: CartesianCoords,
    props: SiteProperties = {},
  ) {
    this.speciesIndex = speciesIndex;
    this.cart = cart;
    this.props = props;
  }

  getProp<T = unknown>(key: string): T | undefined {
    return this.props[key] as T | undefined;
  }

  setProp(key: string, value: unknown): void {
    this.props[key] = value;
  }
}

export function hasSelectiveDynamics(structure: CrystalStructure): boolean {
  return structure.sites.some((s) => Array.isArray(s.props.selectiveDynamics));
}
