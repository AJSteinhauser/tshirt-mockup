import { useEffect, useState } from 'react'
import { loadShirtThumbnailUrl } from '../lib/shirtThumbnails.js'
import { useNearView } from '../lib/nearView.js'
import { markDeveloped } from '../lib/markDeveloped.js'

export default function ShirtThumb({ filename, className = '' }) {
  const [ref, nearView] = useNearView()
  const [src, setSrc] = useState(null)

  useEffect(() => {
    if (!nearView) return
    let cancelled = false
    setSrc(null)
    loadShirtThumbnailUrl(filename).then((url) => {
      if (!cancelled) setSrc(url)
    })
    return () => {
      cancelled = true
    }
  }, [filename, nearView])

  return (
    <span ref={ref} className={`shirt-thumb ${src ? 'is-loaded' : ''} ${className}`}>
      {src && <img src={src} alt="" draggable={false} onLoad={markDeveloped} />}
    </span>
  )
}
