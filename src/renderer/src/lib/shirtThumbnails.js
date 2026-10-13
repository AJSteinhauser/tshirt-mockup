const thumbnailCache = new Map()

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
    const promise = createThumbnail(filename, maxDim)
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
