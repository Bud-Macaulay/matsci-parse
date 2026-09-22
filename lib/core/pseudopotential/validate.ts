/**
 * Validation for first-class pseudopotential objects.
 *
 * `validate()` returns a list of human-readable issues (empty = valid).
 * Structural mismatches (wrong array lengths, out-of-range D_ij indices) are
 * the main target; physical sanity (signs, cutoffs) is reported as warnings
 * with a "warn:" prefix.
 */

import type { Pseudopotential } from "./pseudopotential";

/** Validate a pseudopotential object, returning a list of issue strings. */
export function validate(pp: Pseudopotential): string[] {
  const issues: string[] = [];
  const n = pp.mesh.r.length;

  if (n === 0) issues.push("mesh.r is empty");
  if (pp.mesh.rab.length !== n) {
    issues.push(
      `mesh.rab length ${pp.mesh.rab.length} != mesh.r length ${n}`,
    );
  }
  if (pp.header.meshSize !== n) {
    issues.push(
      `header.meshSize ${pp.header.meshSize} != mesh.r length ${n}`,
    );
  }
  if (pp.local.vloc.length !== n) {
    issues.push(`local.vloc length ${pp.local.vloc.length} != mesh size ${n}`);
  }
  if (pp.rhoatom.length !== 0 && pp.rhoatom.length !== n) {
    issues.push(`rhoatom length ${pp.rhoatom.length} != mesh size ${n}`);
  }
  if (pp.nlcc && pp.nlcc.length !== n) {
    issues.push(`nlcc length ${pp.nlcc.length} != mesh size ${n}`);
  }

  const nBetas = pp.nonlocal.betas.length;
  if (pp.header.numberOfProj !== 0 && pp.header.numberOfProj !== nBetas) {
    issues.push(
      `header.numberOfProj ${pp.header.numberOfProj} != betas length ${nBetas}`,
    );
  }
  pp.nonlocal.betas.forEach((beta, i) => {
    if (beta.beta.length !== n) {
      issues.push(
        `beta[${i}] (l=${beta.angularMomentum}) length ${beta.beta.length} != mesh size ${n}`,
      );
    }
  });
  for (const [nb, mb, val] of pp.nonlocal.dij) {
    if (!Number.isInteger(nb) || nb < 1 || nb > nBetas) {
      issues.push(`dij entry [${nb}, ${mb}] has out-of-range nb=${nb}`);
    }
    if (!Number.isInteger(mb) || mb < 1 || mb > nBetas) {
      issues.push(`dij entry [${nb}, ${mb}] has out-of-range mb=${mb}`);
    }
    if (Number.isNaN(val)) issues.push(`dij entry [${nb}, ${mb}] is NaN`);
  }

  if (pp.header.numberOfWfc !== 0 && pp.header.numberOfWfc !== pp.pswfc.length) {
    issues.push(
      `header.numberOfWfc ${pp.header.numberOfWfc} != pswfc length ${pp.pswfc.length}`,
    );
  }
  pp.pswfc.forEach((wfc, i) => {
    if (wfc.chi.length !== n) {
      issues.push(`pswfc[${i}] chi length ${wfc.chi.length} != mesh size ${n}`);
    }
  });
  if (pp.semilocal) {
    pp.semilocal.forEach((sl, i) => {
      if (sl.vnl.length !== n) {
        issues.push(
          `semilocal[${i}] (l=${sl.l}) length ${sl.vnl.length} != mesh size ${n}`,
        );
      }
    });
  }
  if (pp.fullWfc) {
    pp.fullWfc.forEach((wfc, i) => {
      if (wfc.aewfc.length !== n) {
        issues.push(
          `fullWfc[${i}] aewfc length ${wfc.aewfc.length} != mesh size ${n}`,
        );
      }
    });
  }

  const aug = pp.nonlocal.augmentation;
  if (aug) {
    if (aug.q && aug.q.length === 0) issues.push("augmentation.q is empty");
    if (aug.qijl) {
      aug.qijl.forEach((q, i) => {
        if (q.qijl.length !== n) {
          issues.push(
            `augmentation.qijl[${i}] (i=${q.i},j=${q.j},l=${q.l}) length ${q.qijl.length} != mesh size ${n}`,
          );
        }
        if (q.i < 1 || q.i > nBetas || q.j < 1 || q.j > nBetas) {
          issues.push(
            `augmentation.qijl[${i}] references out-of-range projectors (i=${q.i},j=${q.j})`,
          );
        }
      });
    }
  }

  if (pp.paw) {
    if (pp.paw.aeVloc.length !== 0 && pp.paw.aeVloc.length !== n) {
      issues.push(`paw.aeVloc length ${pp.paw.aeVloc.length} != mesh size ${n}`);
    }
    if (pp.paw.aeNlcc.length !== 0 && pp.paw.aeNlcc.length !== n) {
      issues.push(`paw.aeNlcc length ${pp.paw.aeNlcc.length} != mesh size ${n}`);
    }
  }

  if (pp.units.energy !== "Ry" || pp.units.length !== "Bohr") {
    issues.push(
      `warn: non-canonical units energy=${pp.units.energy} length=${pp.units.length}`,
    );
  }
  if (pp.header.isPaw && !pp.paw) {
    issues.push("warn: header.isPaw is set but paw data is missing");
  }
  if (pp.header.hasSo && !pp.spinOrbit) {
    issues.push("warn: header.hasSo is set but spinOrbit data is missing");
  }

  return issues;
}
