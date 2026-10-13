import { useEffect, useState } from 'react'
import { Daisy, Lavender, Rose } from './flowers.jsx'

const CELEBRATE_MS = 2400
const SOIL_Y = 40
const PLANT = [
  { Flower: Lavender, x: 22, height: 20 },
  { Flower: Daisy, x: 38, height: 16 },
  { Flower: Rose, x: 54, height: 22 },
  { Flower: Daisy, x: 70, height: 18 },
  { Flower: Lavender, x: 86, height: 17 }
]

export default function SidebarGarden({ status, celebrate }) {
  const [celebrating, setCelebrating] = useState(false)

  useEffect(() => {
    if (!celebrate) return
    setCelebrating(true)
    const timer = setTimeout(() => setCelebrating(false), CELEBRATE_MS)
    return () => clearTimeout(timer)
  }, [celebrate])

  return (
    <div className={`sidebar-garden ${celebrating ? 'is-celebrating' : ''}`}>
      <svg width="108" height="56" viewBox="0 0 108 56" aria-hidden="true">
        {PLANT.map(({ Flower, x, height }, i) => (
          <g key={i} transform={`translate(${x} ${SOIL_Y})`}>
            <g className="garden-flower" style={{ animationDelay: `${-i * 0.45}s` }}>
              <Flower height={height} />
            </g>
          </g>
        ))}
        <path d="M14 38 h80 l-6 17 h-68 z" fill="var(--terracotta)" />
        <rect x="11" y="36" width="86" height="5" rx="2" fill="#a95d42" />
        <path d="M18 47 h72" stroke="#d68a68" strokeWidth="1" strokeDasharray="4 4" />
      </svg>
      <div className="garden-tag">
        <span className="garden-tag-hole" />
        {status}
      </div>
    </div>
  )
}
