import { memo } from 'react'
import { motion } from 'motion/react'
import ShirtThumb from './ShirtThumb.jsx'

function ShirtListItem({ filename, name, calibrated, side, active, confirming, deleting, onSelect, onAskDelete, onKeep, onDelete }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      role="button"
      tabIndex={0}
      className={`shirt-list-item ${active ? 'active' : ''}`}
      onClick={() => onSelect(filename)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(filename)}
    >
      <ShirtThumb filename={filename} />
      <span className="shirt-list-text">
        <span className="shirt-list-name">{name}</span>
        <span className="shirt-list-meta">
          <span className={calibrated ? 'dot dot-ok' : 'dot dot-pending'} />
          {calibrated ? (side === 'back' ? 'Back' : 'Front') : 'Needs calibrating'}
        </span>
      </span>
      {confirming ? (
        <span className="shirt-delete-confirm" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn btn-danger btn-small" onClick={() => onDelete(filename)}>
            Remove
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={onKeep}>
            Keep
          </button>
        </span>
      ) : (
        <button
          type="button"
          className="shirt-delete-btn"
          disabled={deleting}
          onClick={(e) => {
            e.stopPropagation()
            onAskDelete(filename)
          }}
          title="Remove this photo"
          aria-label={`Remove ${name}`}
        >
          ×
        </button>
      )}
    </motion.div>
  )
}

export default memo(ShirtListItem)
