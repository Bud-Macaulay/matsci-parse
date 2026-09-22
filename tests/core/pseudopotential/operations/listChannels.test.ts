import { describe, it, expect } from "vitest";

import { listChannels } from "@/core/pseudopotential/operations";
import { fromUPF } from "@/core/io/pseudo/upf";
import { fromFHI } from "@/core/io/pseudo/fhi";

import { heNcUpf } from "../../io/pseudo/teststrings/upf";
import { realCFhi } from "../../io/pseudo/teststrings/fhi";

describe("listChannels", () => {
  it("groups He NC projectors and wavefunctions by l", () => {
    const channels = listChannels(fromUPF(heNcUpf));
    expect(channels.map((c) => c.l)).toEqual([0]);
    expect(channels[0].betas.length).toBe(2);
    expect(channels[0].wfcs.length).toBe(1);
  });

  it("marks the local channel", () => {
    const pp = fromFHI(realCFhi);
    expect(pp.header.lLocal).toBe(0);
    const channels = listChannels(pp);
    expect(channels.find((c) => c.l === 0)?.isLocal).toBe(true);
    expect(channels.find((c) => c.l === 1)?.isLocal).toBe(false);
  });
});
