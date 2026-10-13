export const SHIRT_THUMB_DIM = 280
export const SHIRT_WORKING_DIM = 1400
const MAX_CONCURRENT_DECODES = 4
const MAX_WORKING_IMAGES = 4

const thumbnailCache = new Map()
const thumbnailUrlCache = new Map()
const workingCache = new Map()
const waitingForSlot = []
let activeDecodes = 0

async function withDecodeSlot(task, urgent = false) {
  if (activeDecodes >= MAX_CONCURRENT_DECODES) {
    await new Promise((resolve) => (urgent ? waitingForSlot.unshift(resolve) : waitingForSlot.push(resolve)))
  }
  activeDecodes += 1
  try {
    return await task()
  } finally {
    activeDecodes -= 1
    waitingForSlot.shift()?.()
  }
}

function hasTransparency(bitmap) {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0)
  const { data } = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
  for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return true
  return false
}

async function persistThumbnail(filename, maxDim, bitmap, meta) {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  canvas.getContext('2d').drawImage(bitmap, 0, 0)
  const blob = await canvas.convertToBlob(
    hasTransparency(bitmap) ? { type: 'image/png' } : { type: 'image/jpeg', quality: 0.9 }
  )
  await window.api.saveShirtThumbnail(filename, maxDim, meta, new Uint8Array(await blob.arrayBuffer()))
}

async function createThumbnail(filename, maxDim) {
  const cached = await window.api.getCachedShirtThumbnail(filename, maxDim)
  if (cached) {
    const { bytes, ...meta } = cached
    return { bitmap: await createImageBitmap(new Blob([bytes])), ...meta }
  }

  const bytes = await window.api.getShirtImageBytes(filename)
  const full = await createImageBitmap(new Blob([bytes]))
  const scale = Math.min(1, maxDim / Math.max(full.width, full.height))
  const bitmap = await createImageBitmap(full, {
    resizeWidth: Math.round(full.width * scale),
    resizeHeight: Math.round(full.height * scale),
    resizeQuality: 'high'
  })
  const meta = { scale, width: full.width, height: full.height }
  full.close()
  persistThumbnail(filename, maxDim, bitmap, meta).catch(() => {})
  return { bitmap, ...meta }
}

export function loadShirtThumbnail(filename, maxDim) {
  const key = `${filename}@${maxDim}`
  if (!thumbnailCache.has(key)) {
    const promise = withDecodeSlot(() => createThumbnail(filename, maxDim))
    promise.catch(() => thumbnailCache.delete(key))
    thumbnailCache.set(key, promise)
  }
  return thumbnailCache.get(key)
}

function requestWorkingImage(filename, urgent) {
  let promise = workingCache.get(filename)
  workingCache.delete(filename)
  if (!promise) {
    promise = withDecodeSlot(() => createThumbnail(filename, SHIRT_WORKING_DIM), urgent)
    promise.catch(() => workingCache.delete(filename))
  }
  workingCache.set(filename, promise)
  if (workingCache.size > MAX_WORKING_IMAGES) workingCache.delete(workingCache.keys().next().value)
  return promise
}

export function loadShirtWorkingImage(filename) {
  return requestWorkingImage(filename, true)
}

export function prefetchShirtWorkingImage(filename) {
  requestWorkingImage(filename, false).catch(() => {})
}

export function loadShirtThumbnailUrl(filename) {
  if (!thumbnailUrlCache.has(filename)) {
    const promise = loadShirtThumbnail(filename, SHIRT_THUMB_DIM).then(({ bitmap }) => {
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      canvas.getContext('2d').drawImage(bitmap, 0, 0)
      return canvas.toDataURL('image/jpeg', 0.85)
    })
    promise.catch(() => thumbnailUrlCache.delete(filename))
    thumbnailUrlCache.set(filename, promise)
  }
  return thumbnailUrlCache.get(filename)
}

export function evictShirtThumbnails(filename) {
  thumbnailUrlCache.delete(filename)
  workingCache.delete(filename)
  for (const key of thumbnailCache.keys()) {
    if (key.startsWith(`${filename}@`)) thumbnailCache.delete(key)
  }
}
