"""Minimal matsci-api client using only the Python standard library.

Run the server first (from the repo root)::

    pnpm build
    pnpm --filter matsci-api start

Then::

    python api/examples/call_api.py
    BASE_URL=http://example:3000 python api/examples/call_api.py
"""

import json
import os
import urllib.request

BASE_URL = os.environ.get("BASE_URL", "http://127.0.0.1:3000")


def call(fn: str, *args):
    """Call POST /api/<fn> with positional JSON args, return the result."""
    return call_in(None, fn, *args)


def call_in(group, fn: str, *args):
    """Call POST /api/<group>/<fn> (or /api/<fn> when group is None)."""
    path = f"/api/{group}/{fn}" if group else f"/api/{fn}"
    payload = json.dumps({"args": list(args)}).encode()
    req = urllib.request.Request(
        f"{BASE_URL}{path}", data=payload, headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as res:
        body = json.load(res)
    if "error" in body:
        raise RuntimeError(f"{fn} failed: {body['error']}")
    return body["result"]


def batch(*calls):
    """Call POST /api/batch; ``calls`` are (fn, *args) tuples."""
    payload = json.dumps(
        {"calls": [{"fn": fn, "args": list(args)} for fn, *args in calls]}
    ).encode()
    req = urllib.request.Request(
        f"{BASE_URL}/api/batch", data=payload, headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as res:
        return json.load(res)["results"]


def main() -> None:
    with urllib.request.urlopen(f"{BASE_URL}/api") as res:
        listing = json.load(res)
    fns = listing["functions"]
    print(f"exposed functions: {len(fns)} (e.g. {fns[:5]})")
    has = set(fns).__contains__

    if has("gcd"):
        # Multi-arg sync function.
        print("gcd(48, 18) =", call("gcd", 48, 18))

    if has("parseFormula"):
        # TS objects come back as plain JSON.
        print("parseFormula('H2O') =", call("parseFormula", "H2O"))

    if has("gcd") and has("lcm"):
        # One HTTP round trip for many calls; each item has its own ok/error.
        print(
            "batch =",
            batch(("gcd", 48, 18), ("lcm", 4, 6), ("nope",), ("parseFormula", "NaCl")),
        )

    # IO works on plain strings: parse a POSCAR, analyse the structure,
    # serialise back out. Structures are plain JSON between calls; the
    # server holds no session state.
    poscar = """NaCl
1.0
3.0 0.0 0.0
0.0 3.0 0.0
0.0 0.0 3.0
Na Cl
1 1
Cartesian
0.0 0.0 0.0
1.5 1.5 1.5
"""
    structure = call_in("io", "fromPOSCAR", poscar)
    print("sites:", len(structure["sites"]))
    print("hillFormula:", call_in("structure", "hillFormula", structure))
    print("toCIF head:", call_in("io", "toCIF", structure).splitlines()[0])


if __name__ == "__main__":
    main()
