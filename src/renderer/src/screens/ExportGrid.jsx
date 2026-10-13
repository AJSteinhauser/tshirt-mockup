import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import ScreenHeader from '../components/ScreenHeader.jsx'
import SideToggle from '../components/SideToggle.jsx'
import NoticeCard from '../components/NoticeCard.jsx'
import ExportCard from '../components/ExportCard.jsx'
import { BasketIcon, FolderIcon, ScissorsIcon, SpoolIcon } from '../components/ornaments.jsx'
import { composeShirtPreview } from '../lib/warp.js'
import { loadImageData } from '../lib/loadImage.js'
import { SHIRT_THUMB_DIM, loadShirtThumbnail } from '../lib/shirtThumbnails.js'
import { runWithConcurrency } from '../lib/runWithConcurrency.js'
import { rectToQuad } from '../lib/homography.js'
import { calibratedShirtsFor } from '../lib/setupStatus.js'

const PREVIEW_CONCURRENCY = 3
const PREVIEW_DEBOUNCE = 80
const PRELOAD_MARGIN = '600px 0px'
const NO_TAGS = []

export default function ExportGrid({
  active,
  templateQuads,
  shirtFiles,
  shirtsConfig,
  side,
  onSideChange,
  onNavigate,
  design,
  transform,
  onExported
}) {
  const templateQuad = templateQuads[side]

  const calibratedShirts = useMemo(
    () => calibratedShirtsFor(side, shirtFiles, shirtsConfig),
    [shirtFiles, shirtsConfig, side]
  )

  const [search, setSearch] = useState('')
  const [previews, setPreviews] = useState({})
  const [renderingCount, setRenderingCount] = useState(0)
  const [nearView, setNearView] = useState(() => new Set())
  const [selected, setSelected] = useState(() => new Set(calibratedShirts))
  const [exporting, setExporting] = useState(false)
  const [exportResult, setExportResult] = useState(null)
  const previewsRef = useRef(previews)
  previewsRef.current = previews
  const inFlight = useRef(new Map())
  const observerRef = useRef(null)

  const previewKey = useMemo(() => ({}), [design, transform, templateQuad, shirtsConfig])
  const latestPreviewKey = useRef(previewKey)
  latestPreviewKey.current = previewKey
  const designImageData = useMemo(() => design && loadImageData(design.dataUrl), [design])

  const observe = useCallback((el) => {
    if (!el) return
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) =>
          setNearView((prev) => {
            const next = new Set(prev)
            for (const entry of entries) {
              if (entry.isIntersecting) next.add(entry.target.dataset.filename)
              else next.delete(entry.target.dataset.filename)
            }
            return next
          }),
        { root: el.closest('main'), rootMargin: PRELOAD_MARGIN }
      )
    }
    const observer = observerRef.current
    observer.observe(el)
    return () => observer.unobserve(el)
  }, [])

  useEffect(() => () => observerRef.current?.disconnect(), [])

  useEffect(() => {
    setSelected(new Set(calibratedShirts))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calibratedShirts.join('|')])

  const visibleShirts = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return calibratedShirts
    return calibratedShirts.filter((f) => {
      const entry = shirtsConfig[f]
      const tags = entry?.tags ?? []
      const name = entry?.name ?? f
      return (
        f.toLowerCase().includes(q) ||
        name.toLowerCase().includes(q) ||
        tags.some((t) => t.toLowerCase().includes(q))
      )
    })
  }, [calibratedShirts, search, shirtsConfig])

  useEffect(() => {
    if (!active || !design || !transform || !templateQuad) return
    let stopped = false
    const timer = setTimeout(() => {
      const order = new Map(calibratedShirts.map((f, i) => [f, i]))
      const due = [...nearView]
        .filter((f) => order.has(f))
        .filter((f) => previewsRef.current[f]?.key !== previewKey && inFlight.current.get(f) !== previewKey)
        .sort((x, y) => order.get(x) - order.get(y))

      runWithConcurrency(due, PREVIEW_CONCURRENCY, async (filename) => {
        if (stopped) return
        inFlight.current.set(filename, previewKey)
        setRenderingCount((n) => n + 1)
        try {
          const [{ bitmap, scale }, sourceImageData] = await Promise.all([
            loadShirtThumbnail(filename, SHIRT_THUMB_DIM),
            designImageData
          ])
          if (latestPreviewKey.current !== previewKey) return
          const src = composeShirtPreview({
            shirtImage: bitmap,
            sourceImageData,
            transform,
            templateQuad,
            shirtQuad: shirtsConfig[filename].quad,
            scale
          })
          setPreviews((prev) => ({ ...prev, [filename]: { src, key: previewKey } }))
        } catch (err) {
          console.error(`Preview failed for ${filename}`, err)
        } finally {
          if (inFlight.current.get(filename) === previewKey) inFlight.current.delete(filename)
          setRenderingCount((n) => n - 1)
        }
      })
    }, PREVIEW_DEBOUNCE)
    return () => {
      stopped = true
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, previewKey, nearView, calibratedShirts])

  const toggle = useCallback((filename) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(filename)) next.delete(filename)
      else next.add(filename)
      return next
    })
  }, [])

  function selectAllVisible() {
    setSelected((prev) => new Set([...prev, ...visibleShirts]))
  }

  function selectNoneVisible() {
    setSelected((prev) => {
      const next = new Set(prev)
      visibleShirts.forEach((f) => next.delete(f))
      return next
    })
  }

  async function handleExport() {
    if (!design || !transform || !templateQuad || selected.size === 0) return
    setExporting(true)
    setExportResult(null)
    const result = await window.api.exportAll({
      designName: design.name,
      designDataUrl: design.dataUrl,
      templateQuads,
      designCorners: rectToQuad(transform),
      selectedFilenames: Array.from(selected)
    })
    setExportResult(result)
    setExporting(false)
    if (result.results.some((r) => r.ok)) onExported()
  }

  const allVisibleSelected = visibleShirts.length > 0 && visibleShirts.every((f) => selected.has(f))
  const noneVisibleSelected = visibleShirts.every((f) => !selected.has(f))
  const failures = exportResult?.results.filter((r) => !r.ok) ?? []
  const successCount = exportResult ? exportResult.results.length - failures.length : 0

  const header = (
    <ScreenHeader
      eyebrow="Studio · Gather & export"
      title={design ? `Gather “${design.name}”` : 'Gather & export'}
      hint={
        design &&
        `Tap a shirt to pin or unpin it. ${selected.size} of ${calibratedShirts.length} pinned${
          search ? ` · ${visibleShirts.length} shown` : ''
        }.`
      }
    >
      <SideToggle value={side} onChange={onSideChange} />
    </ScreenHeader>
  )

  if (!design || !transform) {
    return (
      <div className="screen">
        {header}
        <NoticeCard
          icon={<BasketIcon size={28} />}
          title="The basket’s empty"
          action={
            <button className="btn btn-primary" onClick={() => onNavigate('arrange')}>
              <ScissorsIcon size={16} /> Arrange a {side} design
            </button>
          }
        >
          <p>Place a design on the {side} template first, then come back to gather every mockup.</p>
        </NoticeCard>
      </div>
    )
  }

  return (
    <div className="screen">
      {header}

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Search names or tags…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-ghost" onClick={selectAllVisible} disabled={allVisibleSelected}>
          Pin all
        </button>
        <button className="btn btn-ghost" onClick={selectNoneVisible} disabled={noneVisibleSelected}>
          Unpin all
        </button>
        <AnimatePresence>
          {renderingCount > 0 && (
            <motion.span className="toolbar-status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SpoolIcon size={16} className="spin" /> stitching previews…
            </motion.span>
          )}
        </AnimatePresence>
        <button
          className="btn btn-primary toolbar-export"
          onClick={handleExport}
          disabled={exporting || selected.size === 0}
        >
          {exporting ? (
            <>
              <SpoolIcon size={16} className="spin" /> Exporting…
            </>
          ) : (
            `Export ${selected.size}`
          )}
        </button>
      </div>

      <AnimatePresence>
        {exportResult && (
          <motion.div
            className={`export-result ${failures.length ? 'has-failures' : ''}`}
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="export-result-row">
              <span>
                <strong>{successCount}</strong> of {exportResult.results.length} mockups folded neatly into{' '}
                <code>{exportResult.outputDir}</code>
              </span>
              <button className="btn btn-small" onClick={() => window.api.revealInFinder(exportResult.outputDir)}>
                <FolderIcon size={14} /> Open folder
              </button>
              <button className="btn btn-ghost btn-small" onClick={() => setExportResult(null)}>
                Dismiss
              </button>
            </div>
            {failures.length > 0 && (
              <ul>
                {failures.map((r) => (
                  <li key={r.filename} className="status-error">
                    {r.filename}: {r.error}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="export-grid">
        {visibleShirts.map((filename, i) => (
          <ExportCard
            key={filename}
            filename={filename}
            name={shirtsConfig[filename]?.name ?? filename}
            tags={shirtsConfig[filename]?.tags ?? NO_TAGS}
            src={previews[filename]?.src}
            selected={selected.has(filename)}
            index={i}
            onToggle={toggle}
            observe={observe}
          />
        ))}
      </div>

      {visibleShirts.length === 0 && <p className="hint">No shirts match “{search}”.</p>}
    </div>
  )
}
