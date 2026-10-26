# Matrix library audit

`lib/core/matrix` compared with gl-matrix, three.js, mathjs, ml-matrix, numpy-ts and numeric on speed, accuracy, bundle size and how easy each would be to migrate to.

**Setup:** matsci-parse `ad06a06` · gl-matrix 3.4.4 · three 0.186.1 · mathjs 15.2.0 · ml-matrix 6.15.1 · numpy-ts 1.7.0 · numeric 1.2.6 · Node v24.16.0 · Intel i9-10940X · 2026-10-23.

**Method:**
- 15 operations at 5 sizes (3×3, 4×4, 16×16, 100×100, 500×500).
- Inputs are converted to each library's own type before timing, so only the operation itself is timed. Times are tinybench means in µs (lower is better); the fastest in each row is in bold.
- Every result was checked against matsci-parse's. All 348 results agree to within 1e-8 relative.
- Each size runs in a separate Node process, because running sizes one after another in the same process distorted the later results.
- numpy-ts results are `dispose()`d after every call: its best case. Without that, its WASM heap fills up and it falls back to slow JS arrays (see [Reasons not to migrate](#reasons-not-to-migrate)).
- 500×500 uses only 3 samples per case (mathjs takes seconds per call), so treat those numbers as rough.
- gl-matrix is set to Float64 and writes into a preallocated output, so it never allocates a result. Everything else, including three.js (`clone()` / `new Matrix3()`), allocates one.
- gl-matrix and three.js only support 2×2–4×4, so they appear only in the small-size tables.

## Speed (µs per call)

| 3×3 | matsci-parse | gl-matrix | three | mathjs | ml-matrix | numpy-ts | numeric |
|---|---:|---:|---:|---:|---:|---:|---:|
| mul | 0.88 | **0.075** | 0.12 | 4.46 | 0.32 | 3.64 | 0.34 |
| transpose | 0.54 | **0.060** | 0.096 | 0.34 | 0.23 | 3.77 | 0.29 |
| add | 0.60 | **0.078** | — | 0.83 | 0.87 | 1.79 | 0.43 |
| scale | 0.58 | **0.063** | 0.11 | 1.81 | 0.67 | 1.54 | 0.36 |
| hadamard | 0.57 | — | — | 1.15 | 0.99 | 1.95 | **0.43** |
| matVec | 0.14 | **0.066** | 0.070 | 2.98 | 0.31 | 2.96 | 0.21 |
| outerProduct | **0.60** | — | — | — | — | 2.33 | — |
| trace | **0.063** | — | — | 0.12 | 0.065 | 0.24 | — |
| frobeniusNorm | **0.073** | 0.075 | — | 1.49 | 0.18 | 0.39 | — |
| determinant | **0.068** | 0.070 | 0.094 | 1.78 | 0.69 | 1.30 | 0.42 |
| inverse | 0.56 | **0.069** | 0.095 | 5.21 | 1.51 | 2.03 | 0.80 |
| solve | 0.70 | — | — | 5.21 | 1.13 | 2.34 | **0.62** |
| cholesky | 0.55 | — | — | — | **0.34** | 1.17 | — |
| pow (A⁵) | **2.37** | — | — | 40.6 | — | 4.44 | — |
| rank | **0.55** | — | — | — | 2.86 | 10.2 | — |

| 4×4 | matsci-parse | gl-matrix | three | mathjs | ml-matrix | numpy-ts | numeric |
|---|---:|---:|---:|---:|---:|---:|---:|
| mul | 1.01 | **0.11** | 0.11 | 5.69 | 0.79 | 2.52 | 0.48 |
| transpose | 0.57 | **0.061** | 0.088 | 0.42 | 0.28 | 3.56 | 0.37 |
| add | 0.72 | **0.079** | — | 1.47 | 1.39 | 2.37 | 0.77 |
| scale | 0.61 | **0.066** | 0.089 | 2.69 | 1.41 | 1.81 | 0.47 |
| hadamard | **0.68** | — | — | 1.70 | 1.66 | 2.12 | 0.86 |
| matVec | 0.11 | 0.073 | **0.071** | 5.56 | 0.55 | 2.52 | 0.22 |
| outerProduct | **0.55** | — | — | — | — | 2.09 | — |
| trace | **0.061** | — | — | 0.12 | 0.089 | 0.24 | — |
| frobeniusNorm | **0.076** | 0.11 | — | 1.49 | 0.22 | 0.52 | — |
| determinant | 0.81 | **0.072** | 0.081 | 4.50 | 1.70 | 1.65 | 0.70 |
| inverse | 0.61 | **0.11** | 0.13 | 8.50 | 2.11 | 2.09 | 1.09 |
| solve | 0.81 | — | — | 7.88 | 1.64 | 2.14 | **0.78** |
| cholesky | 0.65 | — | — | — | **0.53** | 0.98 | — |
| pow (A⁵) | **3.96** | — | — | 56.5 | — | 8.27 | — |
| rank | **0.75** | — | — | — | 6.88 | 2.60 | — |

| 16×16 | matsci-parse | mathjs | ml-matrix | numpy-ts | numeric |
|---|---:|---:|---:|---:|---:|
| mul | 11.7 | 19.8 | 13.5 | **3.84** | 7.91 |
| transpose | 2.06 | 2.30 | 5.67 | 12.6 | **1.74** |
| add | **1.81** | 4.91 | 21.1 | 2.42 | 2.73 |
| scale | 2.56 | 11.9 | 20.9 | **2.33** | 2.56 |
| hadamard | 2.46 | 17.1 | 24.2 | 6.17 | **1.99** |
| matVec | **1.01** | 7.77 | 2.15 | 2.89 | 1.26 |
| outerProduct | **1.85** | — | — | 3.00 | — |
| trace | 0.090 | 0.29 | **0.081** | 0.30 | — |
| frobeniusNorm | **0.37** | 13.8 | 3.71 | 0.64 | — |
| determinant | 3.66 | 119 | 23.8 | **2.51** | 3.82 |
| inverse | 11.5 | 287 | 46.2 | **5.75** | 11.6 |
| solve | **4.14** | 139 | 23.3 | 4.35 | 4.81 |
| cholesky | 3.42 | — | 6.84 | **2.62** | — |
| pow (A⁵) | 47.2 | 690 | — | **9.26** | — |
| rank | **4.90** | — | 186 | 31.5 | — |

| 100×100 | matsci-parse | mathjs | ml-matrix | numpy-ts | numeric |
|---|---:|---:|---:|---:|---:|
| mul | 2,338 | 4,783 | 2,043 | **201** | 968 |
| transpose | 69.7 | 105 | 111 | 126 | **61.0** |
| add | 48.1 | 457 | 539 | **9.15** | 33.1 |
| scale | 33.8 | 301 | 392 | **3.69** | 29.8 |
| hadamard | 34.6 | 406 | 436 | **5.08** | 30.9 |
| matVec | 11.9 | 71.5 | 15.1 | **6.50** | 16.0 |
| outerProduct | 44.0 | — | — | **4.70** | — |
| trace | **0.16** | 1.40 | 0.21 | 0.35 | — |
| frobeniusNorm | 49.7 | 528 | 102 | **6.14** | — |
| determinant | 594 | 23,104 | 1,007 | **138** | 458 |
| inverse | 2,424 | 43,422 | 2,435 | **454** | 1,930 |
| solve | 552 | 7,827 | 819 | **175** | 455 |
| cholesky | 291 | — | 503 | **83.7** | — |
| pow (A⁵) | 6,360 | 31,800 | — | **555** | — |
| rank | **523** | — | 10,088 | 1,744 | — |

| 500×500 | matsci-parse | mathjs | ml-matrix | numpy-ts | numeric |
|---|---:|---:|---:|---:|---:|
| mul | 204,895 | 556,493 | 133,792 | **18,355** | 113,113 |
| transpose | **1,384** | 8,168 | 2,096 | 2,752 | 2,237 |
| add | 698 | 8,951 | 9,213 | **448** | 1,408 |
| scale | 687 | 8,595 | 14,952 | **276** | 942 |
| hadamard | **480** | 15,939 | 19,789 | 532 | 1,478 |
| matVec | 1,304 | 6,627 | 1,445 | **387** | 622 |
| outerProduct | 634 | — | — | **195** | — |
| trace | 42.5 | 32.4 | **22.2** | 31.7 | — |
| frobeniusNorm | 503 | 16,207 | 5,612 | **244** | — |
| determinant | 69,746 | 2,990,920 | 54,704 | **16,034** | 43,736 |
| inverse | 301,726 | 5,993,559 | 237,210 | **55,874** | 212,617 |
| solve | 90,724 | 891,729 | 86,353 | **23,794** | 41,138 |
| cholesky | 32,347 | — | 23,513 | **11,159** | — |
| pow (A⁵) | 726,646 | 4,349,075 | — | **101,746** | — |
| rank | **81,646** | — | 1,032,781 | 173,190 | — |

How each operation was called:
- **transpose:** numpy-ts is timed as `ascontiguousarray(A.T)`, which copies the data. A plain `A.T` is a zero-copy view, so timing that wouldn't be a like-for-like comparison.
- **rank:** matsci-parse uses elimination, while ml-matrix (`new SVD(A).rank`) and numpy-ts (`matrix_rank`) use an SVD. SVD is slower but more reliable for nearly singular matrices, so the rank row compares different algorithms.
- **inverse:** matsci-parse is `inverseSmall`: closed form up to 4×4, Gauss–Jordan above that.
- **Not supported:**
  - mathjs: Cholesky, rank, outerProduct.
  - ml-matrix: pow, outerProduct.
  - numeric: trace, Cholesky, pow, rank, outerProduct, and a usable Frobenius norm (see below).
  - gl-matrix and three.js: no general n×n operations.

## Plots

Time per call for each matrix size, one chart per operation. The time axis is logarithmic; the five sizes are evenly spaced, and within each size the libraries are drawn side by side in legend order. Lower is faster.

### mul

![mul: time per call vs matrix size](matrix-results/mul.svg)

### transpose

![transpose: time per call vs matrix size](matrix-results/transpose.svg)

### add

![add: time per call vs matrix size](matrix-results/add.svg)

### scale

![scale: time per call vs matrix size](matrix-results/scale.svg)

### hadamard

![hadamard: time per call vs matrix size](matrix-results/hadamard.svg)

### matVec

![matVec: time per call vs matrix size](matrix-results/matvec.svg)

### outerProduct

![outerProduct: time per call vs matrix size](matrix-results/outerproduct.svg)

### trace

![trace: time per call vs matrix size](matrix-results/trace.svg)

### frobeniusNorm

![frobeniusNorm: time per call vs matrix size](matrix-results/frobeniusnorm.svg)

### determinant

![determinant: time per call vs matrix size](matrix-results/determinant.svg)

### inverse

![inverse: time per call vs matrix size](matrix-results/inverse.svg)

### solve

![solve: time per call vs matrix size](matrix-results/solve.svg)

### cholesky

![cholesky: time per call vs matrix size](matrix-results/cholesky.svg)

### pow (A⁵)

![pow (A⁵): time per call vs matrix size](matrix-results/pow.svg)

### rank

![rank: time per call vs matrix size](matrix-results/rank.svg)

## Accuracy

Inverse residual max |A·X − I| on well-conditioned matrices (I + R/n, R uniform in [−0.5, 0.5]):

| | matsci-parse | gl-matrix | three | mathjs | ml-matrix | numpy-ts | numeric |
|---|---:|---:|---:|---:|---:|---:|---:|
| 3×3 | 1.1e-16 | 1.1e-16 | 1.1e-16 | 2.8e-17 | 1.1e-16 | 1.1e-16 | 2.8e-17 |
| 4×4 | 2.2e-16 | 2.2e-16 | 2.2e-16 | 2.2e-16 | 2.2e-16 | 2.8e-17 | 2.2e-16 |
| 16×16 | 4.4e-16 | — | — | 4.4e-16 | 6.7e-16 | 4.4e-16 | 4.4e-16 |
| 100×100 | 2.0e-15 | — | — | 2.0e-15 | 1.6e-15 | 2.2e-15 | 2.0e-15 |
| 500×500 | 4.1e-15 | — | — | 4.1e-15 | 5.3e-15 | 5.6e-15 | 4.1e-15 |

All libraries are accurate to within rounding, and every other operation agrees with matsci-parse to within 1e-8 relative. The one exception is numeric's `norm2`: on a matrix it silently returns a wrong value (226.9 where the Frobenius norm is 17.4), so it only works on vectors and is left out of the benchmark.

## Bundle size and tree-shaking

Bundled with esbuild (minified, ESM, browser target). Sizes in bytes.

| Library | One function (`inverse`) | Whole library | Tree-shakes? |
|---|---:|---:|---|
| matsci-parse `lib/core/matrix` | 2.8 KB (1.2 KB gz) | 15 KB (5.3 KB gz) | Yes |
| gl-matrix (`mat4.invert`) | 17 KB (5.4 KB gz) | 54 KB (14 KB gz) | Per module only: importing `mat4` brings all of `mat4` |
| three (`Matrix4.invert`) | 248 KB (56 KB gz) | 743 KB (190 KB gz) | Poorly: `Matrix4` pulls in much of the math core |
| numeric (`numeric.inv`) | 71 KB (26 KB gz) | 71 KB (26 KB gz) | No: a single CommonJS file |
| mathjs (`inv`) | 163 KB (51 KB gz) | 753 KB (207 KB gz) | Partly: `inv` pulls in the typed-function and DenseMatrix machinery |
| ml-matrix (`inverse`) | 71 KB (18 KB gz) | 73 KB (18 KB gz) | No: any import brings the whole `Matrix` class |
| numpy-ts (`linalg.inv`, main entry) | 1.35 MB (225 KB gz) | 2.86 MB (646 KB gz) | Partly |
| numpy-ts (`numpy-ts/core`, `linalg`) | 268 KB (85 KB gz) | — | `numpy-ts/core` `matmul` alone is 113 KB (33 KB gz) |

gl-matrix, mathjs, ml-matrix and numpy-ts declare `"sideEffects": false`. matsci-parse's `package.json` doesn't, but esbuild still tree-shakes it fully. Adding the flag would help webpack and Rollup users.

## Reasons not to migrate

- **gl-matrix and three.js:**
  - Both only handle 2×2–4×4, with no solve, LU, Cholesky or general n×n.
  - Both store data column-major, while `Matrix.data` is row-major everywhere in this repo.
  - gl-matrix defaults to Float32 and has a global switch (`setMatrixArrayType`) to change that. Its API writes into a caller-provided `out` buffer, so every call site would have to manage buffers.
  - three.js's methods mutate the matrix they're called on (`invert()`, `transpose()`), so callers must `clone()` first.
  - three.js costs 56 KB gzipped just for `Matrix4`.
  - Both are the fastest options for 3×3 and 4×4.
- **mathjs:**
  - The slowest library at almost every size: 2–45× slower than matsci-parse for mul, determinant, inverse and solve.
  - Even one function costs about 51 KB gzipped.
  - Matrices are nested JS arrays, not `Float64Array`.
- **ml-matrix:**
  - It stores data as an array of row `Float64Array`s, so there's no single buffer to share with `Matrix.data` without copying.
  - It doesn't tree-shake (about 18 KB gzipped for any import).
  - Speed is mixed:
    - It is faster for small mul, transpose and Cholesky, and up to 1.5× faster at 500×500 for mul, determinant, inverse and Cholesky.
    - It is slower for small determinant, inverse, solve and rank, and for elementwise operations at 16×16 and above.
- **numpy-ts:**
  - Fastest from 100×100 up for most operations (WASM SIMD): about 3–12× faster than matsci-parse for mul, determinant, inverse, solve, Cholesky and pow.
  - **Manual memory management.** Arrays live on a WASM heap that JavaScript garbage collection does not free, so every result and intermediate must be `dispose()`d.
    - If they aren't, the heap fills, and numpy-ts permanently falls back to JS arrays for the rest of the process.
    - In this benchmark, a 100×100 `det` went from about 140 µs to about 580 µs, and to 1,170 µs right after the heap filled.
    - It only logs a single warning when that happens.
  - 2–20× slower per call at 3×3 and 4×4, which is where this repo mostly works (lattices, symmetry operations).
  - Large bundle.
  - Its browser build contains `import("node:fs")`, so the web apps' bundlers would need configuration.
  - It is young (v1.x).
  - Transpose and slicing return views, so data is shared between arrays, unlike this repo's copy-on-return model.
- **numeric:**
  - Unmaintained (last real release 2012).
  - Plain nested arrays.
  - A single CommonJS file that doesn't tree-shake.
  - `norm2` silently gives wrong results on matrices.
  - It is often fast (1.2–2.4× faster than matsci-parse for mul, determinant, inverse and solve from 100×100 up), but not a sound dependency.
- **`matrix`** (npm): its entry file is empty (0 bytes). Unusable; `ml-matrix` was used instead.
- **Any migration:**
  - The `Matrix { rows, cols, data }` type is used throughout `lib/core`.
  - Every caller would need adapting, or a conversion layer would need adding, and the conversion cost would eat most of the per-call savings at small sizes.

## Improvements to matsci-parse these numbers suggest

- **Small-matrix allocation:**
  - At 3×3, most matsci-parse operations take 0.5–0.9 µs, against about 0.1 µs for three.js, which also allocates a new result each call. The difference is the result type. Allocating a `Float64Array(9)` costs about 0.6 µs on its own, while three.js uses plain JS arrays.
  - matsci-parse functions that return a number skip this cost (`determinant`, `trace`, `frobeniusNorm`: 0.06–0.07 µs), and they are the fastest of all libraries there.
  - Hot loops could use `…Into(out, …)` variants, as `choleskyInto` already does.
- **4×4 determinant:** it goes through LU (0.81 µs, against 0.068 µs for the 3×3 closed form). A closed-form 4×4, like the existing `inverse4x4`, would make it about 10× faster.
- **Large n:**
  - numpy-ts's WASM kernels are about 3–12× faster from 100×100 up for mul, determinant, inverse, solve, Cholesky and pow.
  - Plain-JS numeric is 1.2–2.4× faster for mul, determinant, inverse and solve, which suggests matsci-parse's own loops have room to improve. That matters only if large dense matrices become a real workload.
