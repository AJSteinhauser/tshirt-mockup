import { createCanvas, loadImage } from 'canvas'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { computeHomography, applyHomography } from '../renderer/src/lib/homography.js'
import { warpImageIntoQuad } from '../renderer/src/lib/warp.js'

function sanitize(name) {
  return name.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'design'
}

async function loadImageData(buffer) {
  const img = await loadImage(buffer)
  const canvas = createCanvas(img.width, img.height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)
  return ctx.getImageData(0, 0, img.width, img.height)
}

export async function exportDesignToAllShirts({
  designName,
  designDataUrl,
  templateQuads,
  designCorners,
  selectedFilenames,
  shirtsDir,
  outputDir,
  shirtsConfigPath,
  onProgress = () => {},
  shouldStop = () => false
}) {
  const shirtsConfig = JSON.parse(
    await readFile(shirtsConfigPath, 'utf-8').catch(() => '{}')
  )

  const designBuffer = Buffer.from(designDataUrl.split(',')[1], 'base64')
  const sourceImageData = await loadImageData(designBuffer)

  const folderName = sanitize(designName)
  const destDir = join(outputDir, folderName)
  await mkdir(destDir, { recursive: true })

  const results = []

  const entries = selectedFilenames
    ? selectedFilenames.map((filename) => [filename, shirtsConfig[filename]])
    : Object.entries(shirtsConfig)

  let stopped = false
  for (const [index, [filename, entry]] of entries.entries()) {
    if (shouldStop()) {
      stopped = true
      break
    }
    onProgress({ phase: 'start', index, total: entries.length, filename })
    try {
      if (!entry?.quad || entry.quad.length !== 4) {
        results.push({ filename, ok: false, error: 'not calibrated' })
        continue
      }

      const side = entry.side ?? 'front'
      const templateQuad = templateQuads?.[side]
      if (!templateQuad) {
        results.push({ filename, ok: false, error: `no ${side} template reference area set` })
        continue
      }

      const shirtImg = await loadImage(join(shirtsDir, filename))
      const canvas = createCanvas(shirtImg.width, shirtImg.height)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(shirtImg, 0, 0)

      const templateToShirt = computeHomography(templateQuad, entry.quad)
      const shirtDestQuad = designCorners.map((p) => applyHomography(templateToShirt, p))

      warpImageIntoQuad({
        destCtx: ctx,
        destWidth: shirtImg.width,
        destHeight: shirtImg.height,
        sourceImageData,
        dstQuad: shirtDestQuad,
        clipQuad: entry.quad
      })

      const outName = filename.replace(/\.[^.]+$/, '') + '.png'
      const outPath = join(destDir, outName)
      const buffer = canvas.toBuffer('image/png')
      await writeFile(outPath, buffer)

      results.push({ filename, ok: true, outPath })
    } catch (err) {
      results.push({ filename, ok: false, error: err.message })
    } finally {
      onProgress({ phase: 'done', index, total: entries.length, ...results[results.length - 1] })
    }
  }

  return { outputDir: destDir, results, stopped }
}
