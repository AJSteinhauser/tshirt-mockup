import { useId } from 'react'
import { motion } from 'motion/react'
import ShirtThumb from './ShirtThumb.jsx'
import { Clothespin } from './ornaments.jsx'
import { useIncrementalCount } from '../lib/useIncrementalCount.js'

const FILMSTRIP_PAGE_SIZE = 40

export default function Filmstrip({ shirts, shirtsConfig, value, onChange }) {
  const ringId = useId()
  const { shown, hasMore, sentinelRef } = useIncrementalCount(shirts.length, { pageSize: FILMSTRIP_PAGE_SIZE })
  const listed = shirts.slice(0, Math.max(shown, shirts.indexOf(value) + 1))

  return (
    <div className="filmstrip" data-scroll-root role="listbox" aria-label="Preview shirt">
      {listed.map((f) => (
        <button
          key={f}
          type="button"
          role="option"
          aria-selected={f === value}
          className={`filmstrip-item ${f === value ? 'active' : ''}`}
          title={shirtsConfig[f]?.name ?? f}
          onClick={() => onChange(f)}
        >
          <ShirtThumb filename={f} />
          {f === value && (
            <motion.span
              layoutId={ringId}
              className="filmstrip-ring"
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            >
              <span className="filmstrip-pin">
                <Clothespin size={18} />
              </span>
            </motion.span>
          )}
        </button>
      ))}
      {hasMore && <div ref={sentinelRef} className="list-sentinel" />}
    </div>
  )
}
