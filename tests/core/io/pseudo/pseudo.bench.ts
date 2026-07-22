import { bench, describe } from "vitest";

import { fromGTH, toGTH } from "@/core/io/pseudo/gth";
import { fromPSP8, toPSP8 } from "@/core/io/pseudo/psp8";
import { fromUPF, toUPF } from "@/core/io/pseudo/upf";
import { fromFHIFhi, toFHI } from "@/core/io/pseudo/fhi";
import { fromPSML, toPSML } from "@/core/io/pseudo/psml";

import {
  realHGthPbe,
  realHeGthPbe,
  realCGthPbe,
  realNGthPbe,
  realOGthPbe,
  realMultiGth,
  realHPsp8,
  realCPsp8,
  realMoUpfV2Fhi,
} from "./teststrings/real-world";

import { heNcUpf } from "./teststrings/upf";

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
  bench("fromPSP8 (H, 10 mesh, 2s+1p projectors)", () => {
    fromPSP8(realHPsp8);
  });

  bench("fromPSP8 (C, 10 mesh, 2s+2p projectors)", () => {
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
// FHI (stub — implement when fixtures are added)
// ---------------------------------------------------------------------------

// const fhiH = fromFHIFhi(realHFhi);
// const fhiC = fromFHIFhi(realCFhi);
//
// describe("pseudo parse: FHI", () => {
//   bench.skip("fromFHIFhi (H)", () => {
//     fromFHIFhi(realHFhi);
//   });
//
//   bench.skip("fromFHIFhi (C, with NLCC)", () => {
//     fromFHIFhi(realCFhi);
//   });
// });
//
// describe("pseudo serialize: FHI", () => {
//   bench.skip("toFHI (H)", () => {
//     toFHI(fhiH);
//   });
//
//   bench.skip("toFHI (C)", () => {
//     toFHI(fhiC);
//   });
// });
//
// describe("pseudo round-trip: FHI", () => {
//   bench.skip("fromFHIFhi → toFHI (C)", () => {
//     toFHI(fromFHIFhi(realCFhi));
//   });
// });

// ---------------------------------------------------------------------------
// PSML (stub — implement when fixtures are added)
// ---------------------------------------------------------------------------

// const psmlSi = fromPSML(realSiPsml);
//
// describe("pseudo parse: PSML", () => {
//   bench.skip("fromPSML (Si oncv)", () => {
//     fromPSML(realSiPsml);
//   });
// });
//
// describe("pseudo serialize: PSML", () => {
//   bench.skip("toPSML (Si)", () => {
//     toPSML(psmlSi);
//   });
// });
//
// describe("pseudo round-trip: PSML", () => {
//   bench.skip("fromPSML → toPSML (Si)", () => {
//     toPSML(fromPSML(realSiPsml));
//   });
// });
