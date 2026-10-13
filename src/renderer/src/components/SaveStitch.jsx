import { AnimatePresence, motion } from 'motion/react'
import { StitchCheck } from './ornaments.jsx'

export default function SaveStitch({ status }) {
  return (
    <span className={`save-stitch save-stitch-${status}`} aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={status}
          className="save-stitch-inner"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >
          {status === 'saving' ? (
            <>
              <span className="save-stitch-dots" />
              Stitching…
            </>
          ) : (
            <>
              <StitchCheck />
              Saved
            </>
          )}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
