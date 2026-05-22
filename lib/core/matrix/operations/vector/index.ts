/**
 * Vector operations for linear algebra and geometry.
 *
 * This module provides essential vector operations including:
 * - Basic operations: dot product, norm, normalization
 * - Geometric operations: distance, angle, projection, reflection
 * - 3D-specific: cross product
 *
 * All functions operate on `Vector` (Float64Array) types.
 *
 * @remarks
 * Most functions validate input dimensions and throw errors for invalid inputs.
 * Use these functions for physics, graphics, and numerical computations.
 */
export * from "./angleBetween";
export * from "./cross";
export * from "./distance";
export * from "./dot";
export * from "./normalize";
export * from "./norm";
export * from "./projection";
export * from "./reflect";
