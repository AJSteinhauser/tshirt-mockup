import { memo } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Clothespin } from './ornaments.jsx'
import { markDeveloped } from '../lib/markDeveloped.js'

const MAX_STAGGERED_CARDS = 24

function tiltFor(filename) {
  let hash = 0
  for (const ch of filename) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return ((hash % 7) - 3) * 0.35
}

function ExportCard({ filename, name, tags, src, selected, index, onToggle, observe }) {
  const tilt = tiltFor(filename)
  return (
    <motion.button
      ref={observe}
      data-filename={filename}
      className={`export-card ${selected ? 'selected' : ''}`}
      aria-pressed={selected}
      aria-label={`${name} — ${selected ? 'pinned for export' : 'not pinned'}`}
      onClick={() => onToggle(filename)}
      initial={{ opacity: 0, y: 14, rotate: tilt * 2 }}
      animate={{
        opacity: 1,
        y: 0,
        rotate: tilt,
        transition: { type: 'spring', stiffness: 300, damping: 24, delay: Math.min(index, MAX_STAGGERED_CARDS) * 0.025 }
      }}
      whileHover={{ y: -4, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 26 }}
    >
      <AnimatePresence>
        {selected && (
          <motion.span
            className="export-card-pin"
            initial={{ y: -18, opacity: 0, rotate: -12 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -14, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 520, damping: 18 }}
          >
            <Clothespin />
          </motion.span>
        )}
      </AnimatePresence>
      <span className="export-card-media">
        <span className="export-card-photo">
          {src && <img src={src} alt="" draggable={false} onLoad={markDeveloped} />}
        </span>
        <span className="pin-chip">
          {selected ? (
            <>
              <span className="pin-chip-rest">✓ Pinned</span>
              <span className="pin-chip-hover">× Unpin</span>
            </>
          ) : (
            <>
              <span className="pin-chip-rest">Unpinned</span>
              <span className="pin-chip-hover">+ Pin</span>
            </>
          )}
        </span>
      </span>
      <span className="export-card-label">{name}</span>
      {tags.length > 0 && (
        <span className="export-card-tags">
          {tags.map((t) => (
            <span key={t} className="mini-tag">
              {t}
            </span>
          ))}
        </span>
      )}
    </motion.button>
  )
}

export default memo(ExportCard)
