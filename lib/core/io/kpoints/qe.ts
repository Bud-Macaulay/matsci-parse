import type { KPointsCard, Kpt } from "../pw/schema/cards";

const K_POINTS_HEADER = /^K_POINTS(?:\s+\{?\(?(\w+)\)?\}?)?/i;
const NEXT_CARD =
  /^(?:ATOMIC_SPECIES|ATOMIC_POSITIONS|CELL_PARAMETERS|K_POINTS|ADDITIONAL_K_POINTS|OCCUPATIONS|CONSTRAINTS|ATOMIC_VELOCITIES|ATOMIC_FORCES|HUBBARD|SOLVENTS)\b/i;

function stripComment(line: string): string {
  let cut = line.length;
  const bang = line.indexOf("!");
  const hash = line.indexOf("#");
  if (bang !== -1) cut = Math.min(cut, bang);
  if (hash !== -1) cut = Math.min(cut, hash);
  return line.slice(0, cut);
}

function toNumbers(line: string): number[] {
  return stripComment(line)
    .split(/\s+/)
    .filter((t) => t !== "")
    .map(Number);
}

function parseKpt(line: string): Kpt {
  const n = toNumbers(line);
  if (n.length < 4) {
    throw new Error(`Invalid K_POINTS line: ${line}`);
  }
  return { x: n[0], y: n[1], z: n[2], w: n[3] };
}

function parsePointList(rest: string[]): Kpt[] {
  const count = Number.parseInt(rest[0] ?? "", 10);
  if (Number.isNaN(count)) {
    throw new Error("K_POINTS list requires a point count");
  }
  const pointLines = rest.slice(1, 1 + count);
  if (pointLines.length !== count) {
    throw new Error(`Expected ${count} k-points, got ${pointLines.length}`);
  }
  return pointLines.map(parseKpt);
}

/** Extract the K_POINTS card block from a pw.x input. */
function extractKPointsBlock(text: string): string[] {
  const lines = text.split("\n");
  let start = -1;

  for (let i = 0; i < lines.length; i++) {
    if (K_POINTS_HEADER.test(lines[i].trim())) {
      start = i;
      break;
    }
  }

  if (start === -1) {
    throw new Error("K_POINTS card not found");
  }

  const block = [lines[start].trim()];

  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l === "" || NEXT_CARD.test(l)) break;
    block.push(l);
  }

  return block;
}

/** Parse the K_POINTS card of a Quantum ESPRESSO pw.x input into typed card data. */
export function fromPWKPoints(text: string): KPointsCard {
  const block = extractKPointsBlock(text);
  const modeMatch = block[0].match(K_POINTS_HEADER);
  const mode = (modeMatch?.[1]?.toLowerCase() ??
    "automatic") as KPointsCard["mode"];
  const rest = block.slice(1);

  switch (mode) {
    case "automatic": {
      const n = toNumbers(rest[0] ?? "");
      if (n.length < 6) {
        throw new Error("K_POINTS automatic requires 6 numbers");
      }
      return {
        mode,
        grid: [n[0], n[1], n[2]],
        shift: [n[3], n[4], n[5]],
      };
    }
    case "gamma":
      return { mode };
    case "crystal":
    case "tpiba":
      return { mode, points: parsePointList(rest) };
    case "crystal_b":
    case "tpiba_b": {
      const nks = Number.parseInt(rest[0] ?? "", 10);
      if (Number.isNaN(nks)) {
        throw new Error("K_POINTS band path requires nks");
      }
      return { mode, nks, points: rest.slice(1).map(parseKpt) };
    }
    case "crystal_c":
    case "tpiba_c":
      return { mode, points: parsePointList(rest) };
    default:
      throw new Error(`Unsupported K_POINTS mode '${mode}'`);
  }
}

function serializeKpt(k: Kpt): string {
  return `${k.x} ${k.y} ${k.z} ${k.w}`;
}

function serializeList(card: {
  mode: "crystal" | "tpiba" | "crystal_c" | "tpiba_c";
  points: Kpt[];
}): string {
  return [
    `K_POINTS ${card.mode}`,
    String(card.points.length),
    ...card.points.map(serializeKpt),
  ].join("\n");
}

/** Serialize K_POINTS card data back to a Quantum ESPRESSO pw.x card. */
export function toPWKPoints(card: KPointsCard): string {
  switch (card.mode) {
    case "gamma":
      return "K_POINTS gamma";
    case "automatic":
      return `K_POINTS automatic\n${card.grid.join(" ")} ${card.shift.join(" ")}`;
    case "crystal":
    case "tpiba":
      return serializeList(card);
    case "crystal_b":
    case "tpiba_b":
      return [
        `K_POINTS ${card.mode}`,
        String(card.nks),
        ...card.points.map(serializeKpt),
      ].join("\n");
    case "crystal_c":
    case "tpiba_c":
      return serializeList(card);
  }
}
