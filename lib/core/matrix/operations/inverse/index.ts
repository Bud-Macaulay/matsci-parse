/**
 * Matrix inversion methods.
 *
 * This module provides several approaches to matrix inversion:
 * - **Specialized methods**: `inverse2x2`, `inverse3x3`, `inverse4x4` - Fast analytical solutions for small matrices
 * - **General methods**: `luInverse` - LU decomposition for arbitrary matrices
 * - **Alternative method**: `gjInverse` - Gauss-Jordan elimination approach
 *
 * Choose specialized methods for known matrix sizes (faster).
 * Use LU inversion for general-purpose work.
 *
 * @remarks
 * All functions throw an error if the matrix is singular (determinant = 0).
 * For numerical stability, use LU or Gauss-Jordan with partial pivoting.
 */
export * from "./gaussJordan";
export * from "./inverse2x2";
export * from "./inverse3x3";
export * from "./inverse4x4";
export * from "./luInverse";
