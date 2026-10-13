import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import StitchedBranch from './StitchedBranch.jsx'
import ShirtThumb from './ShirtThumb.jsx'
import { EmbroideredHoop } from './embroidery.jsx'
import { FolderIcon } from './ornaments.jsx'

const ANNOUNCE_EVERY = 10

function LiveHoop({ filename, previewSrc, finished }) {
  return (
    <div className="live-hoop">
      <AnimatePresence mode="popLayout" initial={false}>
        {finished ? (
          <motion.div key="posy" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}>
            <EmbroideredHoop size={150} />
          </motion.div>
        ) : (
          <motion.div
            key="shirt"
            className="live-hoop-frame"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
          >
            <span className="live-hoop-screw" />
            <div className="live-hoop-fabric">
              <AnimatePresence initial={false}>
                {filename && (
                  <motion.div
                    key={filename}
                    className="live-hoop-shirt"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                  >
                    {previewSrc ? <img src={previewSrc} alt="" draggable={false} /> : <ShirtThumb filename={filename} />}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <motion.svg
              className="live-hoop-needle"
              width="54"
              height="54"
              viewBox="0 0 60 60"
              aria-hidden="true"
              animate={{ x: [0, -5, 2, -3, 0], y: [0, 7, 2, 9, 0] }}
              transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <path d="M8 52 L48 12" stroke="var(--ink-soft)" strokeWidth="2.6" strokeLinecap="round" />
              <ellipse cx="44" cy="16" rx="1.2" ry="2.8" transform="rotate(45 44 16)" fill="var(--paper)" />
              <path d="M44 16 C 54 22, 50 40, 36 44" stroke="var(--rose-deep)" strokeWidth="1.2" fill="none" />
            </motion.svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ExportDialog({ payload, shirtsConfig, previews, onClose, onExported }) {
  const total = payload.selectedFilenames.length
  const [done, setDone] = useState(0)
  const [current, setCurrent] = useState(null)
  const [failures, setFailures] = useState([])
  const [result, setResult] = useState(null)
  const [stopping, setStopping] = useState(false)
  const [showFailures, setShowFailures] = useState(false)
  const dialogRef = useRef(null)
  const finished = Boolean(result)

  useEffect(() => {
    dialogRef.current?.focus()
    const unsubscribe = window.api.onExportProgress((progress) => {
      if (progress.phase === 'start') {
        setCurrent(progress.filename)
        return
      }
      setDone(progress.index + 1)
      if (!progress.ok) {
        setFailures((prev) => [...prev, { ...progress, at: (progress.index + 1) / progress.total }])
      }
    })
    window.api.exportAll(payload).then((exportResult) => {
      setResult(exportResult)
      if (exportResult.results.some((r) => r.ok)) onExported(exportResult)
    })
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function requestStop() {
    if (stopping || finished) return
    setStopping(true)
    window.api.stopExport()
  }

  function close() {
    if (finished) onClose(result)
  }

  const escapeRef = useRef(null)
  escapeRef.current = () => (finished ? close() : requestStop())

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key !== 'Escape') return
      e.preventDefault()
      escapeRef.current()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const successCount = result ? result.results.filter((r) => r.ok).length : done - failures.length
  const progress = total ? done / total : 0
  const designName = payload.designName
  const announced = Math.floor(done / ANNOUNCE_EVERY) * ANNOUNCE_EVERY

  let title = (
    <>
      Stitching <em>{designName}</em>…
    </>
  )
  if (result?.stopped) title = `Stopped: ${successCount} of ${total} stitched`
  else if (finished && failures.length === 0) title = `All ${total} mockups stitched`
  else if (finished) title = `${successCount} of ${total} stitched`

  return (
    <motion.div
      className="export-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <motion.div
        ref={dialogRef}
        className="export-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
        tabIndex={-1}
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      >
        <span className="eyebrow">{finished ? 'Finished' : 'Exporting'}</span>
        <h2 id="export-dialog-title">{title}</h2>
        <p className="export-dialog-count">
          {finished ? (
            <>
              Saved to <code>{result.outputDir}</code>
            </>
          ) : (
            <>
              <strong>{done}</strong> of {total}
              {current && <span className="export-dialog-current"> · {shirtsConfig[current]?.name ?? current}</span>}
            </>
          )}
        </p>
        <span className="visually-hidden" aria-live="polite">
          {finished ? `Finished, ${successCount} of ${total} stitched` : `${announced} of ${total} stitched`}
        </span>

        <LiveHoop filename={current} previewSrc={previews[current]?.src} finished={finished} />

        <StitchedBranch
          progress={finished && !result.stopped ? 1 : progress}
          failedAt={failures.map((f) => f.at)}
          bloom={finished}
        />

        {finished && failures.length > 0 && (
          <div className="export-dialog-failures">
            <button className="btn btn-ghost btn-small" onClick={() => setShowFailures((v) => !v)}>
              {failures.length} couldn’t be stitched {showFailures ? '▴' : '▾'}
            </button>
            {showFailures && (
              <ul>
                {failures.map((f) => (
                  <li key={f.filename} className="status-error">
                    {shirtsConfig[f.filename]?.name ?? f.filename}: {f.error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="export-dialog-actions">
          {finished ? (
            <>
              <button className="btn btn-ghost" onClick={close}>
                Done
              </button>
              {successCount > 0 && (
                <button className="btn btn-primary" onClick={() => window.api.revealInFinder(result.outputDir)}>
                  <FolderIcon size={15} /> Open folder
                </button>
              )}
            </>
          ) : (
            <button className="btn btn-ghost" onClick={requestStop} disabled={stopping}>
              {stopping ? 'Stopping after this one…' : 'Stop stitching'}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
