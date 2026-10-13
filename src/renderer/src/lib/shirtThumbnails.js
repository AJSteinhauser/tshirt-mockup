export const SHIRT_THUMB_DIM = 280
const MAX_CONCURRENT_DECODES = 4

const thumbnailCache = new Map()
const waitingForSlot = []
let activeDecodes = 0

async function withDecodeSlot(task) {
  if (activeDecodes >= MAX_CONCURRENT_DECODES) await new Promise((resolve) => waitingForSlot.push(resolve))
  activeDecodes += 1
  try {
    return await task()
  } finally {
    activeDecodes -= 1
    waitingForSlot.shift()?.()
  }
}

async function createThumbnail(filename, maxDim) {
  const bytes = await window.api.getShirtImageBytes(filename)
  const full = await createImageBitmap(new Blob([bytes]))
  const scale = Math.min(1, maxDim / Math.max(full.width, full.height))
  const bitmap = await createImageBitmap(full, {
    resizeWidth: Math.round(full.width * scale),
    resizeHeight: Math.round(full.height * scale),
    resizeQuality: 'high'
  })
  full.close()
  return { bitmap, scale }
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

export function evictShirtThumbnails(filename) {
  for (const key of thumbnailCache.keys()) {
    if (key.startsWith(`${filename}@`)) thumbnailCache.delete(key)
  }
}
