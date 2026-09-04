import { useEffect, useMemo, useState } from 'react'
import { computeHomography, applyHomography, rectToQuad } from '../lib/homography.js'
import { warpImageIntoQuad } from '../lib/warp.js'
import { loadImageElement } from '../lib/loadImage.js'

const THUMB_MAX_DIM = 280

export default function ExportGrid({
  templateQuads,
  shirtFiles,
  shirtsConfig,
  side,
  design,
  transform
}) {
  const templateQuad = templateQuads[side]

  const calibratedShirts = useMemo(
    () => shirtFiles.filter((f) => shirtsConfig[f]?.quad && (shirtsConfig[f]?.side ?? 'front') === side),
    [shirtFiles, shirtsConfig, side]
  )

  const [search, setSearch] = useState('')
  const [previews, setPreviews] = useState({})
  const [loadingPreviews, setLoadingPreviews] = useState(false)
  const [selected, setSelected] = useState(() => new Set(calibratedShirts))
  const [exporting, setExporting] = useState(false)
  const [exportResult, setExportResult] = useState(null)

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
    let cancelled = false
    async function run() {
      if (!design || !transform || !templateQuad || calibratedShirts.length === 0) {
        setPreviews({})
        return
      }
      setLoadingPreviews(true)

      const designImg = await loadImageElement(design.dataUrl)
      const designCanvas = document.createElement('canvas')
      designCanvas.width = designImg.width
      designCanvas.height = designImg.height
      const designCtx = designCanvas.getContext('2d')
      designCtx.drawImage(designImg, 0, 0)
      const sourceImageData = designCtx.getImageData(0, 0, designImg.width, designImg.height)
      const designCorners = rectToQuad(transform)

      const next = {}
      await Promise.all(
        calibratedShirts.map(async (filename) => {
          const shirtEntry = shirtsConfig[filename]
          const dataUrl = await window.api.getShirtImage(filename)
          const shirtImg = await loadImageElement(dataUrl)
          if (cancelled) return

          const scale = Math.min(1, THUMB_MAX_DIM / Math.max(shirtImg.width, shirtImg.height))
          const canvas = document.createElement('canvas')
          canvas.width = Math.round(shirtImg.width * scale)
          canvas.height = Math.round(shirtImg.height * scale)
          const ctx = canvas.getContext('2d')
          ctx.drawImage(shirtImg, 0, 0, canvas.width, canvas.height)

          const templateToShirt = computeHomography(templateQuad, shirtEntry.quad)
          const dstQuad = designCorners
            .map((p) => applyHomography(templateToShirt, p))
            .map((p) => ({ x: p.x * scale, y: p.y * scale }))
          const clipQuad = shirtEntry.quad.map((p) => ({ x: p.x * scale, y: p.y * scale }))

          warpImageIntoQuad({
            destCtx: ctx,
            destWidth: canvas.width,
            destHeight: canvas.height,
            sourceImageData,
            dstQuad,
            clipQuad
          })

          next[filename] = canvas.toDataURL('image/png')
        })
      )

      if (!cancelled) {
        setPreviews(next)
        setLoadingPreviews(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [design, transform, templateQuad, shirtsConfig, calibratedShirts])

  function toggle(filename) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(filename)) next.delete(filename)
      else next.add(filename)
      return next
    })
  }

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
    const designCorners = rectToQuad(transform)
    const result = await window.api.exportAll({
      designName: design.name,
      designDataUrl: design.dataUrl,
      templateQuads,
      designCorners,
      selectedFilenames: Array.from(selected)
    })
    setExportResult(result)
    setExporting(false)
  }

  const allVisibleSelected = visibleShirts.length > 0 && visibleShirts.every((f) => selected.has(f))
  const noneVisibleSelected = visibleShirts.every((f) => !selected.has(f))

  return (
    <div className="screen">
      <h2>4. Export — {side}</h2>

      {!design || !transform ? (
        <p className="hint">Place a {side} design on the template first.</p>
      ) : (
        <>
          <p className="hint">
            Click a shirt to include or exclude it, then export. {selected.size}/
            {calibratedShirts.length} selected
            {search && ` (${visibleShirts.length} shown)`}.
          </p>
          <div className="actions">
            <input
              className="search-input"
              placeholder="search tags or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button onClick={selectAllVisible} disabled={allVisibleSelected}>
              Select all visible
            </button>
            <button onClick={selectNoneVisible} disabled={noneVisibleSelected}>
              Select none visible
            </button>
            <button onClick={handleExport} disabled={exporting || selected.size === 0}>
              {exporting ? 'Exporting…' : `Export selected (${selected.size})`}
            </button>
            {loadingPreviews && <span className="hint">rendering previews…</span>}
          </div>

          <div className="export-grid">
            {visibleShirts.map((filename) => (
              <button
                key={filename}
                className={`export-card ${selected.has(filename) ? 'selected' : ''}`}
                onClick={() => toggle(filename)}
              >
                <span className="export-card-check">{selected.has(filename) ? '✓' : ''}</span>
                {previews[filename] ? (
                  <img src={previews[filename]} alt={filename} />
                ) : (
                  <div className="export-card-placeholder" />
                )}
                <span className="export-card-label">{shirtsConfig[filename]?.name ?? filename}</span>
                {(shirtsConfig[filename]?.tags ?? []).length > 0 && (
                  <span className="export-card-tags">
                    {shirtsConfig[filename].tags.join(', ')}
                  </span>
                )}
              </button>
            ))}
          </div>

          {visibleShirts.length === 0 && (
            <p className="hint">No shirts match “{search}”.</p>
          )}
        </>
      )}

      {exportResult && (
        <div className="export-result">
          <p>
            Wrote {exportResult.results.filter((r) => r.ok).length}/{exportResult.results.length}{' '}
            images to <code>{exportResult.outputDir}</code>
          </p>
          <ul>
            {exportResult.results
              .filter((r) => !r.ok)
              .map((r) => (
                <li key={r.filename} className="status-error">
                  {r.filename}: {r.error}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  )
}
