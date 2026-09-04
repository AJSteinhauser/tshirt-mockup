import { useEffect, useMemo, useState } from 'react'
import TransformLayer from '../components/TransformLayer.jsx'
import { computeHomography, applyHomography, rectToQuad } from '../lib/homography.js'
import { warpImageIntoQuad } from '../lib/warp.js'
import { loadImageElement } from '../lib/loadImage.js'

export default function DesignPlacement({
  templateSrcs,
  templateQuads,
  shirtFiles,
  shirtsConfig,
  side,
  design,
  setDesign,
  transform,
  setTransform
}) {
  const templateSrc = templateSrcs[side]
  const templateQuad = templateQuads[side]

  const calibratedShirts = useMemo(
    () => shirtFiles.filter((f) => shirtsConfig[f]?.quad && (shirtsConfig[f]?.side ?? 'front') === side),
    [shirtFiles, shirtsConfig, side]
  )
  const [previewShirt, setPreviewShirt] = useState(null)
  const [previewSrc, setPreviewSrc] = useState(null)

  useEffect(() => {
    if ((!previewShirt || !calibratedShirts.includes(previewShirt)) && calibratedShirts.length > 0) {
      setPreviewShirt(calibratedShirts[0])
    }
    if (calibratedShirts.length === 0) setPreviewShirt(null)
  }, [calibratedShirts, previewShirt])

  async function handleUpload() {
    const picked = await window.api.pickDesignImage()
    if (picked) {
      setDesign(picked)
      setTransform(null)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!design || !transform || !previewShirt || !templateQuad) {
        setPreviewSrc(null)
        return
      }
      const shirtEntry = shirtsConfig[previewShirt]
      if (!shirtEntry?.quad) return

      const [shirtImg, designImg] = await Promise.all([
        window.api.getShirtImage(previewShirt).then(loadImageElement),
        loadImageElement(design.dataUrl)
      ])
      if (cancelled) return

      const canvas = document.createElement('canvas')
      canvas.width = shirtImg.width
      canvas.height = shirtImg.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(shirtImg, 0, 0)

      const designCanvas = document.createElement('canvas')
      designCanvas.width = designImg.width
      designCanvas.height = designImg.height
      const designCtx = designCanvas.getContext('2d')
      designCtx.drawImage(designImg, 0, 0)
      const sourceImageData = designCtx.getImageData(0, 0, designImg.width, designImg.height)

      const designCorners = rectToQuad(transform)
      const templateToShirt = computeHomography(templateQuad, shirtEntry.quad)
      const dstQuad = designCorners.map((p) => applyHomography(templateToShirt, p))

      warpImageIntoQuad({
        destCtx: ctx,
        destWidth: canvas.width,
        destHeight: canvas.height,
        sourceImageData,
        dstQuad,
        clipQuad: shirtEntry.quad
      })

      if (!cancelled) setPreviewSrc(canvas.toDataURL('image/png'))
    }
    const timer = setTimeout(run, 60)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [design, transform, previewShirt, templateQuad, shirtsConfig])

  return (
    <div className="screen">
      <h2>3. Design Placement — {side}</h2>
      <p className="hint">
        Drag to move, corner to scale, top handle to rotate. Dashed line = print area — content
        outside it gets cropped.
      </p>

      {!templateQuad ? (
        <p className="hint">Set the {side} reference area in Template Setup first.</p>
      ) : calibratedShirts.length === 0 ? (
        <p className="hint">Calibrate at least one {side} shirt before placing a design.</p>
      ) : (
        <>
          <div className="actions">
            <button onClick={handleUpload}>{design ? 'Change design' : 'Upload design'}</button>
            {design && <span>{design.name}</span>}
          </div>

          {design && (
            <div className="placement-layout">
              <TransformLayer
                templateSrc={templateSrc}
                templateQuad={templateQuad}
                designSrc={design.dataUrl}
                transform={transform}
                onChange={setTransform}
              />
              <div className="preview-pane">
                <div className="preview-controls">
                  <label>Preview shirt:</label>
                  <select value={previewShirt ?? ''} onChange={(e) => setPreviewShirt(e.target.value)}>
                    {calibratedShirts.map((f) => (
                      <option key={f} value={f}>
                        {shirtsConfig[f]?.name ?? f}
                      </option>
                    ))}
                  </select>
                </div>
                {previewSrc && <img className="preview-image" src={previewSrc} alt="preview" />}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
