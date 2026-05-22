import { describe, it, expect } from "vitest";
import { orthorhombic } from "@/core/lattice/create/orthorhombic";

import { expectArrayClose } from "../../../helpers/closeUtils";

describe("orthorhombic", () => {
  it("creates diagonal lattice", () => {
    const l = orthorhombic(2, 3, 4);

    expectArrayClose(l.basis.data, [2, 0, 0, 0, 3, 0, 0, 0, 4]);
  });
});
