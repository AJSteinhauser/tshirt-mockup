export function Daisy({ height }) {
  const petals = [0, 60, 120, 180, 240, 300]
  return (
    <>
      <line y2={-height} stroke="var(--moss)" strokeWidth="1.4" />
      <ellipse cx="2.5" cy={-height * 0.45} rx="2.6" ry="1.2" fill="var(--sage)" transform={`rotate(-30 2.5 ${-height * 0.45})`} />
      <g transform={`translate(0 ${-height})`}>
        {petals.map((a) => (
          <ellipse key={a} cy="-3" rx="1.6" ry="3" fill="var(--cream)" stroke="#e8dcc6" strokeWidth="0.4" transform={`rotate(${a})`} />
        ))}
        <circle r="1.9" fill="var(--butter)" />
      </g>
    </>
  )
}

export function Rose({ height }) {
  return (
    <>
      <line y2={-height} stroke="var(--moss)" strokeWidth="1.4" />
      <ellipse cx="-3" cy={-height * 0.5} rx="3" ry="1.4" fill="var(--sage)" transform={`rotate(25 -3 ${-height * 0.5})`} />
      <g transform={`translate(0 ${-height})`}>
        <circle r="4.6" fill="var(--rose-deep)" />
        <path d="M-2.2 -0.4 a2.2 2.2 0 1 1 2.6 2.1 a1.2 1.2 0 1 1 -0.6 -2.2" stroke="var(--rose)" strokeWidth="1" fill="none" />
      </g>
    </>
  )
}

export function Lavender({ height }) {
  const buds = [0, 1, 2, 3, 4]
  return (
    <>
      <line y2={-height} stroke="var(--sage)" strokeWidth="1.2" />
      {buds.map((i) => (
        <ellipse
          key={i}
          cx={i % 2 ? 1.2 : -1.2}
          cy={-height + i * 2.4}
          rx="1.4"
          ry="2"
          fill={i % 2 ? 'var(--lavender)' : 'var(--lavender-deep)'}
        />
      ))}
    </>
  )
}
