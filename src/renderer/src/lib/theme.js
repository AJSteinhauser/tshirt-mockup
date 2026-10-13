const tokenCache = new Map()

export function cssToken(name) {
  if (!tokenCache.has(name)) {
    tokenCache.set(name, getComputedStyle(document.documentElement).getPropertyValue(name).trim())
  }
  return tokenCache.get(name)
}

export function strokeWithHalo(ctx, color, width = 2) {
  ctx.save()
  ctx.lineWidth = width + 3
  ctx.strokeStyle = cssToken('--canvas-halo')
  ctx.stroke()
  ctx.lineWidth = width
  ctx.strokeStyle = color
  ctx.stroke()
  ctx.restore()
}
