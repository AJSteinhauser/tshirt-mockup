import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import QuadEditor from '../components/QuadEditor.jsx'
import TagInput from '../components/TagInput.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import SideToggle from '../components/SideToggle.jsx'
import SaveStitch from '../components/SaveStitch.jsx'
import DropZone from '../components/DropZone.jsx'
import ShirtThumb from '../components/ShirtThumb.jsx'
import NoticeCard from '../components/NoticeCard.jsx'
import { UploadIcon } from '../components/ornaments.jsx'
import { EmbroideredHoop, EmbroideredSprig } from '../components/embroidery.jsx'
import { composeShirtPreview } from '../lib/warp.js'
import { loadImageData, loadImageElement } from '../lib/loadImage.js'
import { sameItems } from '../lib/sameItems.js'
import { useElementSize } from '../lib/useElementSize.js'
import { evictShirtThumbnails } from '../lib/shirtThumbnails.js'

const AUTOSAVE_DELAY = 500
const EMPTY_SNAPSHOT = { quad: null, side: 'front', tags: [], name: '' }

function snapshotsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

export default function ShirtCalibration({
  active,
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
  const [confirmingDelete, setConfirmingDelete] = useState(null)
  const renderedInputs = useRef(null)
  const [templateSlotRef, templateSlot] = useElementSize()
  const [shirtSlotRef, shirtSlot] = useElementSize()

  useEffect(() => {
    if (!selected && shirtFiles.length > 0) setSelected(shirtFiles[0])
  }, [shirtFiles, selected])

  async function addShirts(importer) {
    setUploading(true)
    const newList = await importer()
    const added = newList.filter((f) => !shirtFiles.includes(f))
    onShirtFilesChanged(newList)
    if (added.length > 0) setSelected(added[0])
    setUploading(false)
  }

  async function handleDelete(filename) {
    setConfirmingDelete(null)
    setDeleting(filename)
    const result = await window.api.deleteShirtImage(filename)
    evictShirtThumbnails(filename)
    onShirtFilesChanged(result.files)
    onShirtsConfigChanged(result.shirts)
    if (selected === filename) setSelected(result.files[0] ?? null)
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
    const inputs = [design, transform, templateQuad, shirtSrc, localQuad]
    async function run() {
      if (!active || sameItems(renderedInputs.current, inputs)) return
      if (!design || !transform || !templateQuad || !shirtSrc || !localQuad) {
        setOverlaySrc(null)
        return
      }

      const [shirtImage, sourceImageData] = await Promise.all([
        loadImageElement(shirtSrc),
        loadImageData(design.dataUrl)
      ])
      if (cancelled) return
      const src = composeShirtPreview({ shirtImage, sourceImageData, transform, templateQuad, shirtQuad: localQuad })
      if (cancelled) return
      renderedInputs.current = inputs
      setOverlaySrc(src)
    }
    const timer = setTimeout(run, 60)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [active, design, transform, templateQuad, shirtSrc, localQuad])

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
    <div className="screen screen-fit">
      <ScreenHeader
        eyebrow="Workroom · Mockups"
        title="Calibrate your mockups"
        hint={`Match each photo’s corners to the template’s print area · ${calibratedCount} of ${shirtFiles.length} calibrated`}
      >
        {selected && (
          <>
            <SaveStitch status={status} />
            <button className="btn btn-ghost" onClick={handleReset} disabled={!isDirty}>
              Undo changes
            </button>
          </>
        )}
      </ScreenHeader>
      <div className="calibration-layout">
        <DropZone onFiles={(files) => addShirts(() => window.api.importShirtImages(files))} className="shirt-list-panel paper-card">
          <button
            className="upload-shirts-btn"
            onClick={() => addShirts(window.api.uploadShirtImages)}
            disabled={uploading}
          >
            <UploadIcon size={16} />
            {uploading ? 'Adding…' : 'Add or drop photos'}
          </button>
          <div className="shirt-list">
            <AnimatePresence initial={false}>
              {shirtFiles.map((f) => (
                <motion.div
                  key={f}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  role="button"
                  tabIndex={0}
                  className={`shirt-list-item ${f === selected ? 'active' : ''}`}
                  onClick={() => setSelected(f)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelected(f)}
                >
                  <ShirtThumb filename={f} />
                  <span className="shirt-list-text">
                    <span className="shirt-list-name">{shirtsConfig[f]?.name ?? f}</span>
                    <span className="shirt-list-meta">
                      <span className={shirtsConfig[f]?.quad ? 'dot dot-ok' : 'dot dot-pending'} />
                      {shirtsConfig[f]?.quad ? shirtsConfig[f]?.side ?? 'front' : 'needs calibrating'}
                    </span>
                  </span>
                  {confirmingDelete === f ? (
                    <span className="shirt-delete-confirm" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="btn btn-danger btn-small" onClick={() => handleDelete(f)}>
                        Remove
                      </button>
                      <button type="button" className="btn btn-ghost btn-small" onClick={() => setConfirmingDelete(null)}>
                        Keep
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="shirt-delete-btn"
                      disabled={deleting === f}
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmingDelete(f)
                      }}
                      title="Remove this photo"
                      aria-label={`Remove ${shirtsConfig[f]?.name ?? f}`}
                    >
                      ×
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </DropZone>

        {selected ? (
          <div className="calibration-main">
            <div className="calibration-fields paper-card">
              <div className="name-field">
                <label htmlFor="shirt-name">Name</label>
                <input
                  id="shirt-name"
                  className="name-input"
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  placeholder={selected}
                />
              </div>
              <div className="field">
                <label>Side</label>
                <SideToggle value={localSide} onChange={setLocalSide} />
              </div>
              <div className="tag-field">
                <label>Tags</label>
                <TagInput tags={localTags} onChange={setLocalTags} />
              </div>
            </div>
            <div className="calibration-pair">
              <div className="hoop-card hoop-fill">
                <EmbroideredSprig variant="lavender" />
                <div ref={templateSlotRef} className="canvas-slot">
                  <QuadEditor
                    imageSrc={templateSrcs[localSide]}
                    quad={templateQuads[localSide]}
                    readOnly
                    label={`${localSide} template`}
                    maxWidth={templateSlot.width}
                    maxHeight={templateSlot.height}
                  />
                </div>
              </div>
              <div className="hoop-card hoop-fill">
                <EmbroideredSprig variant="rosebud" />
                <div ref={shirtSlotRef} className="canvas-slot">
                  {shirtSrc && (
                    <QuadEditor
                      key={selected + localSide}
                      imageSrc={overlaySrc ?? shirtSrc}
                      quad={localQuad}
                      onChange={setLocalQuad}
                      label={localName || selected}
                      maxWidth={shirtSlot.width}
                      maxHeight={shirtSlot.height}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <NoticeCard icon={<EmbroideredHoop size={96} />} title="No mockups yet">
            <p>Drop lifestyle photos of your blank shirts into the list, or use “Add or drop photos”.</p>
          </NoticeCard>
        )}
      </div>
    </div>
  )
}
