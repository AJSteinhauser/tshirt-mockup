import { useId } from 'react'
import { motion } from 'motion/react'

const SIDES = ['front', 'back']

export default function SideToggle({ value, onChange }) {
  const pillId = useId()
  return (
    <div className="side-toggle" role="radiogroup" aria-label="Shirt side">
      {SIDES.map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={value === s}
          className={value === s ? 'active' : ''}
          onClick={() => onChange(s)}
        >
          {value === s && (
            <motion.span
              layoutId={pillId}
              className="side-toggle-pill"
              transition={{ type: 'spring', stiffness: 500, damping: 34 }}
            />
          )}
          <span className="side-toggle-label">{s}</span>
        </button>
      ))}
    </div>
  )
}
