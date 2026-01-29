export type CartesianCoords = [number, number, number];

export class Site {
  speciesIndex: number;
  cart: CartesianCoords;

  constructor(speciesIndex: number, cart: CartesianCoords) {
    this.speciesIndex = speciesIndex;
    this.cart = cart;
  }
}

export interface CrystalStructureProps {
  lattice: CartesianCoords[];
  species: string[];
  sites: Site[];
}

export class CrystalStructure {
  lattice: CartesianCoords[];
  species: string[];
  sites: Site[];

  constructor({
    lattice,
    species,
    sites,
  }: {
    lattice: CartesianCoords[];
    species: string[];
    sites: (Site | { speciesIndex: number; cart: CartesianCoords })[];
  }) {
    this.lattice = this._validateLattice(lattice);
    this.species = this._validateSpecies(species);
    this.sites = this._validateSites(sites);
  }

  // ---------- Simple methods ----------
  get numSites(): number {
    return this.sites.length;
  }

  site(i: number): Site {
    return this.sites[i];
  }

  cartCoords(i: number): CartesianCoords {
    return this.sites[i].cart;
  }

  siteSpecies(i: number): string {
    return this.species[this.sites[i].speciesIndex];
  }

  get elements(): string[] {
    return this.species;
  }

  addSite(speciesIndex: number, cart: CartesianCoords) {
    this._validateSpeciesIndex(speciesIndex);
    this.sites.push(new Site(speciesIndex, cart));
  }

  removeSite(index: number) {
    this.sites.splice(index, 1);
  }

  // ---------- Internal validation ----------
  private _validateLattice(lattice: CartesianCoords[]): CartesianCoords[] {
    if (!Array.isArray(lattice) || lattice.length !== 3)
      throw new Error("Lattice must be a 3x3 matrix");
    lattice.forEach((v) => {
      if (!Array.isArray(v) || v.length !== 3)
        throw new Error("Lattice vectors must be length 3");
    });
    return lattice;
  }

  private _validateSpecies(species: string[]): string[] {
    if (!Array.isArray(species)) throw new Error("Species must be an array");
    species.forEach((s) => {
      if (typeof s !== "string")
        throw new Error("Species entries must be strings");
    });
    return species;
  }

  private _validateSites(
    sites: (Site | { speciesIndex: number; cart: CartesianCoords })[],
  ): Site[] {
    if (!Array.isArray(sites)) throw new Error("Sites must be an array");

    return sites.map((s) => {
      if (s instanceof Site) return s;

      // plain object → Site instance
      if (
        typeof s === "object" &&
        typeof s.speciesIndex === "number" &&
        Array.isArray(s.cart) &&
        s.cart.length === 3
      ) {
        this._validateSpeciesIndex(s.speciesIndex);
        return new Site(s.speciesIndex, s.cart as CartesianCoords);
      }

      throw new Error(
        "Each site must be a Site instance or a valid site object",
      );
    });
  }

  private _validateSpeciesIndex(index: number) {
    if (index < 0 || index >= this.species.length)
      throw new Error("speciesIndex out of bounds");
  }
}
