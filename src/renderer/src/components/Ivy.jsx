const LEAVES = [
  { x: 30, y: 10, r: -20, s: 1 },
  { x: 22, y: 20, r: 35, s: 0.9 },
  { x: 29, y: 31, r: -30, s: 0.85 },
  { x: 21, y: 41, r: 30, s: 0.75 },
  { x: 27, y: 51, r: -25, s: 0.65 },
  { x: 22, y: 59, r: 20, s: 0.5 }
]

export default function Ivy() {
  return (
    <svg className="sidebar-ivy" width="44" height="66" viewBox="0 0 44 66" aria-hidden="true">
      <path d="M32 0 C 18 14, 34 26, 24 38 S 26 56, 22 64" stroke="var(--moss)" strokeOpacity="0.55" strokeWidth="1.3" fill="none" />
      {LEAVES.map(({ x, y, r, s }, i) => (
        <path
          key={i}
          d="M0 0 C -5 -3, -6 -9, 0 -11 C 6 -9, 5 -3, 0 0 Z"
          fill={i % 2 ? 'var(--sage)' : '#9fae72'}
          transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}
        />
      ))}
    </svg>
  )
}
