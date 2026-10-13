import { useEffect, useState } from 'react'
import { SHIRT_THUMB_DIM, loadShirtThumbnail } from '../lib/shirtThumbnails.js'
import { markDeveloped } from '../lib/markDeveloped.js'

export default function ShirtThumb({ filename, className = '' }) {
  const [src, setSrc] = useState(null)

  useEffect(() => {
    let cancelled = false
    setSrc(null)
    loadShirtThumbnail(filename, SHIRT_THUMB_DIM).then(({ bitmap }) => {
      if (cancelled) return
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      canvas.getContext('2d').drawImage(bitmap, 0, 0)
      setSrc(canvas.toDataURL('image/jpeg', 0.85))
    })
    return () => {
      cancelled = true
    }
  }, [filename])

  return (
    <span className={`shirt-thumb ${src ? 'is-loaded' : ''} ${className}`}>
      {src && <img src={src} alt="" draggable={false} onLoad={markDeveloped} />}
    </span>
  )
}
