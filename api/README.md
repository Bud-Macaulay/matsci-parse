# matsci-parse API

A REST API generated from the library. Every function exported from
`lib/main.ts` whose doc comment has an `@api` tag becomes
`POST /<module>/<function>`, with a JSON body keyed by parameter name.
Request validation, the OpenAPI spec (`/openapi.json`) and the docs page
(`/docs`) all come from the library's own TypeScript types and doc comments,
so clients in any language can be generated from the spec.

## Expose a library function

Add `@api` to its doc comment and regenerate:

```ts
/**
 * Compute the X-ray powder diffraction pattern of a crystal structure.
 * @param structure - Crystal structure.
 * @param options - Wavelength, range, scaling.
 * @api
 */
export function calculateXrdPattern(structure, options?) { ... }
```

```sh
pnpm --filter matsci-api generate     # rewrites api/src/generated.ts
```

That's all: the route, its schemas and docs, and the generated clients
follow. Commit `src/generated.ts`. Its diff shows exactly how the API
changed. CI (and the API tests) fail if it is out of date with the library.

Parameter and return types must be JSON-representable: numbers, strings,
booleans, arrays, tuples, unions, option objects, and the library types
below. The generator stops with the function's name if a tagged function
takes a callback, a destructured parameter, or has overloads.

## Run

```sh
pnpm install
pnpm --filter matsci-api start        # http://localhost:3000, docs at /docs
PORT=8080 pnpm --filter matsci-api start
```

With Docker (from the repo root):

```sh
docker build -f api/Dockerfile -t matsci-api .
docker run -p 3000:3000 matsci-api
```

`PORT` is the only setting.

## Wire format

Library types travel as plain JSON:

| Library type          | JSON                                                             |
| --------------------- | ---------------------------------------------------------------- |
| `Structure`           | `{"lattice": [[a], [b], [c]], "sites": [{"species", "frac"}]}`   |
| `DisorderedStructure` | `{"disordered": true, "lattice", "sites": [{"occupancy", "frac"}]}` |
| `Lattice`             | `[[a], [b], [c]]` (rows, angstrom)                              |
| `Matrix`              | list of rows                                                     |
| `Float64Array`        | list of numbers                                                  |

```sh
curl -X POST localhost:3000/io/fromPOSCAR -H 'content-type: application/json' \
     -d "{\"text\": $(jq -Rs . < POSCAR)}"
```

Errors are `{"error": "..."}`: `400` when the body doesn't match the
schema, `422` when the library rejects the input, `500` for a server bug.

## Python

Generate a typed client from the spec (needs [uv](https://docs.astral.sh/uv/)):

```sh
pnpm --filter matsci-api client:python   # -> api/clients/python
pip install ./api/clients/python
```

```python
from matsci_parse_api_client import Client
from matsci_parse_api_client.api.io import from_cif
from matsci_parse_api_client.api.structure import get_symmetry
from matsci_parse_api_client.models import FromCifBody, GetSymmetryBody

client = Client(base_url="http://localhost:3000")
s = from_cif.sync(client=client, body=FromCifBody(text=open("x.cif").read()))
print(get_symmetry.sync(client=client, body=GetSymmetryBody(structure=s)).calculation_results.hm_symbol)
```

CI (`.github/workflows/api.yml`) checks the generated API is in sync,
typechecks and tests it, then publishes `openapi.json` and the Python client
as a build artifact.
