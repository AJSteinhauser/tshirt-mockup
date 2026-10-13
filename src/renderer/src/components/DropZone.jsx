import { useState } from 'react'

const IMAGE_PATTERN = /\.(png|jpe?g)$/i

export default function DropZone({ onFiles, className = '', children }) {
  const [over, setOver] = useState(false)

  function handleDragOver(e) {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    setOver(true)
  }

  function handleDrop(e) {
    e.preventDefault()
    setOver(false)
    const images = Array.from(e.dataTransfer.files).filter((f) => IMAGE_PATTERN.test(f.name))
    if (images.length > 0) onFiles(images)
  }

  return (
    <div
      className={`drop-zone ${over ? 'is-over' : ''} ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget) && setOver(false)}
      onDrop={handleDrop}
    >
      {children}
    </div>
  )
}
