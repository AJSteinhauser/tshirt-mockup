import { useId } from 'react'
import { motion } from 'motion/react'

const SATIN_GAP = 1.25

function useSvgId() {
  return `stitch-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
}

export const stitchIn = {
  hidden: { opacity: 0, scale: 0.4 },
  shown: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 380, damping: 20 } }
}

const threadIn = {
  hidden: { pathLength: 0 },
  shown: { pathLength: 1, transition: { duration: 0.5, ease: 'easeInOut' } }
}

function petalPath(length, width) {
  return `M0 0 C ${-width} ${-length * 0.3}, ${-width} ${-length * 0.85}, 0 ${-length} C ${width} ${-length * 0.85}, ${width} ${-length * 0.3}, 0 0 Z`
}

function SatinPetal({ length, width, color, edge, angle = 0 }) {
  const clipId = useSvgId()
  const d = petalPath(length, width)
  const rows = Math.ceil(length / SATIN_GAP)
  return (
    <motion.g variants={stitchIn}>
      <g transform={`rotate(${angle})`}>
        <clipPath id={clipId}>
          <path d={d} />
        </clipPath>
        <path d={d} fill={color} />
        <g clipPath={`url(#${clipId})`} stroke="#fff" strokeOpacity="0.28" strokeWidth="0.55">
          {Array.from({ length: rows }, (_, i) => {
            const y = -i * SATIN_GAP
            return <line key={i} x1={-width} y1={y + 0.6} x2={width} y2={y - 0.6} />
          })}
        </g>
        <path d={d} fill="none" stroke={edge} strokeWidth="0.6" />
      </g>
    </motion.g>
  )
}

export function FrenchKnots({ color, points }) {
  return (
    <motion.g variants={stitchIn}>
      {points.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="1.35" fill={color} />
          <circle cx={x - 0.4} cy={y - 0.45} r="0.45" fill="#fff" fillOpacity="0.55" />
        </g>
      ))}
    </motion.g>
  )
}

export function RunningStitch({ d, color = 'var(--moss)', width = 1.2 }) {
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeDasharray="2.6 1.8"
      variants={threadIn}
    />
  )
}

export function FishboneLeaf({ x, y, angle, size = 1 }) {
  const length = 9 * size
  const width = 3.6 * size
  const clipId = useSvgId()
  const d = petalPath(length, width)
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <motion.g variants={stitchIn}>
        <clipPath id={clipId}>
          <path d={d} />
        </clipPath>
        <path d={d} fill="var(--sage)" />
        <g clipPath={`url(#${clipId})`} stroke="#4f5c31" strokeOpacity="0.45" strokeWidth="0.5">
          {Array.from({ length: Math.ceil(length / 1.6) }, (_, i) => {
            const y0 = -i * 1.6
            return (
              <g key={i}>
                <line x1="0" y1={y0} x2={-width} y2={y0 - 2.2} />
                <line x1="0" y1={y0} x2={width} y2={y0 - 2.2} />
              </g>
            )
          })}
        </g>
        <line x1="0" y1="0" x2="0" y2={-length} stroke="#4f5c31" strokeOpacity="0.6" strokeWidth="0.5" />
      </motion.g>
    </g>
  )
}

export function EmbroideredDaisy({ x = 0, y = 0, size = 1 }) {
  const petals = [0, 45, 90, 135, 180, 225, 270, 315]
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      {petals.map((angle) => (
        <SatinPetal key={angle} angle={angle} length={10} width={3.4} color="var(--cream)" edge="#d9ccb4" />
      ))}
      <FrenchKnots color="var(--butter)" points={[[0, 0], [-1.6, -1.3], [1.6, -1.2], [-1.5, 1.4], [1.5, 1.4], [0, -2.2], [0, 2.2]]} />
    </g>
  )
}

export function EmbroideredRose({ x = 0, y = 0, size = 1 }) {
  const petals = [0, 72, 144, 216, 288]
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      {petals.map((angle) => (
        <SatinPetal key={angle} angle={angle} length={8.5} width={4.6} color="var(--rose-deep)" edge="#8e4234" />
      ))}
      {petals.map((angle) => (
        <SatinPetal key={`inner-${angle}`} angle={angle + 36} length={5} width={3} color="var(--rose)" edge="#b5584a" />
      ))}
      <FrenchKnots color="#8e4234" points={[[0, 0]]} />
    </g>
  )
}

export function EmbroideredForgetMeNot({ x = 0, y = 0, size = 1 }) {
  const petals = [0, 72, 144, 216, 288]
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      {petals.map((angle) => (
        <SatinPetal key={angle} angle={angle} length={5.5} width={3.2} color="var(--forget-me-not)" edge="#6f88a8" />
      ))}
      <FrenchKnots color="var(--butter)" points={[[0, 0]]} />
    </g>
  )
}

export function EmbroideredLavender({ x = 0, y = 0, size = 1, lean = 0 }) {
  const buds = [0, 1, 2, 3, 4, 5]
  return (
    <g transform={`translate(${x} ${y}) scale(${size}) rotate(${lean})`}>
      <RunningStitch d="M0 0 V-26" color="var(--sage)" />
      {buds.map((i) => (
        <g key={i} transform={`rotate(${i % 2 ? 20 : -20} ${i % 2 ? 1.6 : -1.6} ${-26 + i * 2.6})`}>
          <motion.ellipse
            variants={stitchIn}
            cx={i % 2 ? 1.6 : -1.6}
            cy={-26 + i * 2.6}
            rx="1.5"
            ry="2.4"
            fill="none"
            stroke={i % 2 ? 'var(--lavender)' : 'var(--lavender-deep)'}
            strokeWidth="1.1"
          />
        </g>
      ))}
    </g>
  )
}

function Embroidery({ width, height, viewBox, animate, delay = 0, className, children }) {
  return (
    <motion.svg
      width={width}
      height={height}
      viewBox={viewBox}
      className={className}
      aria-hidden="true"
      initial={animate ? 'hidden' : false}
      animate="shown"
      variants={{ shown: { transition: { staggerChildren: 0.022, delayChildren: delay } } }}
    >
      {children}
    </motion.svg>
  )
}

function Posy() {
  return (
    <>
      <RunningStitch d="M60 92 C 58 80, 50 72, 44 62" />
      <RunningStitch d="M60 92 C 61 78, 61 66, 60 56" />
      <RunningStitch d="M60 92 C 64 80, 72 72, 77 63" />
      <FishboneLeaf x={52} y={80} angle={-55} />
      <FishboneLeaf x={68} y={80} angle={55} />
      <FishboneLeaf x={60} y={72} angle={-12} size={0.8} />
      <EmbroideredLavender x={36} y={84} lean={-18} size={0.95} />
      <EmbroideredLavender x={85} y={84} lean={18} size={0.95} />
      <EmbroideredDaisy x={44} y={60} size={0.95} />
      <EmbroideredDaisy x={78} y={61} size={0.85} />
      <EmbroideredRose x={60} y={52} size={1.15} />
      <EmbroideredForgetMeNot x={50} y={42} size={0.9} />
      <EmbroideredForgetMeNot x={71} y={43} size={0.8} />
      <path d="M53 93 q7 4 14 0 M57 95 l-3 6 M63 95 l3 6" stroke="var(--terracotta)" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </>
  )
}

export function EmbroideredHoop({ size = 120, animate = true }) {
  return (
    <Embroidery width={size} height={size} viewBox="0 0 120 120" animate={animate} className="embroidered-hoop">
      <circle cx="60" cy="64" r="53" fill="var(--wood)" />
      <circle cx="60" cy="64" r="49" fill="var(--paper)" />
      <circle cx="60" cy="64" r="46" fill="none" stroke="var(--thread-soft)" strokeDasharray="3 3" />
      <rect x="54" y="6" width="12" height="7" rx="2" fill="var(--wood)" />
      <circle cx="60" cy="9.5" r="2" fill="#8d6c45" />
      <g transform="translate(60 70) scale(1.32) translate(-60 -66)">
        <Posy />
      </g>
    </Embroidery>
  )
}

function Bell({ x, y, color, edge }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <SatinPetal angle={180} length={5.5} width={3.4} color={color} edge={edge} />
      <path d="M-2 5.2 l-0.8 1.2 M0 5.6 v1.4 M2 5.2 l0.8 1.2" stroke={edge} strokeWidth="0.6" strokeLinecap="round" />
    </g>
  )
}

function Strawberry({ x, y, size = 1 }) {
  const clipId = useSvgId()
  const d = 'M0 0 C 5 0, 5.5 4, 3 8 C 1.8 10, -1.8 10, -3 8 C -5.5 4, -5 0, 0 0 Z'
  const seeds = [[-2, 2.5], [1, 2], [2.6, 4.5], [-0.6, 5], [-2.6, 5.4], [1.4, 7]]
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      <motion.g variants={stitchIn}>
        <clipPath id={clipId}>
          <path d={d} />
        </clipPath>
        <path d={d} fill="var(--rose-deep)" />
        <g clipPath={`url(#${clipId})`} stroke="#fff" strokeOpacity="0.22" strokeWidth="0.55">
          {Array.from({ length: 9 }, (_, i) => (
            <line key={i} x1="-6" y1={i * 1.2 + 0.6} x2="6" y2={i * 1.2 - 0.6} />
          ))}
        </g>
        <path d={d} fill="none" stroke="#8e4234" strokeWidth="0.6" />
        {seeds.map(([sx, sy]) => (
          <ellipse key={`${sx}-${sy}`} cx={sx} cy={sy} rx="0.35" ry="0.6" fill="var(--butter)" />
        ))}
      </motion.g>
      <FishboneLeaf x={-1.2} y={0.6} angle={-60} size={0.32} />
      <FishboneLeaf x={1.2} y={0.6} angle={60} size={0.32} />
      <FishboneLeaf x={0} y={0.8} angle={0} size={0.3} />
    </g>
  )
}

function StrawberryBlossom({ x, y, size = 1 }) {
  const petals = [0, 72, 144, 216, 288]
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      {petals.map((angle) => (
        <SatinPetal key={angle} angle={angle} length={5} width={3.4} color="var(--cream)" edge="#d9ccb4" />
      ))}
      <FrenchKnots color="var(--butter)" points={[[0, 0], [-1, -0.6], [1, 0.6]]} />
    </g>
  )
}

const SPRIGS = {
  forgetMeNot: () => (
    <>
      <RunningStitch d="M30 32 C 24 26, 18 22, 10 16" width={1} />
      <FishboneLeaf x={22} y={25} angle={-20} size={0.7} />
      <FishboneLeaf x={17} y={21} angle={-100} size={0.6} />
      <EmbroideredForgetMeNot x={10} y={15} size={0.8} />
      <EmbroideredForgetMeNot x={21} y={14} size={0.55} />
    </>
  ),
  daisy: () => (
    <>
      <RunningStitch d="M30 32 C 25 25, 20 20, 14 14" width={1} />
      <RunningStitch d="M24 26 C 25 21, 27 18, 28 14" width={0.9} />
      <FishboneLeaf x={20} y={22} angle={-115} size={0.65} />
      <FishboneLeaf x={26} y={28} angle={-20} size={0.55} />
      <EmbroideredDaisy x={13} y={13} size={0.62} />
      <g transform="translate(28 13)">
        <SatinPetal angle={0} length={4.5} width={2.2} color="var(--cream)" edge="#d9ccb4" />
        <FishboneLeaf x={0} y={1} angle={-35} size={0.3} />
        <FishboneLeaf x={0} y={1} angle={35} size={0.3} />
      </g>
    </>
  ),
  lavender: () => (
    <>
      <EmbroideredLavender x={27} y={32} size={0.85} lean={-28} />
      <EmbroideredLavender x={30} y={32} size={0.7} lean={-6} />
      <FishboneLeaf x={27} y={29} angle={-75} size={0.55} />
      <path d="M24 28.5 q3 2 6 0" stroke="var(--terracotta)" strokeWidth="1" fill="none" strokeLinecap="round" />
    </>
  ),
  rosebud: () => (
    <>
      <RunningStitch d="M30 32 C 24 27, 19 22, 12 18" width={1} />
      <RunningStitch d="M22 25 C 22 20, 24 16, 26 12" width={0.9} />
      <FishboneLeaf x={18} y={22} angle={-120} size={0.6} />
      <FishboneLeaf x={25} y={27} angle={-30} size={0.6} />
      <FishboneLeaf x={23} y={19} angle={30} size={0.5} />
      <EmbroideredRose x={11} y={17} size={0.72} />
      <g transform="translate(26 12)">
        <SatinPetal angle={0} length={6} width={2.6} color="var(--rose-deep)" edge="#8e4234" />
        <FishboneLeaf x={0} y={0.5} angle={-30} size={0.35} />
        <FishboneLeaf x={0} y={0.5} angle={30} size={0.35} />
      </g>
    </>
  ),
  bluebells: () => (
    <>
      <RunningStitch d="M30 32 C 28 18, 20 8, 8 9" width={1} />
      <FishboneLeaf x={30} y={32} angle={-25} size={0.95} />
      <FishboneLeaf x={29} y={31} angle={-60} size={0.8} />
      <path d="M22 12 v3 M15 9.5 v3.5 M9.5 9.5 v3" stroke="var(--moss)" strokeWidth="0.7" />
      <Bell x={22} y={15} color="var(--lavender)" edge="#6f5fa3" />
      <Bell x={15} y={13} color="var(--lavender-deep)" edge="#5c4d8f" />
      <Bell x={9.5} y={12.5} color="var(--lavender)" edge="#6f5fa3" />
    </>
  ),
  strawberry: () => (
    <>
      <RunningStitch d="M30 32 C 26 24, 20 20, 12 18" width={1} />
      <RunningStitch d="M24 25 C 24 20, 25 16, 26 12" width={0.9} />
      <FishboneLeaf x={22} y={26} angle={-115} size={0.6} />
      <FishboneLeaf x={22} y={26} angle={-160} size={0.55} />
      <FishboneLeaf x={22} y={26} angle={-70} size={0.55} />
      <Strawberry x={12} y={17} size={0.9} />
      <StrawberryBlossom x={26} y={11} size={0.75} />
    </>
  )
}

export function EmbroideredSprig({ variant = 'forgetMeNot' }) {
  const Sprig = SPRIGS[variant]
  return (
    <Embroidery width="52" height="52" viewBox="0 0 34 34" animate={false} className="embroidered-sprig">
      <Sprig />
    </Embroidery>
  )
}

export const NEEDLE_CYCLE_MS = 1400

export function EmbroideringNeedle() {
  return (
    <div className="embroidering">
      <EmbroideredHoop size={150} />
      <motion.svg
        className="embroidering-needle"
        width="60"
        height="60"
        viewBox="0 0 60 60"
        aria-hidden="true"
        animate={{ x: [0, -6, 2, -4, 0], y: [0, 8, 2, 10, 0] }}
        transition={{ duration: NEEDLE_CYCLE_MS / 1000, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path d="M8 52 L48 12" stroke="var(--ink-soft)" strokeWidth="2.6" strokeLinecap="round" />
        <ellipse cx="44" cy="16" rx="1.2" ry="2.8" transform="rotate(45 44 16)" fill="var(--linen)" />
        <path d="M44 16 C 54 22, 50 40, 36 44" stroke="var(--rose-deep)" strokeWidth="1.2" fill="none" />
      </motion.svg>
    </div>
  )
}
