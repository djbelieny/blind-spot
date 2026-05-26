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

// SVG viewBox 800×560 — positions for 1–8 nodes
const POSITIONS: [number, number][][] = [
  [],
  [[400, 280]],
  [[400, 160], [400, 400]],
  [[400, 100], [220, 360], [580, 360]],
  [[400, 85], [205, 255], [595, 255], [400, 440]],
  [[400, 75], [175, 235], [625, 235], [265, 430], [535, 430]],
  [[400, 65], [155, 215], [645, 215], [105, 405], [400, 405], [695, 405]],
  [[400, 60], [155, 205], [645, 205], [85, 390], [295, 390], [505, 390], [715, 390]],
  [[400, 55], [155, 195], [645, 195], [85, 370], [295, 370], [505, 370], [715, 370], [400, 510]],
]

// Pairs [from, to] — filtered to only existing nodes at render time
const ALL_CONNECTIONS: [number, number][] = [
  [0, 1], [0, 2],
  [1, 3], [1, 4], [2, 4], [2, 5],
  [3, 6], [4, 6], [4, 7], [5, 7],
]

const NODE_R = 30

export default function KnowledgeMap({ blindSpots, completedIds, activeId, selectedId, onSelect }: Props) {
  const n = Math.min(blindSpots.length, 8)
  if (n === 0) return null

  const positions = POSITIONS[n]

  const statuses: NodeStatus[] = blindSpots.slice(0, 8).map((bs, i) => {
    if (completedIds.includes(bs.id)) return 'completed'
    if (bs.id === activeId) return 'in-progress'
    if (i === 0) return 'available'
    if (completedIds.includes(blindSpots[i - 1].id)) return 'available'
    return 'locked'
  })

  const connections = ALL_CONNECTIONS.filter(([a, b]) => a < n && b < n)

  return (
    <svg
      viewBox="0 0 800 560"
      className="w-full h-full select-none"
      aria-label="Knowledge map"
    >
      <defs>
        {/* Grid pattern */}
        <pattern id="km-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#8A8FA8" strokeWidth="0.5" strokeOpacity="0.07" />
        </pattern>
        {/* Glow filter */}
        <filter id="km-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Gradient for completed nodes */}
        <radialGradient id="km-done" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#5AE5A8" />
          <stop offset="100%" stopColor="#34C785" />
        </radialGradient>
        {/* Gradient for in-progress nodes */}
        <radialGradient id="km-active" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#7C3AED" />
        </radialGradient>
      </defs>

      {/* Background grid */}
      <rect width="800" height="560" fill="url(#km-grid)" />

      {/* Connection paths */}
      {connections.map(([a, b]) => {
        const [x1, y1] = positions[a]
        const [x2, y2] = positions[b]
        const done = statuses[a] === 'completed'
        const active = statuses[a] === 'in-progress'
        // Bezier: midpoint + lateral offset for gentle curve
        const mx = (x1 + x2) / 2
        const my = (y1 + y2) / 2

        return (
          <path
            key={`${a}-${b}`}
            d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
            fill="none"
            stroke={done ? '#7C3AED' : active ? '#A855F7' : '#8A8FA8'}
            strokeWidth={done || active ? 2 : 1}
            strokeOpacity={done ? 0.55 : active ? 0.65 : 0.18}
            strokeDasharray={statuses[b] === 'locked' ? '5 4' : undefined}
          />
        )
      })}

      {/* Nodes */}
      {blindSpots.slice(0, 8).map((bs, i) => {
        const [cx, cy] = positions[i]
        const status = statuses[i]
        const isSelected = bs.id === selectedId
        const clickable = status !== 'locked'

        const fill =
          status === 'completed'   ? 'url(#km-done)'   :
          status === 'in-progress' ? 'url(#km-active)'  :
          status === 'available'   ? '#0E0F1A'           :
          '#0B0C17'

        const stroke =
          status === 'completed'   ? '#34C785' :
          status === 'in-progress' ? '#C026D3'  :
          status === 'available'   ? '#7C3AED'  :
          '#3A3B4E'

        const labelColor =
          status === 'completed'   ? '#34C785' :
          status === 'in-progress' ? '#FFFFFF'  :
          status === 'available'   ? '#F0F0F5'  :
          '#5A5B6E'

        const opacity = status === 'locked' ? 0.5 : 1

        return (
          <g
            key={bs.id}
            onClick={() => clickable && onSelect(bs.id, bs.name)}
            style={{ cursor: clickable ? 'pointer' : 'default', opacity }}
          >
            {/* Pulse ring — available nodes */}
            {status === 'available' && (
              <circle
                cx={cx} cy={cy} r={NODE_R + 10}
                fill="none"
                stroke="#7C3AED"
                strokeWidth={1.5}
                className="km-pulse"
              />
            )}

            {/* Selection ring */}
            {isSelected && (
              <circle
                cx={cx} cy={cy} r={NODE_R + 14}
                fill="none"
                stroke="#C026D3"
                strokeWidth={2}
                strokeOpacity={0.7}
                filter="url(#km-glow)"
              />
            )}

            {/* Main circle */}
            <circle
              cx={cx} cy={cy} r={NODE_R}
              fill={fill}
              stroke={stroke}
              strokeWidth={isSelected ? 2.5 : 2}
              filter={status !== 'locked' ? 'url(#km-glow)' : undefined}
            />

            {/* Inner symbol */}
            {status === 'locked' && (
              <text x={cx} y={cy + 5} textAnchor="middle" fontSize={15} fill="#5A5B6E">⊗</text>
            )}
            {status === 'completed' && (
              <text x={cx} y={cy + 6} textAnchor="middle" fontSize={18} fill="#08090F" fontWeight="bold">✓</text>
            )}
            {status === 'in-progress' && (
              <circle cx={cx + NODE_R - 8} cy={cy - NODE_R + 8} r={6} fill="#C026D3" />
            )}
            {status === 'available' && (
              <circle cx={cx} cy={cy} r={6} fill="#7C3AED" opacity={0.7} />
            )}

            {/* Label */}
            <text
              x={cx}
              y={cy + NODE_R + 18}
              textAnchor="middle"
              fontSize={11}
              fill={labelColor}
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: isSelected ? '600' : '400' }}
            >
              {bs.name.length > 20 ? bs.name.slice(0, 18) + '…' : bs.name}
            </text>
          </g>
        )
      })}

      <style>{`
        .km-pulse {
          animation: km-pulse-anim 2s ease-in-out infinite;
        }
        @keyframes km-pulse-anim {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.08; }
        }
      `}</style>
    </svg>
  )
}
