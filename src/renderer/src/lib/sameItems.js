export function sameItems(a, b) {
  return Boolean(a) && Boolean(b) && a.length === b.length && a.every((item, i) => item === b[i])
}
