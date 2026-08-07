import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { getBZPolyhedron } from "@/core/structure/operations/symmetry/brilliounzone/bzPolyhedron";

const refs: Record<
  string,
  {
    b1: number[];
    b2: number[];
    b3: number[];
    faces_data: {
      triangles_vertices: number[][];
      triangles: number[][];
      faces: number[][][];
    };
  }
> = JSON.parse(
  readFileSync(join(process.cwd(), "tests/helpers/bzPolyhedronReference.json"), "utf8"),
);

const vertexSet = (polys: number[][][]) =>
  new Set(
    polys.map((poly) =>
      JSON.stringify(
        [...poly]
          .map((v) => v.map((x) => Math.round(x * 1e6)))
          .sort((a, b) => a.join(",").localeCompare(b.join(","))),
      ),
    ),
  );

describe("getBZPolyhedron", () => {
  for (const [key, ref] of Object.entries(refs)) {
    it(`${key} matches the seekpath BZ polyhedron`, () => {
      const result = getBZPolyhedron(ref.b1, ref.b2, ref.b3);

      // Same faces (as sets of coplanar vertices)
      const myFaces = vertexSet(result.faces);
      const refFaces = vertexSet(ref.faces_data.faces);
      expect([...myFaces].sort(), `${key} faces`).toEqual(
        [...refFaces].sort(),
      );

      // Same number of triangles (fan triangulation may split a face
      // differently, but the surface area must be identical)
      expect(result.triangles.length, `${key} triangle count`).toBe(
        ref.faces_data.triangles.length,
      );

      // All triangle vertices appear in the vertices list
      for (const [i, j, k] of result.triangles) {
        expect(result.triangles_vertices[i], `${key} triangle ${i}`).toBeDefined();
        expect(result.triangles_vertices[j], `${key} triangle ${j}`).toBeDefined();
        expect(result.triangles_vertices[k], `${key} triangle ${k}`).toBeDefined();
      }

      // Every reference vertex is present in our vertex list
      const refVertKeys = new Set(
        ref.faces_data.triangles_vertices.map((v) =>
          v.map((x) => Math.round(x * 1e6)).join(","),
        ),
      );
      for (const v of result.triangles_vertices) {
        expect(
          refVertKeys.has(v.map((x) => Math.round(x * 1e6)).join(",")),
          `${key}: unexpected vertex ${v}`,
        ).toBe(true);
      }
    });
  }
});
