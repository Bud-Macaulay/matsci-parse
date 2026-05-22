/**
 * Site manipulation operations for crystal structures.
 *
 * Functions for adding, removing, and modifying atomic sites in a structure.
 * All operations return new structures without modifying the original.
 *
 * @remarks
 * - All operations are immutable (functional programming style)
 * - Sites are appended/inserted/removed without automatic canonicalization
 * - Use canonicalize() after modifications if needed to wrap coordinates
 */
export * from "./appendSite";
export * from "./insertSite";
export * from "./removeSite";
export * from "./replaceSite";
