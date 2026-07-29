import { bench, describe } from "vitest";

import { fromGTH, toGTH } from "@/core/io/pseudo/gth";
import { fromPSP8, toPSP8 } from "@/core/io/pseudo/psp8";
import { fromPSML, toPSML } from "@/core/io/pseudo/psml";
import { fromUPF, toUPF } from "@/core/io/pseudo/upf";
import { fromFHI, toFHI } from "@/core/io/pseudo/fhi";

import {
  realHGthPbe,
  realHeGthPbe,
  realCGthPbe,
  realNGthPbe,
  realOGthPbe,
  realMultiGth,
} from "./teststrings/gth";

import { realHPsp8, realCPsp8 } from "./teststrings/psp8";

import { realMoUpfV2Fhi, heNcUpf } from "./teststrings/upf";

import { realHPsml, realCPsml, realOPsml } from "./teststrings/psml";

import { realHFhi, realCFhi } from "./teststrings/fhi";

// ---------------------------------------------------------------------------
// GTH
// ---------------------------------------------------------------------------

const gthH = fromGTH(realHGthPbe);
const gthHe = fromGTH(realHeGthPbe);
const gthC = fromGTH(realCGthPbe);
const gthN = fromGTH(realNGthPbe);
const gthO = fromGTH(realOGthPbe);

// warmup (important for JIT stability)
toGTH(gthH);
toGTH(gthC);

describe("pseudo parse: GTH", () => {
  bench("fromGTH (H, 500-point grid, no projectors)", () => {
    fromGTH(realHGthPbe);
  });

  bench("fromGTH (C, 500-point grid, s+p projectors)", () => {
    fromGTH(realCGthPbe);
  });

  bench("fromGTH (N, 500-point grid, s+p projectors)", () => {
    fromGTH(realNGthPbe);
  });

  bench("fromGTH (O, 500-point grid, s+p projectors)", () => {
    fromGTH(realOGthPbe);
  });

  bench("fromGTH (multi: H+He+C)", () => {
    fromGTH(realMultiGth);
  });
});

describe("pseudo serialize: GTH", () => {
  bench("toGTH (H)", () => {
    toGTH(gthH);
  });

  bench("toGTH (C)", () => {
    toGTH(gthC);
  });
});

describe("pseudo round-trip: GTH", () => {
  bench("fromGTH → toGTH (C)", () => {
    toGTH(fromGTH(realCGthPbe));
  });

  bench("fromGTH → toGTH (multi: H+He+C)", () => {
    toGTH(fromGTH(realMultiGth));
  });
});

// ---------------------------------------------------------------------------
// PSP8
// ---------------------------------------------------------------------------

const psp8H = fromPSP8(realHPsp8);
const psp8C = fromPSP8(realCPsp8);

// warmup
toPSP8(psp8H);
toPSP8(psp8C);

describe("pseudo parse: PSP8", () => {
  bench("fromPSP8 (H, 300 mesh, 2s+1p projectors)", () => {
    fromPSP8(realHPsp8);
  });

  bench("fromPSP8 (C, 600 mesh, 2s+2p projectors)", () => {
    fromPSP8(realCPsp8);
  });
});

describe("pseudo serialize: PSP8", () => {
  bench("toPSP8 (H)", () => {
    toPSP8(psp8H);
  });

  bench("toPSP8 (C)", () => {
    toPSP8(psp8C);
  });
});

describe("pseudo round-trip: PSP8", () => {
  bench("fromPSP8 → toPSP8 (H)", () => {
    toPSP8(fromPSP8(realHPsp8));
  });

  bench("fromPSP8 → toPSP8 (C)", () => {
    toPSP8(fromPSP8(realCPsp8));
  });
});

// ---------------------------------------------------------------------------
// UPF v2
// ---------------------------------------------------------------------------

const upfMo = fromUPF(realMoUpfV2Fhi);
const upfHe = fromUPF(heNcUpf);

// warmup
toUPF(upfMo);
toUPF(upfHe);

describe("pseudo parse: UPF v2", () => {
  bench("fromUPF (Mo, 20 mesh, s+d+f projectors)", () => {
    fromUPF(realMoUpfV2Fhi);
  });

  bench("fromUPF (He NC, 728 mesh, 2s projectors)", () => {
    fromUPF(heNcUpf);
  });
});

describe("pseudo serialize: UPF v2", () => {
  bench("toUPF (Mo)", () => {
    toUPF(upfMo);
  });

  bench("toUPF (He)", () => {
    toUPF(upfHe);
  });
});

describe("pseudo round-trip: UPF v2", () => {
  bench("fromUPF → toUPF (Mo)", () => {
    toUPF(fromUPF(realMoUpfV2Fhi));
  });

  bench("fromUPF → toUPF (He)", () => {
    toUPF(fromUPF(heNcUpf));
  });
});

// ---------------------------------------------------------------------------
// FHI
// ---------------------------------------------------------------------------

const fhiH = fromFHI(realHFhi);
const fhiC = fromFHI(realCFhi);

describe("pseudo parse: FHI", () => {
  bench("fromFHI (H, 387 mesh, s+p+d+f)", () => {
    fromFHI(realHFhi);
  });

  bench("fromFHI (C, 461 mesh, s+p+d+f)", () => {
    fromFHI(realCFhi);
  });
});

describe("pseudo serialize: FHI", () => {
  bench("toFHI (H)", () => {
    toFHI(fhiH);
  });

  bench("toFHI (C)", () => {
    toFHI(fhiC);
  });
});

describe("pseudo round-trip: FHI", () => {
  bench("fromFHI → toFHI (C)", () => {
    toFHI(fromFHI(realCFhi));
  });
});

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// PSML
// ---------------------------------------------------------------------------

const psmlH = fromPSML(realHPsml);
const psmlC = fromPSML(realCPsml);
const psmlO = fromPSML(realOPsml);

describe("pseudo parse: PSML", () => {
  bench("fromPSML (H, 457 mesh, NC)", () => {
    fromPSML(realHPsml);
  });

  bench("fromPSML (C, 457 mesh, NC)", () => {
    fromPSML(realCPsml);
  });

  bench("fromPSML (O, 457 mesh, NC)", () => {
    fromPSML(realOPsml);
  });
});

describe("pseudo serialize: PSML", () => {
  bench("toPSML (H)", () => {
    toPSML(psmlH);
  });

  bench("toPSML (C)", () => {
    toPSML(psmlC);
  });

  bench("toPSML (O)", () => {
    toPSML(psmlO);
  });
});

describe("pseudo round-trip: PSML", () => {
  bench("fromPSML → toPSML (H)", () => {
    toPSML(fromPSML(realHPsml));
  });

  bench("fromPSML → toPSML (C)", () => {
    toPSML(fromPSML(realCPsml));
  });

  bench("fromPSML → toPSML (O)", () => {
    toPSML(fromPSML(realOPsml));
  });
});
