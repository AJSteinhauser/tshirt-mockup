import { useEffect, useRef, useState } from 'react'
import { useImage } from '../lib/useImage.js'
import { rectToQuad, pointInQuad } from '../lib/homography.js'
import { cssToken, strokeWithHalo } from '../lib/theme.js'

const HANDLE_RADIUS = 9
const ROTATE_OFFSET = 40
const MAX_WIDTH = 760
const MAX_HEIGHT = 640
const STITCH_DASH = [7, 5]
const STITCH_SPEED = 0.03

export default function TransformLayer({ templateSrc, templateQuad, designSrc, transform, onChange }) {
  const templateImage = useImage(templateSrc)
  const designImage = useImage(designSrc)
  const canvasRef = useRef(null)
  const [scale, setScale] = useState(1)
  const [mode, setMode] = useState(null) // 'move' | 'scale' | 'rotate'
  const dragState = useRef(null)
  const [hovering, setHovering] = useState(false)
  const [dashOffset, setDashOffset] = useState(0)
  const marching = hovering || Boolean(mode)

  useEffect(() => {
    if (!marching) return
    let frame
    const start = performance.now()
    const tick = (now) => {
      setDashOffset(-(now - start) * STITCH_SPEED)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [marching])

  useEffect(() => {
    if (!templateImage) return
    const s = Math.min(MAX_WIDTH / templateImage.width, MAX_HEIGHT / templateImage.height, 1)
    setScale(s)
  }, [templateImage])

  useEffect(() => {
    if (templateImage && designImage && !transform) {
      const width = templateImage.width * 0.3
      const height = width * (designImage.height / designImage.width)
      onChange({
        cx: templateImage.width / 2,
        cy: templateImage.height * 0.4,
        width,
        height,
        rotation: 0
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateImage, designImage])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !templateImage) return
    canvas.width = templateImage.width * scale
    canvas.height = templateImage.height * scale
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(templateImage, 0, 0, canvas.width, canvas.height)

    if (templateQuad) {
      const clipPts = templateQuad.map((p) => ({ x: p.x * scale, y: p.y * scale }))
      ctx.save()
      ctx.setLineDash(STITCH_DASH)
      ctx.lineDashOffset = dashOffset
      ctx.beginPath()
      ctx.moveTo(clipPts[0].x, clipPts[0].y)
      for (let i = 1; i < 4; i++) ctx.lineTo(clipPts[i].x, clipPts[i].y)
      ctx.closePath()
      strokeWithHalo(ctx, cssToken('--canvas-print-area'))
      ctx.restore()
    }

    if (!transform || !designImage) return

    const corners = rectToQuad(transform).map((p) => ({ x: p.x * scale, y: p.y * scale }))

    ctx.save()
    if (templateQuad) {
      const clipPts = templateQuad.map((p) => ({ x: p.x * scale, y: p.y * scale }))
      ctx.beginPath()
      ctx.moveTo(clipPts[0].x, clipPts[0].y)
      for (let i = 1; i < 4; i++) ctx.lineTo(clipPts[i].x, clipPts[i].y)
      ctx.closePath()
      ctx.clip()
    }
    ctx.translate(transform.cx * scale, transform.cy * scale)
    ctx.rotate(transform.rotation)
    ctx.drawImage(
      designImage,
      (-transform.width / 2) * scale,
      (-transform.height / 2) * scale,
      transform.width * scale,
      transform.height * scale
    )
    ctx.restore()

    ctx.beginPath()
    ctx.moveTo(corners[0].x, corners[0].y)
    for (let i = 1; i < 4; i++) ctx.lineTo(corners[i].x, corners[i].y)
    ctx.closePath()
    strokeWithHalo(ctx, cssToken('--canvas-stroke'))

    const rotateHandle = rotateHandlePos(transform)
    const rhScreen = { x: rotateHandle.x * scale, y: rotateHandle.y * scale }
    const topMid = { x: (corners[0].x + corners[1].x) / 2, y: (corners[0].y + corners[1].y) / 2 }
    ctx.beginPath()
    ctx.moveTo(topMid.x, topMid.y)
    ctx.lineTo(rhScreen.x, rhScreen.y)
    strokeWithHalo(ctx, cssToken('--canvas-stroke'))

    drawHandle(ctx, corners[2], mode === 'scale')
    drawHandle(ctx, rhScreen, mode === 'rotate')
  }, [templateImage, designImage, transform, scale, mode, templateQuad, dashOffset])

  function drawHandle(ctx, p, active) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, HANDLE_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = active ? cssToken('--canvas-active') : cssToken('--canvas-handle')
    ctx.fill()
    ctx.strokeStyle = cssToken('--canvas-ring')
    ctx.lineWidth = 2
    ctx.stroke()
  }

  function rotateHandlePos(t) {
    const localY = -t.height / 2 - ROTATE_OFFSET / scale
    const cos = Math.cos(t.rotation)
    const sin = Math.sin(t.rotation)
    return { x: t.cx + 0 * cos - localY * sin, y: t.cy + 0 * sin + localY * cos }
  }

  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale }
  }

  function handlePointerDown(e) {
    if (!transform) return
    const pos = getPos(e)
    const corners = rectToQuad(transform)
    const scaleHandle = corners[2]
    const rotateHandle = rotateHandlePos(transform)
    const hitRadius = HANDLE_RADIUS / scale + 4

    if (Math.hypot(pos.x - rotateHandle.x, pos.y - rotateHandle.y) <= hitRadius) {
      setMode('rotate')
      dragState.current = { transform }
    } else if (Math.hypot(pos.x - scaleHandle.x, pos.y - scaleHandle.y) <= hitRadius) {
      setMode('scale')
      dragState.current = { transform, aspect: transform.width / transform.height }
    } else if (pointInQuad(pos.x, pos.y, corners)) {
      setMode('move')
      dragState.current = { start: pos, transform }
    } else {
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e) {
    if (!mode || !dragState.current) return
    const pos = getPos(e)
    const base = dragState.current.transform

    if (mode === 'move') {
      const dx = pos.x - dragState.current.start.x
      const dy = pos.y - dragState.current.start.y
      onChange({ ...base, cx: base.cx + dx, cy: base.cy + dy })
      dragState.current = { start: pos, transform: { ...base, cx: base.cx + dx, cy: base.cy + dy } }
    } else if (mode === 'scale') {
      const cos = Math.cos(-base.rotation)
      const sin = Math.sin(-base.rotation)
      const dx = pos.x - base.cx
      const dy = pos.y - base.cy
      const localX = dx * cos - dy * sin
      const newWidth = Math.max(20, localX * 2)
      const newHeight = newWidth / dragState.current.aspect
      onChange({ ...base, width: newWidth, height: newHeight })
    } else if (mode === 'rotate') {
      const angle = Math.atan2(pos.y - base.cy, pos.x - base.cx)
      onChange({ ...base, rotation: angle + Math.PI / 2 })
    }
  }

  function handlePointerUp(e) {
    setMode(null)
    dragState.current = null
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
      style={{ cursor: mode ? 'grabbing' : 'default' }}
    />
  )
}
