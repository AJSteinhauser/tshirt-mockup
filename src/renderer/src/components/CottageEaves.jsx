import { useEffect, useRef } from 'react'
import { useAnimate } from 'motion/react'

const HEIGHT = 44
const SCALLOP = 38
const THATCH_TOP = 22

const SWING = { rotate: [0, 3.2, -2, 1, -0.4, 0] }
const WIGGLE = { rotate: [0, -1.6, 1.2, -0.5, 0] }

export default function CottageEaves({ swingKey }) {
  const [scope, animate] = useAnimate()
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    animate(scope.current, SWING, { duration: 1.6, ease: 'easeOut' })
  }, [swingKey, animate, scope])

  return (
    <header className="cottage-eaves">
      <svg width="100%" height={HEIGHT} aria-hidden="true">
        <defs>
          <pattern id="thatch" width={SCALLOP} height={HEIGHT} patternUnits="userSpaceOnUse">
            <path
              d={`M0 ${THATCH_TOP} H${SCALLOP} V${HEIGHT - 9} Q${SCALLOP / 2} ${HEIGHT + 1} 0 ${HEIGHT - 9} Z`}
              fill="var(--straw)"
            />
            <path
              d={`M${SCALLOP} ${HEIGHT - 9} Q${SCALLOP / 2} ${HEIGHT + 1} 0 ${HEIGHT - 9}`}
              fill="none"
              stroke="var(--straw-deep)"
              strokeWidth="1.5"
            />
            <path
              d={`M${SCALLOP * 0.32} ${THATCH_TOP + 4} L${SCALLOP * 0.36} ${HEIGHT - 8} M${SCALLOP * 0.66} ${THATCH_TOP + 6} L${SCALLOP * 0.62} ${HEIGHT - 7}`}
              stroke="var(--straw-deep)"
              strokeOpacity="0.35"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height={THATCH_TOP + 2} fill="var(--plaster)" />
        <rect width="100%" height={HEIGHT} fill="url(#thatch)" />
      </svg>

      <div
        ref={scope}
        className="cottage-sign"
        onMouseEnter={() => animate(scope.current, WIGGLE, { duration: 0.9, ease: 'easeOut' })}
      >
        <svg width="150" height="52" viewBox="0 0 150 52" aria-hidden="true">
          <path d="M33 0 L38 16 M117 0 L112 16" stroke="var(--straw-deep)" strokeWidth="1.6" strokeLinecap="round" />
          <rect x="8" y="14" width="134" height="34" rx="7" fill="var(--honey-wood)" stroke="var(--honey-wood-deep)" strokeWidth="1.5" />
          <rect x="12.5" y="18.5" width="125" height="25" rx="5" fill="none" stroke="var(--cream)" strokeOpacity="0.6" strokeDasharray="3 3" />
          <circle cx="38" cy="17" r="1.6" fill="var(--honey-wood-deep)" />
          <circle cx="112" cy="17" r="1.6" fill="var(--honey-wood-deep)" />
        </svg>
        <span className="cottage-sign-text">Sewing Room</span>
      </div>
    </header>
  )
}
