export type CartesianCoords = [number, number, number];

export class Site {
  speciesIndex: number;
  cart: CartesianCoords;

  constructor(speciesIndex: number, cart: CartesianCoords) {
    this.speciesIndex = speciesIndex;
    this.cart = cart;
  }
}
