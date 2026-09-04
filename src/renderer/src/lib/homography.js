// Quad point order is always [topLeft, topRight, bottomRight, bottomLeft].
// Correspondences are matched by index, so callers must keep that order consistent
// across template quads, shirt quads, and design rect corners.

function solveLinearSystem(A, b) {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]])

  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[pivot][col])) pivot = row
    }
    ;[M[col], M[pivot]] = [M[pivot], M[col]]

    const pivotVal = M[col][col]
    for (let k = col; k <= n; k++) M[col][k] /= pivotVal

    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const factor = M[row][col]
      for (let k = col; k <= n; k++) M[row][k] -= factor * M[col][k]
    }
  }

  return M.map((row) => row[n])
}

// Returns a 3x3 matrix (row-major, 9 numbers, h[8] === 1) mapping srcPts -> dstPts.
export function computeHomography(srcPts, dstPts) {
  const A = []
  const b = []

  for (let i = 0; i < 4; i++) {
    const { x, y } = srcPts[i]
    const { x: X, y: Y } = dstPts[i]
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X])
    b.push(X)
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y])
    b.push(Y)
  }

  const h = solveLinearSystem(A, b)
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1]
}

export function applyHomography(H, point) {
  const { x, y } = point
  const w = H[6] * x + H[7] * y + H[8]
  return {
    x: (H[0] * x + H[1] * y + H[2]) / w,
    y: (H[3] * x + H[4] * y + H[5]) / w
  }
}

export function rectToQuad({ cx, cy, width, height, rotation }) {
  const hw = width / 2
  const hh = height / 2
  const corners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh }
  ]
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  return corners.map(({ x, y }) => ({
    x: cx + x * cos - y * sin,
    y: cy + x * sin + y * cos
  }))
}

export function defaultQuad(width, height) {
  const left = width * 0.28
  const right = width * 0.72
  const top = height * 0.22
  const bottom = height * 0.58
  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom }
  ]
}

export function quadBounds(quad) {
  const xs = quad.map((p) => p.x)
  const ys = quad.map((p) => p.y)
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys)
  }
}

function weightedAvg(values, weights) {
  const totalWeight = weights[0] + weights[1]
  return (values[0] * weights[0] + values[1] * weights[1]) / totalWeight
}

// Snaps a (possibly skewed) quad to an axis-aligned rectangle, choosing each edge as the
// weighted average of the two corners that define it. Equal weights minimize total movement;
// giving one corner a higher weight makes it move less, at the expense of its paired corner.
export function squareUpQuad(quad, weights = [1, 1, 1, 1]) {
  const left = weightedAvg([quad[0].x, quad[3].x], [weights[0], weights[3]])
  const right = weightedAvg([quad[1].x, quad[2].x], [weights[1], weights[2]])
  const top = weightedAvg([quad[0].y, quad[1].y], [weights[0], weights[1]])
  const bottom = weightedAvg([quad[3].y, quad[2].y], [weights[3], weights[2]])
  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom }
  ]
}

// Point-in-polygon (ray casting), quad given in order.
export function pointInQuad(px, py, quad) {
  let inside = false
  for (let i = 0, j = quad.length - 1; i < quad.length; j = i++) {
    const xi = quad[i].x
    const yi = quad[i].y
    const xj = quad[j].x
    const yj = quad[j].y
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}
