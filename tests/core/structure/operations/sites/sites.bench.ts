import { bench, describe } from "vitest";

import { fromPOSCAR } from "@/core/io/poscar";
import { supercell } from "@/core/structure/operations/supercell";
import {
  insertSite,
  insertSites,
} from "@/core/structure/operations/sites/insertSite";
import {
  replaceSite,
  replaceSites,
} from "@/core/structure/operations/sites/replaceSite";
import {
  removeSite,
  removeSites,
} from "@/core/structure/operations/sites/removeSite";
import {
  appendSite,
  appendSites,
} from "@/core/structure/operations/sites/appendSite";

import { diamondCPOSCAR } from "../../teststrings/spglibPoscar";

const base = fromPOSCAR(diamondCPOSCAR);
const structure = supercell(base, [8, 8, 8]); // 4096 atoms

describe("500 site edits", () => {
  const site = structure.sites[0];
  const sites = Array.from({ length: 500 }, () => site);

  bench("append 500", () => {
    let s = structure;

    for (let i = 0; i < 500; i++) {
      s = appendSite(s, site);
    }
  });

  bench("appendSites 500", () => {
    appendSites(structure, sites);
  });

  bench("insert 500", () => {
    let s = structure;

    for (let i = 0; i < 500; i++) {
      s = insertSite(s, site);
    }
  });

  bench("insertSites 500", () => {
    insertSites(structure, 0, sites);
  });

  bench("remove 500", () => {
    let s = structure;

    for (let i = 0; i < 500; i++) {
      s = removeSite(s, Math.floor(s.sites.length / 2));
    }
  });

  bench("removeSites 500", () => {
    removeSites(
      structure,
      Array.from({ length: 500 }, (_, i) => i),
    );
  });
});
