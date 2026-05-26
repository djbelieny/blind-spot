'use client'
import { useEffect, useRef } from 'react'
import type { LearnerPillars } from '@/types/learner'

const PILLAR_LABELS: Record<keyof LearnerPillars, { en: string; pt: string }> = {
  comprehension: { en: 'Learning Depth', pt: 'Profundidade' },
  application:   { en: 'Practice',       pt: 'Prática' },
  analysis:      { en: 'Critical Think', pt: 'Raciocínio' },
  synthesis:     { en: 'Connections',    pt: 'Conexões' },
  speed:         { en: 'Learning Pace',  pt: 'Ritmo' },
  retention:     { en: 'Memory',         pt: 'Memória' },
  consistency:   { en: 'Consistency',    pt: 'Consistência' },
  precision:     { en: 'Accuracy',       pt: 'Precisão' },
}

const KEYS = Object.keys(PILLAR_LABELS) as (keyof LearnerPillars)[]

interface Props {
  pillars: LearnerPillars
  label: string
  language?: 'en' | 'pt-BR'
  size?: number
}

function polarToXY(angle: number, r: number, cx: number, cy: number) {
  const rad = (angle - 90) * (Math.PI / 180)
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

export default function RadarChart({ pillars, label, language = 'en', size = 280 }: Props) {
  const n = KEYS.length
  const cx = size / 2
  const cy = size / 2
  const maxR = size * 0.36
  const labelR = size * 0.46
  const levels = [0.25, 0.5, 0.75, 1]

  // Grid rings
  const rings = levels.map(f =>
    KEYS.map((_, i) => {
      const angle = (i / n) * 360
      const { x, y } = polarToXY(angle, maxR * f, cx, cy)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ') + ' Z'
  )

  // Axes
  const axes = KEYS.map((_, i) => {
    const angle = (i / n) * 360
    const end = polarToXY(angle, maxR, cx, cy)
    return { x1: cx, y1: cy, x2: end.x, y2: end.y }
  })

  // Data polygon
  const dataPoints = KEYS.map((k, i) => {
    const angle = (i / n) * 360
    const r = maxR * (pillars[k] / 100)
    return polarToXY(angle, r, cx, cy)
  })
  const dataPath = dataPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ') + ' Z'

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid rings */}
        {rings.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#8A8FA8" strokeOpacity={0.12} strokeWidth={1} />
        ))}

        {/* Axes */}
        {axes.map((a, i) => (
          <line key={i} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke="#8A8FA8" strokeOpacity={0.15} strokeWidth={1} />
        ))}

        {/* Data fill */}
        <path d={dataPath} fill="#7C3AED" fillOpacity={0.15} stroke="#7C3AED" strokeWidth={1.5} strokeOpacity={0.8} />

        {/* Data dots */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="#7C3AED" fillOpacity={pillars[KEYS[i]] > 0 ? 0.9 : 0} />
        ))}

        {/* Labels */}
        {KEYS.map((k, i) => {
          const angle = (i / n) * 360
          const { x, y } = polarToXY(angle, labelR, cx, cy)
          const lang = language === 'pt-BR' ? 'pt' : 'en'
          return (
            <text
              key={k}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={9.5}
              fill="#8A8FA8"
              fillOpacity={0.7}
            >
              {PILLAR_LABELS[k][lang]}
            </text>
          )
        })}
      </svg>
      <p className="text-[#F0F0F5] text-sm font-light">{label}</p>
    </div>
  )
}
