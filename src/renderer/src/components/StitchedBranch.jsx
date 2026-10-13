import { useId, useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import {
  EmbroideredDaisy,
  EmbroideredForgetMeNot,
  EmbroideredLavender,
  EmbroideredRose,
  FishboneLeaf,
  FrenchKnots
} from './embroidery.jsx'

const VIEW_WIDTH = 480
const VIEW_HEIGHT = 96
const STEM = 'M10 62 C 80 40, 140 78, 220 58 S 360 38, 470 54'
const LEAF_SLOTS = 14
const BLOOMS = [
  { at: 0.1, Flower: EmbroideredDaisy, size: 0.8 },
  { at: 0.26, Flower: EmbroideredForgetMeNot, size: 1 },
  { at: 0.42, Flower: EmbroideredRose, size: 0.9 },
  { at: 0.57, Flower: EmbroideredLavender, size: 0.62, standing: true },
  { at: 0.72, Flower: EmbroideredDaisy, size: 0.7 },
  { at: 0.86, Flower: EmbroideredForgetMeNot, size: 0.9 },
  { at: 0.97, Flower: EmbroideredRose, size: 0.75 }
]
const GROW = { duration: 0.7, ease: 'easeOut' }

function pointOnStem(path, length, fraction) {
  const at = Math.max(0.5, Math.min(length - 0.5, fraction * length))
  const p = path.getPointAtLength(at)
  const ahead = path.getPointAtLength(Math.min(length, at + 0.5))
  const behind = path.getPointAtLength(Math.max(0, at - 0.5))
  return { x: p.x, y: p.y, angle: (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI }
}

export default function StitchedBranch({ progress, failedAt = [], bloom = false }) {
  const maskId = `branch-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const stemRef = useRef(null)
  const [stem, setStem] = useState(null)

  useLayoutEffect(() => {
    const path = stemRef.current
    const length = path.getTotalLength()
    setStem({ path, length })
  }, [])

  const leaves = stem
    ? Array.from({ length: LEAF_SLOTS }, (_, i) => {
        const at = (i + 0.6) / LEAF_SLOTS
        const side = i % 2 ? 1 : -1
        const p = pointOnStem(stem.path, stem.length, at)
        return { at, x: p.x, y: p.y, angle: p.angle + side * 58 + 90 }
      })
    : []
  const tip = stem && progress > 0 ? pointOnStem(stem.path, stem.length, progress) : null
  const blooms = stem ? BLOOMS.filter((b) => b.at <= progress + 0.001) : []

  return (
    <svg
      className="stitched-branch"
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      width="100%"
      aria-hidden="true"
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse">
          <motion.path
            d={STEM}
            stroke="#fff"
            strokeWidth="10"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: progress }}
            transition={GROW}
          />
        </mask>
      </defs>

      <path ref={stemRef} d={STEM} fill="none" stroke="var(--thread-soft)" strokeWidth="1" strokeDasharray="1 5" />
      <path
        d={STEM}
        mask={`url(#${maskId})`}
        fill="none"
        stroke="var(--moss)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="3 2"
      />

      {leaves.map(({ at, x, y, angle }) => (
        <motion.g key={at} initial="hidden" animate={progress >= at ? 'shown' : 'hidden'}>
          <FishboneLeaf x={x} y={y} angle={angle} size={1.05} />
        </motion.g>
      ))}

      {stem &&
        failedAt.map((at, i) => {
          const p = pointOnStem(stem.path, stem.length, at)
          return (
            <motion.g key={i} initial="hidden" animate="shown">
              <FrenchKnots color="var(--rose-deep)" points={[[p.x, p.y]]} />
            </motion.g>
          )
        })}

      {bloom &&
        blooms.map(({ at, Flower, size, standing }, i) => {
          const p = pointOnStem(stem.path, stem.length, at)
          return (
            <motion.g
              key={at}
              initial="hidden"
              animate="shown"
              variants={{ shown: { transition: { delayChildren: 0.25 + i * 0.16, staggerChildren: 0.03 } } }}
            >
              <Flower x={p.x} y={standing ? p.y + 2 : p.y} size={size} lean={standing ? 10 : undefined} />
            </motion.g>
          )
        })}

      {tip && !bloom && (
        <motion.g initial={false} animate={{ x: tip.x, y: tip.y }} transition={GROW}>
          <motion.g
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
          >
            <path d="M-2 4 L14 -18" stroke="var(--ink-soft)" strokeWidth="1.8" strokeLinecap="round" />
            <ellipse cx="12.4" cy="-15.6" rx="0.8" ry="2" transform="rotate(36 12.4 -15.6)" fill="var(--paper)" />
            <path d="M12.4 -15.6 C 20 -10, 16 0, 6 2" stroke="var(--rose-deep)" strokeWidth="0.9" fill="none" />
          </motion.g>
        </motion.g>
      )}
    </svg>
  )
}
