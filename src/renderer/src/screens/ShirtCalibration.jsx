import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import QuadEditor from '../components/QuadEditor.jsx'
import TagInput from '../components/TagInput.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import SideToggle from '../components/SideToggle.jsx'
import SaveStitch from '../components/SaveStitch.jsx'
import DropZone from '../components/DropZone.jsx'
import ShirtListItem from '../components/ShirtListItem.jsx'
import NoticeCard from '../components/NoticeCard.jsx'
import QuadShortcutHints from '../components/QuadShortcutHints.jsx'
import { UploadIcon } from '../components/ornaments.jsx'
import { EmbroideredHoop, EmbroideredSprig } from '../components/embroidery.jsx'
import { composeShirtPreviewCanvas } from '../lib/warp.js'
import { loadDesignImageData } from '../lib/loadImage.js'
import { sameItems } from '../lib/sameItems.js'
import { useElementSize } from '../lib/useElementSize.js'
import { useIncrementalCount } from '../lib/useIncrementalCount.js'
import { evictShirtThumbnails, loadShirtWorkingImage, prefetchShirtWorkingImage } from '../lib/shirtThumbnails.js'

const AUTOSAVE_DELAY = 500
const LIST_PAGE_SIZE = 50
const PREFETCH_DELAY = 200
const EMPTY_SNAPSHOT = { quad: null, side: 'front', tags: [], name: '' }

function snapshotsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

async function composeOverlay({ working, quad, design, transform, templateQuad }) {
  if (!design || !transform || !templateQuad || !quad) return null
  const sourceImageData = await loadDesignImageData(design)
  return composeShirtPreviewCanvas({
    shirtImage: working.bitmap,
    sourceImageData,
    transform,
    templateQuad,
    shirtQuad: quad,
    scale: working.scale
  })
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
  const [committed, setCommitted] = useState(null)
  const [switching, setSwitching] = useState(false)
  const [localQuad, setLocalQuad] = useState(null)
  const [localSide, setLocalSide] = useState('front')
  const [localTags, setLocalTags] = useState([])
  const [localName, setLocalName] = useState('')
  const [initial, setInitial] = useState(EMPTY_SNAPSHOT)
  const [status, setStatus] = useState('saved') // 'saving' | 'saved'
  const [overlay, setOverlay] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [confirmingDelete, setConfirmingDelete] = useState(null)
  const renderedInputs = useRef(null)
  const lastSaved = useRef(new Map())
  const pendingSave = useRef(null)
  const selectedRef = useRef(selected)
  selectedRef.current = selected
  const placementRef = useRef(null)
  placementRef.current = { designs, transforms, templateQuads, shirtsConfig }
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

  const handleDelete = useCallback(
    async (filename) => {
      setConfirmingDelete(null)
      setDeleting(filename)
      const result = await window.api.deleteShirtImage(filename)
      evictShirtThumbnails(filename)
      onShirtFilesChanged(result.files)
      onShirtsConfigChanged(result.shirts)
      if (selectedRef.current === filename) setSelected(result.files[0] ?? null)
      setDeleting(null)
    },
    [onShirtFilesChanged, onShirtsConfigChanged]
  )

  const handleKeep = useCallback(() => setConfirmingDelete(null), [])

  // Everything about the clicked shirt (photo, quad, name, tags, overlay) is prepared first and
  // committed in one render, so the editor never shows a mix of the old and new shirt. The snapshot
  // is taken only here — not when `shirtsConfig` updates from our own autosave — so "Undo changes"
  // reverts to how the shirt was when first opened, not to whatever was last autosaved.
  useEffect(() => {
    if (!selected) {
      setCommitted(null)
      setSwitching(false)
      return
    }
    let cancelled = false
    setSwitching(true)
    async function load() {
      const working = await loadShirtWorkingImage(selected)
      const { designs, transforms, templateQuads, shirtsConfig } = placementRef.current
      const entry = shirtsConfig[selected]
      const snapshot = {
        quad: entry?.quad ?? null,
        side: entry?.side ?? 'front',
        tags: entry?.tags ?? [],
        name: entry?.name ?? selected
      }
      const placement = {
        design: designs[snapshot.side],
        transform: transforms[snapshot.side],
        templateQuad: templateQuads[snapshot.side]
      }
      const initialOverlay = await composeOverlay({ working, quad: snapshot.quad, ...placement })
      if (cancelled) return
      pendingSave.current?.()
      lastSaved.current.set(selected, JSON.stringify(snapshot))
      renderedInputs.current = [placement.design, placement.transform, placement.templateQuad, working, snapshot.quad]
      setCommitted({ filename: selected, working })
      setLocalQuad(snapshot.quad)
      setLocalSide(snapshot.side)
      setLocalTags(snapshot.tags)
      setLocalName(snapshot.name)
      setInitial(snapshot)
      setOverlay(initialOverlay)
      setSwitching(false)
    }
    load().catch((err) => {
      console.error(`Could not open ${selected}`, err)
      if (!cancelled) setSwitching(false)
    })
    return () => {
      cancelled = true
    }
  }, [selected])

  const activeFile = committed?.filename ?? null
  const working = committed?.working ?? null
  const design = designs[localSide]
  const transform = transforms[localSide]
  const templateQuad = templateQuads[localSide]

  useEffect(() => {
    let cancelled = false
    const inputs = [design, transform, templateQuad, working, localQuad]
    async function run() {
      if (!active || !working || sameItems(renderedInputs.current, inputs)) return
      const canvas = await composeOverlay({ working, quad: localQuad, design, transform, templateQuad })
      if (cancelled) return
      renderedInputs.current = inputs
      setOverlay(canvas)
    }
    const timer = setTimeout(run, 60)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [active, design, transform, templateQuad, working, localQuad])

  useEffect(() => {
    if (!activeFile) return
    const partial = { quad: localQuad, side: localSide, tags: localTags, name: localName.trim() || activeFile }
    const serialized = JSON.stringify(partial)
    if (serialized === lastSaved.current.get(activeFile)) {
      setStatus('saved')
      return
    }
    setStatus('saving')
    const save = async () => {
      clearTimeout(timer)
      pendingSave.current = null
      lastSaved.current.set(activeFile, serialized)
      await window.api.saveShirtMeta(activeFile, partial)
      onSaved(activeFile, partial)
      setStatus('saved')
    }
    const timer = setTimeout(save, AUTOSAVE_DELAY)
    pendingSave.current = save
    return () => {
      clearTimeout(timer)
      if (pendingSave.current === save) pendingSave.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localQuad, localSide, localTags, localName, activeFile])

  useEffect(() => {
    if (!activeFile) return
    const index = shirtFiles.indexOf(activeFile)
    const timer = setTimeout(() => {
      ;[shirtFiles[index + 1], shirtFiles[index - 1]].filter(Boolean).forEach(prefetchShirtWorkingImage)
    }, PREFETCH_DELAY)
    return () => clearTimeout(timer)
  }, [activeFile, shirtFiles])

  function handleReset() {
    setLocalQuad(initial.quad)
    setLocalSide(initial.side)
    setLocalTags(initial.tags)
    setLocalName(initial.name)
  }

  const current = { quad: localQuad, side: localSide, tags: localTags, name: localName }
  const isDirty = !snapshotsEqual(current, initial)

  const calibratedCount = useMemo(
    () => shirtFiles.filter((f) => shirtsConfig[f]?.quad).length,
    [shirtFiles, shirtsConfig]
  )

  const selectedIndex = shirtFiles.indexOf(selected)
  const { shown, hasMore, sentinelRef } = useIncrementalCount(shirtFiles.length, { pageSize: LIST_PAGE_SIZE })
  const listedShirts = shirtFiles.slice(0, Math.max(shown, selectedIndex + 1))

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
          <div className="shirt-list" data-scroll-root>
            <AnimatePresence initial={false}>
              {listedShirts.map((f) => (
                <ShirtListItem
                  key={f}
                  filename={f}
                  name={shirtsConfig[f]?.name ?? f}
                  calibrated={Boolean(shirtsConfig[f]?.quad)}
                  side={shirtsConfig[f]?.side}
                  active={f === selected}
                  confirming={confirmingDelete === f}
                  deleting={deleting === f}
                  onSelect={setSelected}
                  onAskDelete={setConfirmingDelete}
                  onKeep={handleKeep}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
            {hasMore && <div ref={sentinelRef} className="list-sentinel" />}
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
                  placeholder={activeFile ?? ''}
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
            <div className={`calibration-pair ${switching ? 'is-switching' : ''}`}>
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
                  {committed && (
                    <QuadEditor
                      key={committed.filename + localSide}
                      image={overlay ?? committed.working.bitmap}
                      naturalSize={{ width: committed.working.width, height: committed.working.height }}
                      quad={localQuad}
                      onChange={setLocalQuad}
                      label={localName || committed.filename}
                      maxWidth={shirtSlot.width}
                      maxHeight={shirtSlot.height}
                    />
                  )}
                </div>
              </div>
            </div>
            <QuadShortcutHints />
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
