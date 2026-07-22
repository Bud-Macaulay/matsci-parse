/**
 * Minimal PSML test fixtures.
 *
 * Hand-crafted minimal PSML files for unit testing the parser and serializer.
 * Based on the PSML 1.2 schema.
 */

/** Minimal Helium NC PSML (5 mesh points, single projector). */
export const heNcPsml = `<?xml version="1.0" encoding="UTF-8"?>
<psml version="1.2" energy_unit="hartree" length_unit="bohr" uuid="test-he-nc">
  <provenance creator="test-generator" date="2024-01-15">
    <annotation type="generated-by" value="matsci-parse test" />
  </provenance>
  <pseudo-atom-spec atomic-label="He" atomic-number="2" z-pseudo="2.0" relativity="scalar" core-corrections="no">
    <exchange-correlation>
      <libxc-info number-of-functionals="1">
        <functional name="XC_GGA_X_PBE" />
      </libxc-info>
    </exchange-correlation>
  </pseudo-atom-spec>
  <grid npts="5">
    <grid-data>0.01  0.05  0.10  0.20  0.50</grid-data>
  </grid>
  <local-potential>
    <radfunc>
      <data npts="5">
 -3.500000000000000E+000 -1.200000000000000E+000 -7.000000000000000E-001 -3.800000000000000E-001 -1.600000000000000E-001
      </data>
    </radfunc>
  </local-potential>
  <semilocal-potentials set="scalar_relativistic">
    <slps l="s" n="1" rc="0">
      <radfunc>
        <data npts="5">
 -2.800000000000000E+000 -9.600000000000000E-001 -5.600000000000000E-001 -3.040000000000000E-001 -1.280000000000000E-001
        </data>
      </radfunc>
    </slps>
  </semilocal-potentials>
  <nonlocal-projectors set="scalar_relativistic">
    <proj l="s" seq="1" ekb="1.500000000000000E+000" type="kb">
      <radfunc>
        <data npts="5">
 1.000000000000000E+000 2.500000000000000E+000 3.000000000000000E+000 2.000000000000000E+000 5.000000000000000E-001
        </data>
      </radfunc>
    </proj>
  </nonlocal-projectors>
  <pseudo-wave-functions set="pseudo">
    <pswf l="s" n="1">
      <radfunc>
        <data npts="5">
 2.000000000000000E+000 4.000000000000000E+000 4.500000000000000E+000 3.000000000000000E+000 1.000000000000000E+000
        </data>
      </radfunc>
    </pswf>
  </pseudo-wave-functions>
  <valence-charge total-charge="2.0">
    <radfunc>
      <data npts="5">
 5.000000000000000E-001 3.000000000000000E+000 4.000000000000000E+000 2.500000000000000E+000 8.000000000000000E-001
      </data>
    </radfunc>
  </valence-charge>
</psml>
`;

/** Minimal Carbon NC PSML with NLCC (5 mesh points, two projectors). */
export const cNlccPsml = `<?xml version="1.0" encoding="UTF-8"?>
<psml version="1.2" energy_unit="hartree" length_unit="bohr" uuid="test-c-nlcc">
  <pseudo-atom-spec atomic-label="C" atomic-number="6" z-pseudo="4.0" relativity="scalar" core-corrections="yes">
    <exchange-correlation>
      <libxc-info number-of-functionals="2">
        <functional name="XC_GGA_X_PBE" />
        <functional name="XC_GGA_C_PBE" />
      </libxc-info>
    </exchange-correlation>
  </pseudo-atom-spec>
  <grid npts="5">
    <grid-data>0.01  0.05  0.15  0.40  1.00</grid-data>
  </grid>
  <local-potential>
    <radfunc>
      <data npts="5">
 -1.200000000000000E+001 -4.500000000000000E+000 -2.000000000000000E+000 -9.000000000000000E-001 -3.600000000000000E-001
      </data>
    </radfunc>
  </local-potential>
  <semilocal-potentials set="scalar_relativistic">
    <slps l="s" n="1" rc="0">
      <radfunc>
        <data npts="5">
 -1.000000000000000E+001 -3.800000000000000E+000 -1.700000000000000E+000 -7.600000000000000E-001 -3.000000000000000E-001
        </data>
      </radfunc>
    </slps>
    <slps l="p" n="2" rc="0">
      <radfunc>
        <data npts="5">
 -5.000000000000000E+000 -2.000000000000000E+000 -1.000000000000000E+000 -4.500000000000000E-001 -1.800000000000000E-001
        </data>
      </radfunc>
    </slps>
  </semilocal-potentials>
  <nonlocal-projectors set="scalar_relativistic">
    <proj l="s" seq="1" ekb="2.100000000000000E+000" type="kb">
      <radfunc>
        <data npts="5">
 1.500000000000000E+000 3.200000000000000E+000 3.500000000000000E+000 2.200000000000000E+000 6.000000000000000E-001
        </data>
      </radfunc>
    </proj>
    <proj l="p" seq="2" ekb="1.800000000000000E+000" type="kb">
      <radfunc>
        <data npts="5">
 0.000000000000000E+000 1.800000000000000E+000 3.000000000000000E+000 2.400000000000000E+000 8.000000000000000E-001
        </data>
      </radfunc>
    </proj>
  </nonlocal-projectors>
  <pseudo-wave-functions set="pseudo">
    <pswf l="s" n="1">
      <radfunc>
        <data npts="5">
 3.000000000000000E+000 5.000000000000000E+000 5.500000000000000E+000 3.500000000000000E+000 1.200000000000000E+000
        </data>
      </radfunc>
    </pswf>
    <pswf l="p" n="2">
      <radfunc>
        <data npts="5">
 0.000000000000000E+000 2.000000000000000E+000 3.500000000000000E+000 2.800000000000000E+000 9.000000000000000E-001
        </data>
      </radfunc>
    </pswf>
  </pseudo-wave-functions>
  <valence-charge total-charge="4.0">
    <radfunc>
      <data npts="5">
 1.000000000000000E+000 5.000000000000000E+000 6.000000000000000E+000 3.500000000000000E+000 1.000000000000000E+000
      </data>
    </radfunc>
  </valence-charge>
  <pseudocore-charge>
    <radfunc>
      <data npts="5">
 2.000000000000000E-001 1.500000000000000E+000 2.000000000000000E+000 1.000000000000000E+000 3.000000000000000E-001
      </data>
    </radfunc>
  </pseudocore-charge>
</psml>
`;
