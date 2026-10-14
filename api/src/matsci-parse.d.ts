/**
 * The `matsci-parse` workspace package resolves to the built `dist/index.js`
 * (see the root `pnpm build`), which ships without type declarations, so the
 * import is untyped here. The boundary is deliberately narrow: the namespace
 * is cast to `LibraryModule` and only plain functions are ever invoked.
 */
declare module "matsci-parse";
