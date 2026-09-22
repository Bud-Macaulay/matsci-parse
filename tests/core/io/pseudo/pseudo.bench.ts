import { bench, describe } from "vitest";

import { fromGTH, toGTH } from "@/core/io/pseudo/gth";
import { fromPSP8, toPSP8 } from "@/core/io/pseudo/psp8";
import { fromPSML, toPSML } from "@/core/io/pseudo/psml";
import { fromUPF, toUPF } from "@/core/io/pseudo/upf";
import { fromUPFv1, toUPFv1 } from "@/core/io/pseudo/upf-v1";
import { fromFHI, toFHI } from "@/core/io/pseudo/fhi";
import { detectFormat, parse, convert } from "@/core/io/pseudo/registry";
import { validate } from "@/core/pseudopotential/validate";
import { resampleLinear, makeRadialGrid } from "@/core/pseudopotential/operations";

import {
  realHGthPbe,
  realHeGthPbe,
  realCGthPbe,
  realNGthPbe,
  realOGthPbe,
  realMultiGth,
} from "./teststrings/gth";

import { realHPsp8, realCPsp8 } from "./teststrings/psp8";

import { realMoUpfV2Fhi, heNcUpf, oPawUpf } from "./teststrings/upf";

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

// ---------------------------------------------------------------------------
// UPF v1 (synthetic NC fixture via UPF2, 728 mesh)
// ---------------------------------------------------------------------------

const upfv1Text = toUPFv1(fromUPF(heNcUpf));
const upfv1Parsed = fromUPFv1(upfv1Text);

// warmup
toUPFv1(upfv1Parsed);

describe("pseudo parse: UPF v1", () => {
  bench("fromUPFv1 (He NC, 728 mesh)", () => {
    fromUPFv1(upfv1Text);
  });
});

describe("pseudo serialize: UPF v1", () => {
  bench("toUPFv1 (He NC)", () => {
    toUPFv1(upfv1Parsed);
  });
});

describe("pseudo round-trip: UPF v1", () => {
  bench("fromUPFv1 → toUPFv1 (He NC)", () => {
    toUPFv1(fromUPFv1(upfv1Text));
  });
});

// ---------------------------------------------------------------------------
// UPF v2 PAW (largest shape: augmentation + PAW + GIPAW)
// ---------------------------------------------------------------------------

const upfPaw = fromUPF(oPawUpf);

// warmup
toUPF(upfPaw);

describe("pseudo parse: UPF v2 PAW", () => {
  bench("fromUPF (O PAW, 1095 mesh, QIJL + PAW + GIPAW)", () => {
    fromUPF(oPawUpf);
  });
});

describe("pseudo serialize: UPF v2 PAW", () => {
  bench("toUPF (O PAW)", () => {
    toUPF(upfPaw);
  });
});

describe("pseudo round-trip: UPF v2 PAW", () => {
  bench("fromUPF → toUPF (O PAW)", () => {
    toUPF(fromUPF(oPawUpf));
  });
});

// ---------------------------------------------------------------------------
// Registry (detection + dispatch + conversion)
// ---------------------------------------------------------------------------

describe("pseudo registry: detectFormat", () => {
  bench("detectFormat (UPF2)", () => {
    detectFormat(heNcUpf);
  });

  bench("detectFormat (PSP8)", () => {
    detectFormat(realHPsp8);
  });

  bench("detectFormat (PSML)", () => {
    detectFormat(realHPsml);
  });

  bench("detectFormat (FHI)", () => {
    detectFormat(realHFhi);
  });

  bench("detectFormat (GTH)", () => {
    detectFormat(realHGthPbe);
  });
});

describe("pseudo registry: parse + convert", () => {
  bench("parse (auto-detect UPF2 He)", () => {
    parse(heNcUpf);
  });

  bench("convert PSP8 → UPF2 (H)", () => {
    convert(realHPsp8, "UPF2");
  });

  bench("convert FHI → UPF2 (C)", () => {
    convert(realCFhi, "UPF2");
  });
});

// ---------------------------------------------------------------------------
// First-class operations
// ---------------------------------------------------------------------------

const { r: resampleGrid } = makeRadialGrid({
  npts: 500,
  rmax: upfHe.mesh.r[upfHe.mesh.r.length - 1],
  type: "log",
});

describe("pseudo operations", () => {
  bench("validate (He NC, 728 mesh)", () => {
    validate(upfHe);
  });

  bench("validate (O PAW, 1095 mesh)", () => {
    validate(upfPaw);
  });

  bench("resampleLinear (He NC, 728 → 500 pts)", () => {
    resampleLinear(upfHe, resampleGrid);
  });
});
