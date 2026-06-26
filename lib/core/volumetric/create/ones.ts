import { fill } from "./fill";

// special case of fill that sets all to one
export function ones(shape: [number, number, number], channels = 1) {
  return fill(shape, 1, channels);
}
