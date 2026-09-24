import { createLattice } from "@/core/lattice/lattice";
import { createSite } from "@/core/site/site";
import { createSpecies } from "@/core/species/species";
import { Structure } from "@/core/structure/structure";

/** Reference structures for diffraction parity tests.
 *
 * CsCl, LiFePO4, Li10GeP2S12 and Graphite mirror pymatgen's TEST_STRUCTURES;
 * TetragonalSiRuPr and TungstenBCC mirror the bespoke cases in test_xrd.py.
 * Multi-species sites are expanded (the Structure model is single-species-per-site).
 */

export const CsCl: Structure = {
  lattice: createLattice([4.209, 0.0, 0.0, 0.0, 4.209, 0.0, 0.0, 0.0, 4.209]),
  sites: [
    createSite(createSpecies("Cs"), [0.0, 0.0, 0.0]),
    createSite(createSpecies("Cl"), [0.5, 0.5, 0.5]),
  ],
};

export const LiFePO4: Structure = {
  lattice: createLattice([0.0, 0.0, -4.7448, -0.053122654367700306, -6.065537365280947, 0.00038324092231544317, 10.41036999994276, 0.0, 3.452209424235223e-05]),
  sites: [
    createSite(createSpecies("Li"), [0.00001, 0.99999, 0.99999]),
    createSite(createSpecies("Li"), [0.99999, 0.5, 0.00001]),
    createSite(createSpecies("Li"), [0.49999, 0.99999, 0.499999999]),
    createSite(createSpecies("Li"), [0.50002, 0.5, 0.49999999]),
    createSite(createSpecies("Fe"), [0.5250699999999999, 0.2534399999999999, 0.21884]),
    createSite(createSpecies("Fe"), [0.02507999999999999, 0.74654, 0.28116]),
    createSite(createSpecies("Fe"), [0.97497, 0.25346, 0.71884]),
    createSite(createSpecies("Fe"), [0.47492999999999985, 0.7465299999999999, 0.78116]),
    createSite(createSpecies("P"), [0.5820500000000001, 0.75169, 0.09444]),
    createSite(createSpecies("P"), [0.08206999999999998, 0.24829999999999997, 0.40556000000000003]),
    createSite(createSpecies("P"), [0.91794, 0.75174, 0.59443]),
    createSite(createSpecies("P"), [0.41793, 0.24827999999999983, 0.9055699999999999]),
    createSite(createSpecies("O"), [0.29156000000000004, 0.2511199999999999, 0.04317]),
    createSite(createSpecies("O"), [0.25851, 0.7504299999999999, 0.09622]),
    createSite(createSpecies("O"), [0.71346, 0.95594, 0.16579999999999998]),
    createSite(createSpecies("O"), [0.71627, 0.5486, 0.16562]),
    createSite(createSpecies("O"), [0.21629, 0.4514, 0.33438]),
    createSite(createSpecies("O"), [0.21345000000000003, 0.04405999999999988, 0.33418999999999993]),
    createSite(createSpecies("O"), [0.75852, 0.24954999999999994, 0.4037799999999999]),
    createSite(createSpecies("O"), [0.79157, 0.7489, 0.45682000000000006]),
    createSite(createSpecies("O"), [0.2084499999999999, 0.2510999999999999, 0.54316]),
    createSite(createSpecies("O"), [0.24149, 0.7504599999999999, 0.59622]),
    createSite(createSpecies("O"), [0.7865800000000001, 0.95602, 0.6657699999999999]),
    createSite(createSpecies("O"), [0.78367, 0.54867, 0.6656399999999999]),
    createSite(createSpecies("O"), [0.2836599999999999, 0.45133, 0.83436]),
    createSite(createSpecies("O"), [0.28657999999999995, 0.043989999999999974, 0.83423]),
    createSite(createSpecies("O"), [0.74149, 0.24958000000000002, 0.90378]),
    createSite(createSpecies("O"), [0.70842, 0.7488900000000001, 0.9568399999999998]),
  ],
};


// The XRD Module also supports partial occupancies!
export const Li10GeP2S12: Structure = {
  lattice: createLattice([-8.69407, 0, 0, 0, -8.69407, 0, 0, 0, -12.5994]),
  sites: [
    createSite(createSpecies("Li", { occu: 0.691 }), [0.7437, 0.7282, 0.8168]),
    createSite(createSpecies("Li", { occu: 0.691 }), [0.2563, 0.27180, 0.8168]),
    createSite(createSpecies("Li", { occu: 0.691 }), [0.7718, 0.24370, 0.3168]),
    createSite(createSpecies("Li", { occu: 0.691 }), [0.2282, 0.7563, 0.3168]),
    createSite(createSpecies("Li", { occu: 0.691 }), [0.7563, 0.2282, 0.6832]),
    createSite(createSpecies("Li", { occu: 0.691 }), [0.24370, 0.7718, 0.6832]),
    createSite(createSpecies("Li", { occu: 0.691 }), [0.7282, 0.7437, 0.18320]),
    createSite(createSpecies("Li", { occu: 0.691 }), [0.27180, 0.2563, 0.183200]),
    createSite(createSpecies("Li", { occu: 0.691 }), [0.7563, 0.7718, 0.6832]),
    createSite(createSpecies("Li", { occu: 0.691 }), [0.24370, 0.2282, 0.6832]),
    createSite(createSpecies("Li", { occu: 0.691 }), [0.7282, 0.2563, 0.18320]),
    createSite(createSpecies("Li", { occu: 0.691 }), [0.27180, 0.7437, 0.18320]),
    createSite(createSpecies("Li", { occu: 0.691 }), [0.7437, 0.27180, 0.8168]),
    createSite(createSpecies("Li", { occu: 0.691 }), [0.2563, 0.7282, 0.8168]),
    createSite(createSpecies("Li", { occu: 0.691 }), [0.7718, 0.7563, 0.3168]),
    createSite(createSpecies("Li", { occu: 0.691 }), [0.2282, 0.24370, 0.31680]),
    createSite(createSpecies("Li", { occu: 1.0 }), [0.0, 0.5, 0.05540]),
    createSite(createSpecies("Li", { occu: 1.0 }), [0.0, 0.5, 0.55540]),
    createSite(createSpecies("Li", { occu: 1.0 }), [0.5, 0.0, 0.4446]),
    createSite(createSpecies("Li", { occu: 1.0 }), [0.5, 0.0, 0.9446]),
    createSite(createSpecies("Li", { occu: 0.643 }), [0.7537, 0.7537, 0.0]),
    createSite(createSpecies("Li", { occu: 0.643 }), [0.2463, 0.2463, 0.0]),
    createSite(createSpecies("Li", { occu: 0.643 }), [0.7463, 0.25370, 0.5]),
    createSite(createSpecies("Li", { occu: 0.643 }), [0.25370, 0.7463, 0.5]),
    createSite(createSpecies("Li", { occu: 0.643 }), [0.7463, 0.7463, 0.5]),
    createSite(createSpecies("Li", { occu: 0.643 }), [0.25370, 0.25370, 0.5]),
    createSite(createSpecies("Li", { occu: 0.643 }), [0.7537, 0.2463, 0.0]),
    createSite(createSpecies("Li", { occu: 0.643 }), [0.2463, 0.7537, 0.0]),
    createSite(createSpecies("Ge", { occu: 0.515 }), [0.0, 0.5, 0.3093]),
    createSite(createSpecies("P", { occu: 0.485 }), [0.0, 0.5, 0.3093]),
    createSite(createSpecies("Ge", { occu: 0.515 }), [0.0, 0.5, 0.8092999999999999]),
    createSite(createSpecies("P", { occu: 0.485 }), [0.0, 0.5, 0.8092999999999999]),
    createSite(createSpecies("Ge", { occu: 0.515 }), [0.5, 0.0, 0.19069999999999998]),
    createSite(createSpecies("P", { occu: 0.485 }), [0.5, 0.0, 0.19069999999999998]),
    createSite(createSpecies("Ge", { occu: 0.515 }), [0.5, 0.0, 0.6906999999999999]),
    createSite(createSpecies("P", { occu: 0.485 }), [0.5, 0.0, 0.6906999999999999]),
    createSite(createSpecies("P", { occu: 1.0 }), [0.0, 0.0, 0.5]),
    createSite(createSpecies("P", { occu: 1.0 }), [0.5, 0.5, 0.0]),
    createSite(createSpecies("S", { occu: 1.0 }), [1.0, 0.8157, 0.5897]),
    createSite(createSpecies("S", { occu: 1.0 }), [0.0, 0.18430000000000002, 0.58970]),
    createSite(createSpecies("S", { occu: 1.0 }), [0.6843, 0.5, 0.0897]),
    createSite(createSpecies("S", { occu: 1.0 }), [0.3157, 0.5, 0.0897]),
    createSite(createSpecies("S", { occu: 1.0 }), [0.5, 0.3157, 0.9103]),
    createSite(createSpecies("S", { occu: 1.0 }), [0.5, 0.6843, 0.9103]),
    createSite(createSpecies("S", { occu: 1.0 }), [0.8157, 0.0, 0.4103]),
    createSite(createSpecies("S", { occu: 1.0 }), [0.18430000000000002, 0.0, 0.4103]),
    createSite(createSpecies("S", { occu: 1.0 }), [1.0, 0.70090, 0.905]),
    createSite(createSpecies("S", { occu: 1.0 }), [0.0, 0.2990999999999999, 0.905]),
    createSite(createSpecies("S", { occu: 1.0 }), [0.7990999999999999, 0.5, 0.405]),
    createSite(createSpecies("S", { occu: 1.0 }), [0.20090, 0.5, 0.405]),
    createSite(createSpecies("S", { occu: 1.0 }), [0.5, 0.20090, 0.595]),
    createSite(createSpecies("S", { occu: 1.0 }), [0.5, 0.7990999999999999, 0.595]),
    createSite(createSpecies("S", { occu: 1.0 }), [0.70090, 0.0, 0.09499999999999997]),
    createSite(createSpecies("S", { occu: 1.0 }), [0.2990999999999999, 0.0, 0.09499999999999997]),
    createSite(createSpecies("S", { occu: 1.0 }), [0.0, 0.3010, 0.2086]),
    createSite(createSpecies("S", { occu: 1.0 }), [1.0, 0.699, 0.2086]),
    createSite(createSpecies("S", { occu: 1.0 }), [0.19899999999999995, 0.5, 0.70860]),
    createSite(createSpecies("S", { occu: 1.0 }), [0.8010000000000002, 0.5, 0.70860]),
    createSite(createSpecies("S", { occu: 1.0 }), [0.5, 0.8010000000000002, 0.2914]),
    createSite(createSpecies("S", { occu: 1.0 }), [0.5, 0.19899999999999995, 0.2914]),
    createSite(createSpecies("S", { occu: 1.0 }), [0.3010, 0.0, 0.7914]),
    createSite(createSpecies("S", { occu: 1.0 }), [0.699, 0.0, 0.7914]),
  ],
};

export const Graphite: Structure = {
  lattice: createLattice([-1.235, -2.139082747347564, 0, -1.235, 2.139082747347564, 0, 0, 0, -6.8]),
  sites: [
    createSite(createSpecies("C"), [0.6667, 0.33330, 0.75]),
    createSite(createSpecies("C"), [0.33329999999999993, 0.66670, 0.25]),
    createSite(createSpecies("C"), [0.0, 0.0, 0.75]),
    createSite(createSpecies("C"), [0.0, 0.0, 0.25]),
  ],
};

export const TetragonalSiRuPr: Structure = {
  lattice: createLattice([4.192, 0, 0, 0, 4.192, 0, 0.0, 0.0, 6.88]),
  sites: [
    createSite(createSpecies("Si"), [0.25, 0.25, 0.173]),
    createSite(createSpecies("Si"), [0.75, 0.75, 0.827]),
    createSite(createSpecies("Ru"), [0.75, 0.25, 0.0]),
    createSite(createSpecies("Ru"), [0.25, 0.75, 0.0]),
    createSite(createSpecies("Pr"), [0.25, 0.25, 0.676]),
    createSite(createSpecies("Pr"), [0.75, 0.75, 0.324]),
  ],
};

export const TungstenBCC: Structure = {
  lattice: createLattice([3.1653, 0.0, 0.0, 0.0, 3.1653, 0.0, 0.0, 0.0, 3.1653]),
  sites: [
    createSite(createSpecies("W"), [0.0, 0.0, 0.0]),
    createSite(createSpecies("W"), [0.5, 0.5, 0.5]),
  ],
};
