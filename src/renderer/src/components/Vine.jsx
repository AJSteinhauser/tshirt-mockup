const WIDTH = 40
const AXIS = 20
const WAVE = 30
const LEAF_SPACING = 10
const LEAF_COLORS = ['#9fae72', 'var(--sage)']
const LEAF_PATH = 'M0 0 C -5 -3, -6 -9, 0 -11 C 6 -9, 5 -3, 0 0 Z'

function stemX(y, sway) {
  const segment = Math.floor(y / WAVE)
  const t = (y - segment * WAVE) / WAVE
  const side = segment % 2 ? -1 : 1
  return AXIS + 2 * t * (1 - t) * sway * side
}

function stemPath(length, sway) {
  const points = []
  for (let y = 0; y <= length; y += 2) points.push(`${stemX(y, sway).toFixed(2)} ${y}`)
  return `M${points.join(' L')}`
}

export default function Vine({ length = 90, sway = 7, className = '' }) {
  const leaves = Array.from({ length: Math.floor((length - 6) / LEAF_SPACING) }, (_, i) => {
    const y = 6 + i * LEAF_SPACING
    const side = i % 2 ? -1 : 1
    return { x: stemX(y, sway), y, side, scale: 1 - (y / length) * 0.55 }
  })

  return (
    <svg className={`vine ${className}`} width={WIDTH} height={length} viewBox={`0 0 ${WIDTH} ${length}`} aria-hidden="true">
      <path d={stemPath(length, sway)} stroke="var(--moss)" strokeOpacity="0.55" strokeWidth="1.3" fill="none" />
      {leaves.map(({ x, y, side, scale }, i) => (
        <path
          key={y}
          d={LEAF_PATH}
          fill={LEAF_COLORS[i % 2]}
          transform={`translate(${x.toFixed(2)} ${y}) rotate(${side * 125}) scale(${scale.toFixed(2)})`}
        />
      ))}
    </svg>
  )
}
