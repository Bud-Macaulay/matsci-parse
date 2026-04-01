import { VolumetricData } from "../../lib/main";
import { CartesianCoords, GridShape } from "../../lib/io/common";

describe("VolumetricData", () => {
  const origin: CartesianCoords = [0, 0, 0];
  const basis: [CartesianCoords, CartesianCoords, CartesianCoords] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const shape: GridShape = [2, 2, 2];
  const values = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]);

  let volData: VolumetricData;

  beforeEach(() => {
    volData = new VolumetricData({
      origin,
      basis,
      shape,
      values: values.slice(),
    });
  });

  test("basic get, set, and index", () => {
    expect(volData.get(0, 0, 0)).toBe(1);
    volData.set(0, 0, 0, 0, 10);
    expect(volData.get(0, 0, 0)).toBe(10);

    const idx = volData.index(1, 1, 1);
    expect(volData.values[idx]).toBe(8);
  });

  test("position calculation", () => {
    expect(volData.position(0, 0, 0)).toEqual([0, 0, 0]);
    expect(volData.position(1, 0, 0)).toEqual([1, 0, 0]);
    expect(volData.position(0, 1, 1)).toEqual([0, 1, 1]);
  });

  test("min, max, mean and caching", () => {
    expect(volData.min()).toBe(1);
    expect(volData.max()).toBe(8);
    expect(volData.mean()).toBeCloseTo(4.5);

    // mutate a value → cache invalidated
    volData.set(0, 0, 0, 0, 20);
    expect(volData.min()).toBe(2);
    expect(volData.max()).toBe(20);
    expect(volData.mean()).toBeCloseTo((20 + 2 + 3 + 4 + 5 + 6 + 7 + 8) / 8);
  });

  test("map transforms all values and invalidates cache", () => {
    volData.map((v) => v * 2);
    expect(volData.get(0, 0, 0)).toBe(2);
    expect(volData.get(1, 1, 1)).toBe(16);
    expect(volData.min()).toBe(2);
    expect(volData.max()).toBe(16);
    expect(volData.mean()).toBeCloseTo((2 + 4 + 6 + 8 + 10 + 12 + 14 + 16) / 8);
  });

  test("multi-component support", () => {
    const multiValues = new Float32Array([
      1, 10, 2, 20, 3, 30, 4, 40, 5, 50, 6, 60, 7, 70, 8, 80,
    ]);
    const volMulti = new VolumetricData({
      origin,
      basis,
      shape,
      values: multiValues,
      components: 2,
    });

    expect(volMulti.get(0, 0, 0, 0)).toBe(1);
    expect(volMulti.get(0, 0, 0, 1)).toBe(10);
    expect(volMulti.get(1, 1, 1, 0)).toBe(8);
    expect(volMulti.get(1, 1, 1, 1)).toBe(80);
  });

  test("voxelVolume and integral", () => {
    if (
      typeof volData.voxelVolume === "function" &&
      typeof volData.integral === "function"
    ) {
      expect(volData.voxelVolume()).toBe(1);
      expect(volData.integral()).toBeCloseTo(volData.mean() * 8);
    }
  });

  test("edge cases", () => {
    // single voxel
    const single = new VolumetricData({
      origin,
      basis,
      shape: [1, 1, 1],
      values: new Float32Array([42]),
    });
    expect(single.min()).toBe(42);
    expect(single.max()).toBe(42);
    expect(single.mean()).toBe(42);

    expect(
      () =>
        new VolumetricData({
          origin,
          basis,
          shape: [2, 2, 2],
          values: new Float32Array([]),
        }),
    ).toThrow("Invalid values length");
  });
});
