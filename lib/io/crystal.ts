import { Site, CartesianCoords } from "./common";
import { multiplyMatrixVector } from "./math";

/**
 * Properties required to construct a CrystalStructure.
 */
export interface CrystalStructureProps {
  /** 3x3 array of Cartesian lattice vectors */
  lattice: CartesianCoords[];
  /** List of chemical species in the structure */
  species: string[];
  /** List of atomic sites in the structure */
  sites: Site[];
}

/**
 * Represents a crystal structure, including lattice vectors, chemical species, and atomic sites.
 *
 * Provides utility methods for accessing sites, species, and applying linear lattice transformations.
 */
export class CrystalStructure {
  /** Array of 3 Cartesian lattice vectors */
  lattice: CartesianCoords[];
  /** Array of chemical species in the structure */
  species: string[];
  /** List of atomic sites in the structure */
  sites: Site[];

  /**
   * Creates a new CrystalStructure.
   *
   * @param props - Object containing lattice, species, and sites
   * @param props.lattice - 3x3 array of Cartesian lattice vectors
   * @param props.species - List of chemical species
   * @param props.sites - List of Site instances or objects with speciesIndex and Cartesian coordinates
   *
   * @throws Will throw an error if lattice is not 3x3, species is not an array of strings, or sites are invalid
   */
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

  /** Number of sites in the structure */
  get numSites(): number {
    return this.sites.length;
  }

  /**
   * Returns the site at the specified index.
   * @param i - Site index
   */
  site(i: number): Site {
    return this.sites[i];
  }

  /**
   * Returns the Cartesian coordinates of a site.
   * @param i - Site index
   */
  cartCoords(i: number): CartesianCoords {
    return this.sites[i].cart;
  }

  /**
   * Returns the chemical species of a site.
   * @param i - Site index
   */
  siteSpecies(i: number): string {
    return this.species[this.sites[i].speciesIndex];
  }

  /** Returns the array of elements (species) in the structure */
  get elements(): string[] {
    return this.species;
  }

  /**
   * Adds a new site to the crystal.
   * If the species is not already in the structure, it is added automatically.
   *
   * @param species - Name of the species
   * @param cart - Cartesian coordinates of the new site
   * @param position - Optional index at which to insert the site. Defaults to appending at the end.
   */
  addSite(species: string, cart: CartesianCoords, position?: number) {
    let speciesIndex = this.species.indexOf(species);
    if (speciesIndex === -1) {
      this.species.push(species);
      speciesIndex = this.species.length - 1;
    }

    const newSite = new Site(speciesIndex, cart);

    if (position === undefined || position >= this.sites.length) {
      this.sites.push(newSite);
    } else if (position < 0) {
      this.sites.unshift(newSite);
    } else {
      this.sites.splice(position, 0, newSite);
    }
  }

  /**
   * Removes a site from the crystal.
   * Automatically removes species from the species array if no other site uses it.
   * Updates speciesIndex for remaining sites if necessary.
   *
   * @param index - Index of the site to remove
   *
   * @throws Will throw an error if index is out of bounds
   */
  removeSite(index: number) {
    if (index < 0 || index >= this.sites.length) {
      throw new Error("siteIndex out of bounds");
    }

    const removedSite = this.sites.splice(index, 1)[0];
    const speciesIndex = removedSite.speciesIndex;

    // Check if this species is still used
    const stillUsed = this.sites.some(
      (site) => site.speciesIndex === speciesIndex,
    );

    if (!stillUsed) {
      // Remove species from array
      this.species.splice(speciesIndex, 1);

      // Update speciesIndex for remaining sites
      this.sites.forEach((site) => {
        if (site.speciesIndex > speciesIndex) site.speciesIndex -= 1;
      });
    }
  }

  /**
   * Replaces the species of a site at the given index.
   * Internally calls `removeSite` and `addSite` to ensure species array cleanup
   * and proper indexing. The site’s coordinates are preserved.
   *
   * @param siteIndex - Index of the site to replace
   * @param newSpecies - Name of the new species
   *
   * @throws Will throw an error if siteIndex is out of bounds
   */
  replaceSite(siteIndex: number, newSpecies: string) {
    if (siteIndex < 0 || siteIndex >= this.sites.length) {
      throw new Error("siteIndex out of bounds");
    }

    // Save site coordinates
    const cart = [...this.sites[siteIndex].cart] as CartesianCoords;

    // Remove the old site
    this.removeSite(siteIndex);

    // Add the new species at the same position
    this.addSite(newSpecies, cart, siteIndex);
  }

  /**
   * Returns a new CrystalStructure transformed by a linear matrix.
   *
   * Can be used for uniform scaling, diagonal scaling, or applying a full 3x3 transformation matrix.
   *
   * @param scale - Transformation to apply:
   *   - single number: uniform scaling along all axes
   *   - 3-element array: diagonal scaling [sx, sy, sz]
   *   - 3x3 matrix: full linear transformation
   * @returns A new CrystalStructure instance with transformed lattice and sites
   *
   * @throws Will throw an error if scale is not a number, a 3-element array, or a 3x3 matrix
   */
  applyLatticeTransformation(
    scale: number | [number, number, number] | number[][],
  ): CrystalStructure {
    let transform: number[][];

    if (typeof scale === "number") {
      transform = [
        [scale, 0, 0],
        [0, scale, 0],
        [0, 0, scale],
      ];
    } else if (
      Array.isArray(scale) &&
      scale.length === 3 &&
      scale.every((v) => typeof v === "number")
    ) {
      transform = [
        [scale[0], 0, 0],
        [0, scale[1], 0],
        [0, 0, scale[2]],
      ];
    } else if (
      Array.isArray(scale) &&
      scale.length === 3 &&
      scale.every((row) => Array.isArray(row) && row.length === 3)
    ) {
      transform = scale as number[][];
    } else {
      throw new Error(
        "Scale must be a number, a 3-element array, or a 3x3 matrix",
      );
    }

    // transform lattice
    const newLattice: CartesianCoords[] = this.lattice.map(
      (vec) => multiplyMatrixVector(transform, vec) as CartesianCoords,
    );

    // transform sites
    const newSites: Site[] = this.sites.map((site) => {
      const newCart = multiplyMatrixVector(
        transform,
        site.cart,
      ) as CartesianCoords;
      return new Site(site.speciesIndex, newCart, site.props);
    });

    return new CrystalStructure({
      lattice: newLattice,
      species: [...this.species],
      sites: newSites,
    });
  }

  // ---------- Internal validation ----------

  /**
   * Validates that the lattice is a 3x3 array of Cartesian vectors.
   * @throws Will throw an error if lattice is invalid
   */
  private _validateLattice(lattice: CartesianCoords[]): CartesianCoords[] {
    if (!Array.isArray(lattice) || lattice.length !== 3)
      throw new Error("Lattice must be a 3x3 matrix");
    lattice.forEach((v) => {
      if (!Array.isArray(v) || v.length !== 3)
        throw new Error("Lattice vectors must be length 3");
    });
    return lattice;
  }

  /**
   * Validates that species is an array of strings.
   * @throws Will throw an error if species array is invalid
   */
  private _validateSpecies(species: string[]): string[] {
    if (!Array.isArray(species)) throw new Error("Species must be an array");
    species.forEach((s) => {
      if (typeof s !== "string")
        throw new Error("Species entries must be strings");
    });
    return species;
  }

  /**
   * Validates the sites array, ensuring each site is a Site instance or a valid object.
   * @throws Will throw an error if sites array is invalid
   */
  private _validateSites(
    sites: (
      | Site
      | {
          speciesIndex: number;
          cart: CartesianCoords;
          props?: Record<string, unknown>;
        }
    )[],
  ): Site[] {
    if (!Array.isArray(sites)) throw new Error("Sites must be an array");

    return sites.map((s) => {
      if (s instanceof Site) return s;

      if (
        typeof s === "object" &&
        typeof s.speciesIndex === "number" &&
        Array.isArray(s.cart) &&
        s.cart.length === 3
      ) {
        this._validateSpeciesIndex(s.speciesIndex);
        return new Site(
          s.speciesIndex,
          s.cart as CartesianCoords,
          s.props ?? {},
        );
      }

      throw new Error(
        "Each site must be a Site instance or a valid site object",
      );
    });
  }

  /**
   * Validates that a species index is within bounds.
   * @throws Will throw an error if index is out of range
   */
  private _validateSpeciesIndex(index: number) {
    if (index < 0 || index >= this.species.length)
      throw new Error("speciesIndex out of bounds");
  }
}
