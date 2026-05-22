import { describe, it, expect } from "vitest";
import { cubic } from "@/core/lattice/create/cubic";

import { expectArrayClose } from "../../../helpers/closeUtils";

describe("cubic", () => {
  it("creates orthonormal cubic lattice", () => {
    const l = cubic(2);

    expectArrayClose(l.basis.data, [2, 0, 0, 0, 2, 0, 0, 0, 2]);
  });
});
