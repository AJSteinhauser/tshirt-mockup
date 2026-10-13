import { computeHomography, applyHomography, quadBounds, pointInQuad, rectToQuad } from './homography.js'

function sampleBilinear(imageData, sx, sy) {
  const { data, width, height } = imageData
  if (sx < 0 || sy < 0 || sx > width - 1 || sy > height - 1) return null

  const x0 = Math.floor(sx)
  const y0 = Math.floor(sy)
  const x1 = Math.min(x0 + 1, width - 1)
  const y1 = Math.min(y0 + 1, height - 1)
  const fx = sx - x0
  const fy = sy - y0

  const idx = (x, y) => (y * width + x) * 4
  const out = [0, 0, 0, 0]
  const i00 = idx(x0, y0)
  const i10 = idx(x1, y0)
  const i01 = idx(x0, y1)
  const i11 = idx(x1, y1)

  for (let c = 0; c < 4; c++) {
    const top = data[i00 + c] * (1 - fx) + data[i10 + c] * fx
    const bottom = data[i01 + c] * (1 - fx) + data[i11 + c] * fx
    out[c] = top * (1 - fy) + bottom * fy
  }
  return out
}

// Composites `sourceImageData` (the design, its own pixel rect treated as
// [0,0]-[w,0]-[w,h]-[0,h]) into `destCtx` warped to fill `dstQuad`
// (quad in destination-canvas pixel space, order [TL,TR,BR,BL]).
// `clipQuad` (defaults to `dstQuad`) is a hard boundary — pixels outside it are never drawn,
// even if `dstQuad` (the design's own warped shape) extends past it. Pass the calibrated
// print-area quad here so an oversized design gets cropped to the garment's real print area
// instead of bleeding past it.
export function warpImageIntoQuad({
  destCtx,
  destWidth,
  destHeight,
  sourceImageData,
  dstQuad,
  clipQuad = dstQuad
}) {
  const srcWidth = sourceImageData.width
  const srcHeight = sourceImageData.height
  const srcRect = [
    { x: 0, y: 0 },
    { x: srcWidth, y: 0 },
    { x: srcWidth, y: srcHeight },
    { x: 0, y: srcHeight }
  ]
  const srcFromDst = computeHomography(dstQuad, srcRect)

  const bounds = quadBounds(dstQuad)
  const minX = Math.max(0, Math.floor(bounds.minX))
  const minY = Math.max(0, Math.floor(bounds.minY))
  const maxX = Math.min(destWidth, Math.ceil(bounds.maxX))
  const maxY = Math.min(destHeight, Math.ceil(bounds.maxY))
  const w = maxX - minX
  const h = maxY - minY
  if (w <= 0 || h <= 0) return

  const destImageData = destCtx.getImageData(minX, minY, w, h)
  const destData = destImageData.data

  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const px = minX + dx + 0.5
      const py = minY + dy + 0.5
      if (!pointInQuad(px, py, dstQuad)) continue
      if (!pointInQuad(px, py, clipQuad)) continue

      const src = applyHomography(srcFromDst, { x: px, y: py })
      const sample = sampleBilinear(sourceImageData, src.x, src.y)
      if (!sample) continue

      const [r, g, b, a] = sample
      const alpha = a / 255
      if (alpha <= 0) continue

      const di = (dy * w + dx) * 4
      destData[di] = r * alpha + destData[di] * (1 - alpha)
      destData[di + 1] = g * alpha + destData[di + 1] * (1 - alpha)
      destData[di + 2] = b * alpha + destData[di + 2] * (1 - alpha)
      destData[di + 3] = Math.min(255, a + destData[di + 3] * (1 - alpha))
    }
  }

  destCtx.putImageData(destImageData, minX, minY)
}

function warpDesignOntoShirt({ destCtx, sourceImageData, transform, templateQuad, shirtQuad, scale = 1 }) {
  const templateToShirt = computeHomography(templateQuad, shirtQuad)
  const toDest = (p) => ({ x: p.x * scale, y: p.y * scale })
  warpImageIntoQuad({
    destCtx,
    destWidth: destCtx.canvas.width,
    destHeight: destCtx.canvas.height,
    sourceImageData,
    dstQuad: rectToQuad(transform).map((p) => toDest(applyHomography(templateToShirt, p))),
    clipQuad: shirtQuad.map(toDest)
  })
}

export function composeShirtPreviewCanvas({ shirtImage, ...placement }) {
  const canvas = document.createElement('canvas')
  canvas.width = shirtImage.width
  canvas.height = shirtImage.height
  const destCtx = canvas.getContext('2d')
  destCtx.drawImage(shirtImage, 0, 0)
  warpDesignOntoShirt({ destCtx, ...placement })
  return canvas
}

export function composeShirtPreview(args) {
  return composeShirtPreviewCanvas(args).toDataURL('image/png')
}
