import { Site, hasSelectiveDynamics } from "../../lib/io/common";
import { CrystalStructure } from "../../lib/io/crystal";

describe("Site", () => {
  test("constructor sets values correctly", () => {
    const props = { foo: 42 };
    const s = new Site(1, [1, 2, 3], props);

    expect(s.speciesIndex).toBe(1);
    expect(s.cart).toEqual([1, 2, 3]);
    expect(s.props).toEqual(props);
  });

  test("default props object is created if not passed", () => {
    const s = new Site(0, [0, 0, 0]);
    expect(s.props).toEqual({});
  });

  test("getProp returns existing property and undefined for missing", () => {
    const s = new Site(0, [0, 0, 0], { a: 123 });
    expect(s.getProp("a")).toBe(123);
    expect(s.getProp("b")).toBeUndefined();
  });

  test("setProp updates properties correctly", () => {
    const s = new Site(0, [0, 0, 0]);
    s.setProp("newProp", "hello");
    expect(s.getProp("newProp")).toBe("hello");

    // overwrite existing prop
    s.setProp("newProp", 99);
    expect(s.getProp("newProp")).toBe(99);
  });
});

describe("hasSelectiveDynamics", () => {
  test("returns true if any site has selectiveDynamics array", () => {
    const structure = new CrystalStructure({
      lattice: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      species: ["H", "O"],
      sites: [
        {
          speciesIndex: 0,
          cart: [0, 0, 0],
          props: { selectiveDynamics: [true, true, true] },
        },
        { speciesIndex: 1, cart: [1, 1, 1] },
      ],
    });

    expect(hasSelectiveDynamics(structure)).toBe(true);
  });

  test("returns false if no site has selectiveDynamics", () => {
    const structure = new CrystalStructure({
      lattice: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      species: ["H", "O"],
      sites: [
        { speciesIndex: 0, cart: [0, 0, 0] },
        { speciesIndex: 1, cart: [1, 1, 1] },
      ],
    });

    expect(hasSelectiveDynamics(structure)).toBe(false);
  });
});
