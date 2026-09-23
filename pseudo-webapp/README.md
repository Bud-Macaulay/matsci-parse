# pseudo-webapp

Small pseudopotential interconverter web app, built on `matsci-parse`.

## Run

Self-contained Vite app (same pattern as `webapp/`):

```sh
cd pseudo-webapp
npm install
npm run dev      # dev server on :5174
npm run build    # static build into pseudo-webapp/dist/
npm run preview  # serve the build
```

Typecheck from the repo root (uses the root TypeScript):

```sh
pnpm pseudo:typecheck
```

## Use

1. Drop pseudopotential files — or a `.zip` of them — onto the page, or pick
   them with the file input. Each file's format is auto-detected; click an
   entry to see its summary (element, type, valence, mesh, projectors,
   validation).
2. Pick a target format. Lossy conversions are flagged with reasons from
   `canSerialize` before you convert.
3. Convert all, preview the selected file, download everything as
   `pseudos-<target>.zip`.

Notes:

- In-memory units are Rydberg / Bohr (UPF-native). Hartree-based formats
  convert on parse and back on serialize.
- GTH input converts its first entry only (`parseGTHFile` handles multi-entry
  files programmatically).
- The app imports `lib/` source directly (same pattern as `webapp/`), so no
  `matsci-parse` build step is needed.
