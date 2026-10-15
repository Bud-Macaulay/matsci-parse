/**
 * 32-bit FNV-1a hash over an integer array or string.
 *
 * Array elements are mixed as 32-bit words (exact via Math.imul); strings
 * are mixed byte-wise by UTF-16 code unit, so for byte-valued input this is
 * canonical FNV-1a: [] -> 0x811c9dc5, "a" -> 0xe40c292c,
 * "foobar" -> 0xbf9cf968. Returns an unsigned 32-bit number.
 *
 * 32 bits can collide (~50% past ~77k entries), so uses that need exact
 * dedup must verify full equality on a hash hit rather than trusting the
 * hash alone.
 */
export function fnv1a32(data: ArrayLike<number> | string): number {
  let h = 2166136261;
  if (typeof data === "string") {
    for (let i = 0; i < data.length; i++) {
      h ^= data.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
  } else {
    for (let i = 0; i < data.length; i++) {
      h ^= data[i] as number;
      h = Math.imul(h, 16777619);
    }
  }
  return h >>> 0;
}
