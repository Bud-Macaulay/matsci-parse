import { describe, it, expect } from "vitest";
import { fromXYZ } from "@/core/io/xyz";
import { getDistance } from "@/core/structure/operations/distance/getDistance";
import { getAngle } from "@/core/structure/operations/angle/getAngle";

// A 30 Å chain: longer than half its padded box (30 + 2·10 Å), so minimum
// image would wrap the end-to-end distance to 20 Å.
const chain = fromXYZ(`3
chain
C 0 0 0
C 15 0 0
C 30 0 0
`);

describe("molecule geometry (no periodic images)", () => {
  it("end-to-end distance is the plain one", () => {
    expect(getDistance(chain, 0, 2)).toBeCloseTo(30);
  });

  it("angle along the chain is 180°", () => {
    expect(getAngle(chain, 0, 1, 2)).toBeCloseTo(180);
  });
});
