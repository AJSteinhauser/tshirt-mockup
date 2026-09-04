import { useEffect, useState } from 'react'

export function useImage(src) {
  const [image, setImage] = useState(null)

  useEffect(() => {
    if (!src) {
      setImage(null)
      return
    }
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (!cancelled) setImage(img)
    }
    img.src = src
    return () => {
      cancelled = true
    }
  }, [src])

  return image
}
