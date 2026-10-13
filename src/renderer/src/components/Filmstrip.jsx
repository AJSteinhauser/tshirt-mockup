import { useId } from 'react'
import { motion } from 'motion/react'
import ShirtThumb from './ShirtThumb.jsx'

export default function Filmstrip({ shirts, shirtsConfig, value, onChange }) {
  const ringId = useId()
  return (
    <div className="filmstrip" role="listbox" aria-label="Preview shirt">
      {shirts.map((f) => (
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
            />
          )}
        </button>
      ))}
    </div>
  )
}
