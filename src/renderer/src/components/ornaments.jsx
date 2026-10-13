import { motion } from 'motion/react'

function Icon({ size = 20, children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export function ScissorsIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M8.1 8.1 20 20M8.1 15.9 20 4" />
    </Icon>
  )
}

export function BasketIcon(props) {
  return (
    <Icon {...props}>
      <path d="M3 10h18l-2 9a2 2 0 0 1-2 1.6H7A2 2 0 0 1 5 19z" />
      <path d="M7.5 10 11 4M16.5 10 13 4M8 14v3M12 14v3M16 14v3" />
    </Icon>
  )
}

export function HoopIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="13" r="8" />
      <circle cx="12" cy="13" r="5.5" strokeDasharray="2 2" />
      <path d="M10.5 3.5h3v2h-3z" />
    </Icon>
  )
}

export function ShirtIcon(props) {
  return (
    <Icon {...props}>
      <path d="M8 3 3.5 6 5.5 10 7.5 9v12h9V9l2 1 2-4L16 3a4 4 0 0 1-8 0z" />
    </Icon>
  )
}

export function SpoolIcon(props) {
  return (
    <Icon {...props}>
      <path d="M6 3h12M6 21h12" />
      <path d="M8 3v18M16 3v18" />
      <path d="M8 7l8 2M8 11l8 2M8 15l8 2" />
    </Icon>
  )
}

export function FolderIcon(props) {
  return (
    <Icon {...props}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </Icon>
  )
}

export function UploadIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 16V4M7 9l5-5 5 5M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </Icon>
  )
}

export function ArrowIcon(props) {
  return (
    <Icon {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  )
}

export function Clothespin({ size = 22 }) {
  return (
    <svg width={size * 0.55} height={size} viewBox="0 0 12 22" aria-hidden="true">
      <rect x="1" y="0.5" width="4.6" height="21" rx="2" fill="var(--wood)" />
      <rect x="6.4" y="0.5" width="4.6" height="21" rx="2" fill="#c49c6c" />
      <rect x="0.4" y="8" width="11.2" height="3" rx="1.2" fill="#8d8f93" />
    </svg>
  )
}

export function StitchCheck({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <motion.path
        d="M3 8.5 6.5 12 13 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      />
    </svg>
  )
}

export function CrossStitchFlower() {
  const stitches = [
    { x: 4, y: 1, color: 'var(--rose-deep)' },
    { x: 1, y: 4, color: 'var(--rose-deep)' },
    { x: 7, y: 4, color: 'var(--rose-deep)' },
    { x: 4, y: 7, color: 'var(--rose-deep)' },
    { x: 4, y: 4, color: 'var(--butter)' }
  ]
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true" className="cross-stitch">
      {stitches.map(({ x, y, color }) => (
        <path key={`${x}-${y}`} d={`M${x} ${y} l3 3 m0 -3 l-3 3`} stroke={color} strokeWidth="1.1" strokeLinecap="round" />
      ))}
    </svg>
  )
}
