/**
 * Matrix operations module.
 *
 * Provides comprehensive linear algebra operations on Matrix objects:
 *
 * **Arithmetic**: Addition, subtraction, multiplication, scalar scaling, negation
 * **Analysis**: Determinant, trace, rank, Frobenius norm
 * **Transformations**: Transpose, element-wise (Hadamard) product
 * **Utilities**: Row/column extraction and manipulation
 * **Submodules**:
 * - `./inverse` - Matrix inversion methods
 * - `./vector` - Vector-specific operations
 * - `./reduction` - Matrix reduction and canonical forms
 *
 * @remarks
 * Most functions assume valid input types and throw meaningful errors on dimension mismatches.
 * For performance-critical code, consider the specific matrix size and structure.
 */
export * from "./add";
export * from "./col";
export * from "./determinant";
export * from "./frobeniusNorm";
export * from "./hadamard";
export * from "./mul";
export * from "./negate";
export * from "./rank";
export * from "./row";
export * from "./scale";
export * from "./sub";
export * from "./trace";
export * from "./transpose";

export * from "./inverse";
// export * from "./reduction";
export * from "./vector";
