import { CartesianCoords, Site } from "./common";

export interface MoleculeProps {
  species: string[];
  sites: Site[];
}

export class Molecule {
  species: string[];
  sites: Site[];

  constructor({ species, sites }: MoleculeProps) {
    this.species = this._validateSpecies(species);
    this.sites = this._validateSites(sites);
  }

  // ---------- Simple getters ----------
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

  // ---------- Manipulation ----------
  addSite(speciesIndex: number, cart: CartesianCoords) {
    this._validateSpeciesIndex(speciesIndex);
    this.sites.push(new Site(speciesIndex, cart));
  }

  removeSite(index: number) {
    this.sites.splice(index, 1);
  }

  copy(): Molecule {
    return new Molecule({
      species: [...this.species],
      sites: this.sites.map((s) => new Site(s.speciesIndex, [...s.cart])),
    });
  }

  toJSON() {
    return {
      species: this.species,
      sites: this.sites,
    };
  }

  // ---------- Validation ----------
  private _validateSpecies(species: string[]): string[] {
    if (!Array.isArray(species)) throw new Error("Species must be an array");
    species.forEach((s) => {
      if (typeof s !== "string")
        throw new Error("Species entries must be strings");
    });
    return species;
  }

  private _validateSites(sites: Site[]): Site[] {
    if (!Array.isArray(sites)) throw new Error("Sites must be an array");
    return sites.map((s) => {
      if (!(s instanceof Site))
        throw new Error("Each site must be a Site instance");
      return s;
    });
  }

  private _validateSpeciesIndex(index: number) {
    if (index < 0 || index >= this.species.length) {
      throw new Error("speciesIndex out of bounds");
    }
  }
}
