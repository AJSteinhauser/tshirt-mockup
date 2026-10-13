import { useEffect, useState } from 'react'
import QuadEditor from '../components/QuadEditor.jsx'
import TagInput from '../components/TagInput.jsx'
import { computeHomography, applyHomography, rectToQuad } from '../lib/homography.js'
import { warpImageIntoQuad } from '../lib/warp.js'
import { loadImageElement } from '../lib/loadImage.js'
import { evictShirtThumbnails } from '../lib/shirtThumbnails.js'

const AUTOSAVE_DELAY = 500
const EMPTY_SNAPSHOT = { quad: null, side: 'front', tags: [], name: '' }

function snapshotsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

export default function ShirtCalibration({
  shirtFiles,
  shirtsConfig,
  templateSrcs,
  templateQuads,
  designs,
  transforms,
  onShirtFilesChanged,
  onShirtsConfigChanged,
  onSaved
}) {
  const [selected, setSelected] = useState(shirtFiles[0] ?? null)
  const [shirtSrc, setShirtSrc] = useState(null)
  const [localQuad, setLocalQuad] = useState(null)
  const [localSide, setLocalSide] = useState('front')
  const [localTags, setLocalTags] = useState([])
  const [localName, setLocalName] = useState('')
  const [initial, setInitial] = useState(EMPTY_SNAPSHOT)
  const [status, setStatus] = useState('saved') // 'saving' | 'saved'
  const [overlaySrc, setOverlaySrc] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    if (!selected && shirtFiles.length > 0) setSelected(shirtFiles[0])
  }, [shirtFiles, selected])

  async function handleUpload() {
    setUploading(true)
    const newList = await window.api.uploadShirtImages()
    const added = newList.filter((f) => !shirtFiles.includes(f))
    onShirtFilesChanged(newList)
    if (added.length > 0) setSelected(added[0])
    setUploading(false)
  }

  async function handleDelete(filename, e) {
    e.stopPropagation()
    setDeleting(filename)
    const result = await window.api.deleteShirtImage(filename)
    if (result.deleted) {
      evictShirtThumbnails(filename)
      onShirtFilesChanged(result.files)
      onShirtsConfigChanged(result.shirts)
      if (selected === filename) setSelected(result.files[0] ?? null)
    }
    setDeleting(null)
  }

  // Snapshot only when `selected` changes — not when `shirtsConfig` updates from our own
  // autosave — so "Reset" reverts to how it was when this shirt was first opened, not to
  // whatever was last autosaved.
  useEffect(() => {
    if (!selected) return
    let cancelled = false
    window.api.getShirtImage(selected).then((dataUrl) => {
      if (!cancelled) setShirtSrc(dataUrl)
    })
    const entry = shirtsConfig[selected]
    const snapshot = {
      quad: entry?.quad ?? null,
      side: entry?.side ?? 'front',
      tags: entry?.tags ?? [],
      name: entry?.name ?? selected
    }
    setLocalQuad(snapshot.quad)
    setLocalSide(snapshot.side)
    setLocalTags(snapshot.tags)
    setLocalName(snapshot.name)
    setInitial(snapshot)
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  const design = designs[localSide]
  const transform = transforms[localSide]
  const templateQuad = templateQuads[localSide]

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!design || !transform || !templateQuad || !shirtSrc || !localQuad) {
        setOverlaySrc(null)
        return
      }

      const [shirtImg, designImg] = await Promise.all([
        loadImageElement(shirtSrc),
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
      const templateToShirt = computeHomography(templateQuad, localQuad)
      const dstQuad = designCorners.map((p) => applyHomography(templateToShirt, p))

      warpImageIntoQuad({
        destCtx: ctx,
        destWidth: canvas.width,
        destHeight: canvas.height,
        sourceImageData,
        dstQuad,
        clipQuad: localQuad
      })

      if (!cancelled) setOverlaySrc(canvas.toDataURL('image/png'))
    }
    const timer = setTimeout(run, 60)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [design, transform, templateQuad, shirtSrc, localQuad])

  useEffect(() => {
    if (!selected) return
    setStatus('saving')
    const timer = setTimeout(async () => {
      const partial = { quad: localQuad, side: localSide, tags: localTags, name: localName.trim() || selected }
      await window.api.saveShirtMeta(selected, partial)
      onSaved(selected, partial)
      setStatus('saved')
    }, AUTOSAVE_DELAY)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localQuad, localSide, localTags, localName, selected])

  function handleReset() {
    setLocalQuad(initial.quad)
    setLocalSide(initial.side)
    setLocalTags(initial.tags)
    setLocalName(initial.name)
  }

  const current = { quad: localQuad, side: localSide, tags: localTags, name: localName }
  const isDirty = !snapshotsEqual(current, initial)

  const calibratedCount = shirtFiles.filter((f) => shirtsConfig[f]?.quad).length

  return (
    <div className="screen">
      <h2>2. Shirt Calibration</h2>
      <p className="hint">
        For each shirt photo, pick front or back, drag the four corners to match the same region
        marked on that template, and add any tags you want to filter by later.{' '}
        {calibratedCount}/{shirtFiles.length} calibrated.
        {design && ' The design you placed is previewed on top so you can check the fit.'}
      </p>
      <div className="calibration-layout">
        <div className="shirt-list-panel">
          <button className="upload-shirts-btn" onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Uploading…' : '+ Upload shirt images'}
          </button>
          <div className="shirt-list">
            {shirtFiles.map((f) => (
              <div
                key={f}
                role="button"
                tabIndex={0}
                className={`shirt-list-item ${f === selected ? 'active' : ''}`}
                onClick={() => setSelected(f)}
                onKeyDown={(e) => e.key === 'Enter' && setSelected(f)}
              >
                <span className={shirtsConfig[f]?.quad ? 'dot dot-ok' : 'dot dot-pending'} />
                <span className="shirt-list-name">{shirtsConfig[f]?.name ?? f}</span>
                {shirtsConfig[f]?.side && (
                  <span className="shirt-side-badge">{shirtsConfig[f].side}</span>
                )}
                <button
                  type="button"
                  className="shirt-delete-btn"
                  disabled={deleting === f}
                  onClick={(e) => handleDelete(f, e)}
                  title="Delete this image"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="calibration-main">
          <div className="name-field">
            <label>Name</label>
            <input
              className="name-input"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              placeholder={selected ?? ''}
            />
          </div>
          <div className="side-toggle">
            <button className={localSide === 'front' ? 'active' : ''} onClick={() => setLocalSide('front')}>
              Front
            </button>
            <button className={localSide === 'back' ? 'active' : ''} onClick={() => setLocalSide('back')}>
              Back
            </button>
          </div>
          <div className="tag-field">
            <label>Tags</label>
            <TagInput tags={localTags} onChange={setLocalTags} />
          </div>
          <div className="calibration-pair">
            <QuadEditor
              imageSrc={templateSrcs[localSide]}
              quad={templateQuads[localSide]}
              readOnly
              label={`${localSide} template reference`}
              maxWidth={440}
              maxHeight={560}
            />
            {shirtSrc && (
              <QuadEditor
                key={selected + localSide}
                imageSrc={overlaySrc ?? shirtSrc}
                quad={localQuad}
                onChange={setLocalQuad}
                label={localName || selected}
                maxWidth={440}
                maxHeight={560}
              />
            )}
          </div>
        </div>
      </div>
      <div className="actions">
        <button onClick={handleReset} disabled={!isDirty}>
          Reset
        </button>
        {selected && (
          <span className={status === 'saving' ? 'status-pending' : 'status-ok'}>
            {status === 'saving' ? 'Saving…' : 'Saved'}
          </span>
        )}
      </div>
    </div>
  )
}
