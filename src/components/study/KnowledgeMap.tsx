'use client'
import type { BlindSpot } from '@/types/learner'

type NodeStatus = 'locked' | 'available' | 'in-progress' | 'completed'

interface Props {
  blindSpots: BlindSpot[]
  completedIds: string[]
  activeId?: string | null
  selectedId?: string | null
  onSelect: (id: string, label: string) => void
}

// Card center positions per node count — horizontal-first layouts
const POSITIONS: [number, number][][] = [
  [],
  [[400, 280]],
  [[200, 280], [600, 280]],
  [[400, 110], [210, 370], [590, 370]],
  [[400, 90], [185, 265], [615, 265], [400, 450]],
  [[400, 75], [170, 235], [630, 235], [255, 430], [545, 430]],
  [[400, 70], [155, 215], [645, 215], [110, 400], [400, 415], [690, 400]],
  [[400, 65], [150, 200], [650, 200], [95, 385], [295, 385], [505, 385], [705, 385]],
  [[400, 55], [150, 190], [650, 190], [85, 375], [285, 375], [515, 375], [715, 375], [400, 510]],
]

const ALL_CONNECTIONS: [number, number][] = [
  [0, 1], [0, 2],
  [1, 3], [1, 4], [2, 4], [2, 5],
  [3, 6], [4, 6], [4, 7], [5, 7],
]

function cardDims(n: number) {
  if (n <= 2) return { w: 176, h: 92, fs: 13, maxChars: 22 }
  if (n <= 4) return { w: 150, h: 80, fs: 12, maxChars: 18 }
  if (n <= 6) return { w: 136, h: 72, fs: 11.5, maxChars: 16 }
  return { w: 124, h: 66, fs: 11, maxChars: 14 }
}

function splitText(text: string, max: number): [string, string] {
  if (text.length <= max) return [text, '']
  const cut = text.lastIndexOf(' ', max)
  if (cut < 2) return [text.slice(0, max - 1) + '…', '']
  const rest = text.slice(cut + 1)
  return [text.slice(0, cut), rest.length > max ? rest.slice(0, max - 1) + '…' : rest]
}

export default function KnowledgeMap({ blindSpots, completedIds, activeId, selectedId, onSelect }: Props) {
  const n = Math.min(blindSpots.length, 8)
  if (n === 0) return null

  const positions = POSITIONS[n]
  const { w, h, fs, maxChars } = cardDims(n)
  const rx = 16

  const statuses: NodeStatus[] = blindSpots.slice(0, 8).map((bs, i) => {
    if (completedIds.includes(bs.id)) return 'completed'
    if (bs.id === activeId) return 'in-progress'
    if (i === 0) return 'available'
    if (completedIds.includes(blindSpots[i - 1].id)) return 'available'
    return 'locked'
  })

  const connections = ALL_CONNECTIONS.filter(([a, b]) => a < n && b < n)

  return (
    <svg viewBox="0 0 800 560" className="w-full h-full select-none" aria-label="Knowledge map">
      <defs>
        <pattern id="km-grid" width="44" height="44" patternUnits="userSpaceOnUse">
          <path d="M 44 0 L 0 0 0 44" fill="none" stroke="#8A8FA8" strokeWidth="0.5" strokeOpacity="0.06" />
        </pattern>
        <filter id="km-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="km-glow-sel" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="9" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="km-vignette" cx="50%" cy="50%" r="65%">
          <stop offset="40%" stopColor="#08090F" stopOpacity="0" />
          <stop offset="100%" stopColor="#08090F" stopOpacity="0.55" />
        </radialGradient>
        <linearGradient id="km-done-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#162B20" />
          <stop offset="100%" stopColor="#0D1A14" />
        </linearGradient>
        <linearGradient id="km-active-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22143A" />
          <stop offset="100%" stopColor="#160D26" />
        </linearGradient>
      </defs>

      <rect width="800" height="560" fill="url(#km-grid)" />
      <rect width="800" height="560" fill="url(#km-vignette)" />

      {/* Connections */}
      {connections.map(([a, b]) => {
        const [x1, y1] = positions[a]
        const [x2, y2] = positions[b]
        const done = statuses[a] === 'completed' && statuses[b] === 'completed'
        const hot = statuses[a] === 'in-progress' || statuses[b] === 'in-progress'
        const locked = statuses[b] === 'locked'
        const mx = (x1 + x2) / 2 + (y2 - y1) * 0.06
        const my = (y1 + y2) / 2 - (x2 - x1) * 0.06
        return (
          <path
            key={`${a}-${b}`}
            d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
            fill="none"
            stroke={done ? '#34C785' : hot ? '#9F67F5' : '#8A8FA8'}
            strokeWidth={done ? 2 : hot ? 1.5 : 1}
            strokeOpacity={done ? 0.45 : hot ? 0.55 : 0.14}
            strokeDasharray={locked ? '5 4' : undefined}
          />
        )
      })}

      {/* Nodes */}
      {blindSpots.slice(0, 8).map((bs, i) => {
        const [cx, cy] = positions[i]
        const status = statuses[i]
        const isSelected = bs.id === selectedId
        const clickable = status !== 'locked'

        const nx = cx - w / 2
        const ny = cy - h / 2

        const bgFill =
          status === 'completed'   ? 'url(#km-done-bg)'   :
          status === 'in-progress' ? 'url(#km-active-bg)'  :
          status === 'available'   ? '#0E0F1A'              :
          '#0A0B14'

        const borderColor =
          status === 'completed'   ? '#34C785' :
          status === 'in-progress' ? '#C026D3'  :
          status === 'available'   ? '#7C3AED'  :
          '#232432'

        const accentColor =
          status === 'completed'   ? '#34C785' :
          status === 'in-progress' ? '#C026D3'  :
          '#7C3AED'

        const textColor =
          status === 'completed'   ? '#A7F3D0' :
          status === 'in-progress' ? '#DDD6FE'  :
          status === 'available'   ? '#F0F0F5'  :
          '#3C3D50'

        const [line1, line2] = splitText(bs.name, maxChars)
        const twoLines = line2.length > 0
        const textY = twoLines ? cy - fs * 0.55 : cy + fs * 0.38

        return (
          <g
            key={bs.id}
            onClick={() => clickable && onSelect(bs.id, bs.name)}
            style={{ cursor: clickable ? 'pointer' : 'default', opacity: status === 'locked' ? 0.4 : 1 }}
          >
            {/* Ambient glow slab */}
            {(status === 'available' || isSelected) && (
              <rect
                x={nx - 12} y={ny - 12} width={w + 24} height={h + 24} rx={rx + 8}
                fill={isSelected ? '#C026D3' : '#7C3AED'}
                opacity={0.07}
              />
            )}

            {/* Pulse ring — available */}
            {status === 'available' && !isSelected && (
              <rect
                x={nx - 7} y={ny - 7} width={w + 14} height={h + 14} rx={rx + 5}
                fill="none" stroke="#7C3AED" strokeWidth={1.5} className="km-pulse"
              />
            )}

            {/* Selection ring */}
            {isSelected && (
              <rect
                x={nx - 7} y={ny - 7} width={w + 14} height={h + 14} rx={rx + 5}
                fill="none" stroke="#C026D3" strokeWidth={2} strokeOpacity={0.7}
                filter="url(#km-glow-sel)"
              />
            )}

            {/* Card body */}
            <rect
              x={nx} y={ny} width={w} height={h} rx={rx}
              fill={bgFill}
              stroke={borderColor}
              strokeWidth={isSelected ? 2 : status !== 'locked' ? 1.5 : 1}
              filter={status !== 'locked' ? 'url(#km-glow)' : undefined}
            />

            {/* Top accent bar */}
            {status !== 'locked' && (
              <rect
                x={nx + rx} y={ny} width={w - rx * 2} height={2} rx={1}
                fill={accentColor} opacity={0.8}
              />
            )}

            {/* Status dot — top right */}
            {status !== 'locked' && (
              <circle cx={nx + w - 14} cy={ny + 14} r={4.5} fill={accentColor} opacity={0.85} />
            )}
            {status === 'completed' && (
              <path
                d={`M ${nx+w-17} ${ny+14} L ${nx+w-14.5} ${ny+16.5} L ${nx+w-11} ${ny+11.5}`}
                fill="none" stroke="#08090F" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
              />
            )}

            {/* Node text */}
            <text
              x={cx} y={textY}
              textAnchor="middle" fontSize={fs} fill={textColor}
              style={{ fontFamily: 'system-ui,-apple-system,sans-serif', fontWeight: clickable ? '500' : '400' }}
            >
              {line1}
            </text>
            {twoLines && (
              <text
                x={cx} y={textY + fs * 1.45}
                textAnchor="middle" fontSize={fs} fill={textColor}
                style={{ fontFamily: 'system-ui,-apple-system,sans-serif', fontWeight: clickable ? '500' : '400' }}
              >
                {line2}
              </text>
            )}
          </g>
        )
      })}

      <style>{`
        .km-pulse { animation: km-pulse-anim 2.5s ease-in-out infinite; }
        @keyframes km-pulse-anim { 0%,100%{opacity:0.38} 50%{opacity:0.07} }
      `}</style>
    </svg>
  )
}
