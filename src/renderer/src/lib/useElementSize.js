import { useEffect, useState } from 'react'

export function useElementSize() {
  const [element, setElement] = useState(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      // Hidden (display: none) panels report 0×0; keep the last real size so returning doesn't flash an empty canvas.
      if (width > 0 && height > 0) setSize({ width: Math.floor(width), height: Math.floor(height) })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])

  return [setElement, size]
}
