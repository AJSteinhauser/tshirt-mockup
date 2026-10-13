import { useEffect, useRef, useState } from 'react'
import { useImage } from '../lib/useImage.js'
import { defaultQuad, squareUpQuad, pointInQuad } from '../lib/homography.js'
import { cssToken, strokeWithHalo } from '../lib/theme.js'

const HANDLE_RADIUS = 9
const DEFAULT_MAX_WIDTH = 760
const DEFAULT_MAX_HEIGHT = 640
const TOUCHED_WEIGHT = 8
const UNTOUCHED_WEIGHT = 1
const TOUCH_EPSILON = 0.5

export default function QuadEditor({
  imageSrc,
  image: imageOverride,
  naturalSize,
  quad,
  onChange,
  label,
  readOnly = false,
  maxWidth = DEFAULT_MAX_WIDTH,
  maxHeight = DEFAULT_MAX_HEIGHT
}) {
  const loadedImage = useImage(imageOverride ? null : imageSrc)
  const image = imageOverride ?? loadedImage
  const naturalWidth = naturalSize?.width ?? image?.width
  const naturalHeight = naturalSize?.height ?? image?.height
  const canvasRef = useRef(null)
  const [dragIndex, setDragIndex] = useState(null)
  const [dragMode, setDragMode] = useState(null) // 'point' | 'move' | 'scale'
  const dragState = useRef(null)

  // Falls back to a centered default for display only — doesn't push through onChange, so
  // merely viewing an uncalibrated shirt/template never autosaves a quad nobody set.
  const effectiveQuad = quad ?? (image ? defaultQuad(naturalWidth, naturalHeight) : null)

  const scale = image && maxWidth && maxHeight ? Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight, 1) : null

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !image || !effectiveQuad || !scale) return
    canvas.width = naturalWidth * scale
    canvas.height = naturalHeight * scale
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

    const pts = effectiveQuad.map((p) => ({ x: p.x * scale, y: p.y * scale }))

    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.closePath()
    ctx.fillStyle = cssToken('--canvas-fill')
    ctx.fill()
    ctx.setLineDash([7, 5])
    strokeWithHalo(ctx, cssToken('--canvas-stroke'))
    ctx.setLineDash([])

    const labels = ['TL', 'TR', 'BR', 'BL']
    pts.forEach((p, i) => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, HANDLE_RADIUS, 0, Math.PI * 2)
      ctx.fillStyle = dragIndex === i ? cssToken('--canvas-active') : cssToken('--canvas-handle')
      ctx.fill()
      ctx.strokeStyle = cssToken('--canvas-ring')
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = cssToken('--canvas-ring')
      ctx.font = `700 9px ${cssToken('--font-ui')}`
      ctx.textAlign = 'center'
      ctx.fillText(labels[i], p.x, p.y + 3)
    })
  }, [image, effectiveQuad, scale, dragIndex])

  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale }
  }

  function handlePointerDown(e) {
    if (readOnly || !effectiveQuad || !image || !scale) return
    const pos = getPos(e)
    const hitRadius = HANDLE_RADIUS / scale + 4
    const idx = effectiveQuad.findIndex((p) => Math.hypot(p.x - pos.x, p.y - pos.y) <= hitRadius)
    const modifierHeld = e.ctrlKey || e.metaKey

    if (idx !== -1 && modifierHeld) {
      setDragIndex(idx)
      setDragMode('scale')
      dragState.current = { mode: 'scale', origQuad: effectiveQuad, cornerIndex: idx }
    } else if (idx !== -1) {
      setDragIndex(idx)
      setDragMode('point')
      dragState.current = { mode: 'point', cornerIndex: idx }
    } else if (modifierHeld && pointInQuad(pos.x, pos.y, effectiveQuad)) {
      setDragMode('move')
      dragState.current = { mode: 'move', origQuad: effectiveQuad, start: pos }
    } else {
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e) {
    const drag = dragState.current
    if (!drag || !image) return
    const pos = getPos(e)

    if (drag.mode === 'point') {
      const clampedX = Math.max(0, Math.min(naturalWidth, pos.x))
      const clampedY = Math.max(0, Math.min(naturalHeight, pos.y))
      const next = effectiveQuad.map((p, i) =>
        i === drag.cornerIndex ? { x: clampedX, y: clampedY } : p
      )
      onChange(next)
    } else if (drag.mode === 'move') {
      const dx = pos.x - drag.start.x
      const dy = pos.y - drag.start.y
      onChange(drag.origQuad.map((p) => ({ x: p.x + dx, y: p.y + dy })))
    } else if (drag.mode === 'scale') {
      const { origQuad, cornerIndex } = drag
      const anchorIndex = (cornerIndex + 2) % 4
      const anchor = origQuad[anchorIndex]
      const origCorner = origQuad[cornerIndex]
      let sx
      let sy

      if (e.shiftKey) {
        const dOrigX = origCorner.x - anchor.x
        const dOrigY = origCorner.y - anchor.y
        const denom = dOrigX * dOrigX + dOrigY * dOrigY
        let t = denom > 0 ? ((pos.x - anchor.x) * dOrigX + (pos.y - anchor.y) * dOrigY) / denom : 1
        t = Math.max(0.05, t)
        sx = t
        sy = t
      } else {
        sx = Math.abs(origCorner.x - anchor.x) > 0.5 ? (pos.x - anchor.x) / (origCorner.x - anchor.x) : 1
        sy = Math.abs(origCorner.y - anchor.y) > 0.5 ? (pos.y - anchor.y) / (origCorner.y - anchor.y) : 1
        sx = Math.sign(sx || 1) * Math.max(0.05, Math.abs(sx))
        sy = Math.sign(sy || 1) * Math.max(0.05, Math.abs(sy))
      }

      onChange(
        origQuad.map((p) => ({
          x: anchor.x + (p.x - anchor.x) * sx,
          y: anchor.y + (p.y - anchor.y) * sy
        }))
      )
    }
  }

  function handleSquareUp() {
    if (!effectiveQuad || !image) return
    const base = defaultQuad(naturalWidth, naturalHeight)
    const weights = effectiveQuad.map((p, i) =>
      Math.hypot(p.x - base[i].x, p.y - base[i].y) > TOUCH_EPSILON ? TOUCHED_WEIGHT : UNTOUCHED_WEIGHT
    )
    onChange(squareUpQuad(effectiveQuad, weights))
  }

  function handlePointerUp(e) {
    setDragIndex(null)
    setDragMode(null)
    dragState.current = null
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  return (
    <div className="quad-editor">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ cursor: dragMode === 'move' ? 'move' : dragMode ? 'grabbing' : 'default' }}
      />
      {label && <span className="canvas-chip quad-editor-label">{label}</span>}
      {!readOnly && effectiveQuad && (
        <button type="button" className="canvas-chip quad-editor-square-btn" onClick={handleSquareUp}>
          Square up
        </button>
      )}
    </div>
  )
}
