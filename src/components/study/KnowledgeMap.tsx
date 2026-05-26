'use client'
import type { LearningUnit } from '@/types/roadmap'

type NodeStatus = 'locked' | 'available' | 'in-progress' | 'completed'

interface Props {
  units: LearningUnit[]
  completedIds: string[]
  activeId?: string | null
  selectedId?: string | null
  onSelect: (id: string, title: string) => void
  rootLabel?: string
}

const CX = 450
const CY = 280

// Radii per tier
const TIER_RADIUS: Record<number, number> = { 1: 90, 2: 180, 3: 268, 4: 340 }
// Node circle radii
const NODE_R: Record<number, number> = { 0: 32, 1: 22, 2: 18, 3: 14, 4: 12 }

interface PlacedUnit {
  unit: LearningUnit
  cx: number
  cy: number
}

function placeUnits(units: LearningUnit[]): PlacedUnit[] {
  const result: PlacedUnit[] = []
  const tierGroups: Record<number, LearningUnit[]> = {}
  for (const u of units) {
    if (!tierGroups[u.tier]) tierGroups[u.tier] = []
    tierGroups[u.tier].push(u)
  }
  for (const [tierStr, group] of Object.entries(tierGroups)) {
    const tier = Number(tierStr)
    const r = TIER_RADIUS[tier] ?? 180
    const count = group.length
    group.forEach((unit, i) => {
      const angle = -Math.PI / 2 + (2 * Math.PI / count) * i
      result.push({ unit, cx: CX + Math.cos(angle) * r, cy: CY + Math.sin(angle) * r })
    })
  }
  return result
}

function getStatus(
  unit: LearningUnit,
  completedIds: Set<string>,
  activeId: string | null
): NodeStatus {
  if (completedIds.has(unit.id)) return 'completed'
  if (unit.id === activeId) return 'in-progress'
  if (unit.prerequisites.length === 0) return 'available'
  if (unit.prerequisites.every(p => completedIds.has(p))) return 'available'
  return 'locked'
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + '…' : text
}

export default function KnowledgeMap({
  units,
  completedIds,
  activeId,
  selectedId,
  onSelect,
  rootLabel = 'Goal',
}: Props) {
  const placed = placeUnits(units)
  const completedSet = new Set(completedIds)
  const posMap = new Map(placed.map(p => [p.unit.id, p]))
  const statusMap = new Map(placed.map(p => [p.unit.id, getStatus(p.unit, completedSet, activeId ?? null)]))

  // Build edges: unit -> each prerequisite, tier-1 units with no prereqs -> root
  const edges: Array<{ x1: number; y1: number; x2: number; y2: number; fromId: string; toId: string }> = []
  for (const p of placed) {
    if (p.unit.prerequisites.length === 0) {
      // Connect to root
      edges.push({ x1: CX, y1: CY, x2: p.cx, y2: p.cy, fromId: 'root', toId: p.unit.id })
    } else {
      for (const prereqId of p.unit.prerequisites) {
        const from = posMap.get(prereqId)
        if (from) {
          edges.push({ x1: from.cx, y1: from.cy, x2: p.cx, y2: p.cy, fromId: prereqId, toId: p.unit.id })
        }
      }
    }
  }

  const tiers = [1, 2, 3, 4].filter(t => units.some(u => u.tier === t))

  return (
    <svg viewBox="0 0 900 560" className="w-full h-full select-none" aria-label="Knowledge roadmap map">
      <defs>
        <pattern id="km-grid" width="44" height="44" patternUnits="userSpaceOnUse">
          <path d="M 44 0 L 0 0 0 44" fill="none" stroke="#8A8FA8" strokeWidth="0.4" strokeOpacity="0.05" />
        </pattern>
        <filter id="km-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="km-glow-lg" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="14" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="km-vignette" cx="50%" cy="50%" r="65%">
          <stop offset="40%" stopColor="#08090F" stopOpacity="0" />
          <stop offset="100%" stopColor="#08090F" stopOpacity="0.6" />
        </radialGradient>
        <radialGradient id="km-root-fill" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#6D28D9" />
        </radialGradient>
        <radialGradient id="km-done-fill" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </radialGradient>
        <radialGradient id="km-active-fill" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#C084FC" />
          <stop offset="100%" stopColor="#9333EA" />
        </radialGradient>
      </defs>

      <rect width="900" height="560" fill="url(#km-grid)" />

      {/* Orbital rings */}
      {tiers.map(t => (
        <circle key={t} cx={CX} cy={CY} r={TIER_RADIUS[t]}
          fill="none" stroke="#8A8FA8" strokeWidth="0.5"
          strokeOpacity={t === 1 ? 0.1 : t === 2 ? 0.08 : 0.06}
          strokeDasharray={t === 1 ? '3 9' : t === 2 ? '2 10' : '2 14'}
        />
      ))}

      {/* Edges */}
      {edges.map(e => {
        const fromStatus = e.fromId === 'root' ? 'available' : (statusMap.get(e.fromId) ?? 'locked')
        const toStatus = statusMap.get(e.toId) ?? 'locked'
        const locked = toStatus === 'locked'
        const done = fromStatus === 'completed' && toStatus === 'completed'
        const live = (fromStatus === 'in-progress' || fromStatus === 'available') && !locked
        return (
          <line key={`${e.fromId}-${e.toId}`}
            x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke={done ? '#34C785' : live ? '#7C3AED' : '#8A8FA8'}
            strokeWidth={done ? 1.5 : !locked ? 1 : 0.7}
            strokeOpacity={done ? 0.5 : !locked ? 0.3 : 0.1}
            strokeDasharray={locked ? '4 5' : undefined}
          />
        )
      })}

      {/* Root node */}
      <g>
        <circle cx={CX} cy={CY} r={NODE_R[0] + 18} fill="#7C3AED" opacity={0.1} />
        <circle cx={CX} cy={CY} r={NODE_R[0]}
          fill="url(#km-root-fill)" stroke="#9F67F5" strokeWidth={2}
          filter="url(#km-glow)"
        />
        <circle cx={CX} cy={CY} r={5} fill="rgba(255,255,255,0.35)" />
        {(() => {
          const fs = 11
          const labelY = CY + NODE_R[0] + fs + 4
          const words = rootLabel.split(' ')
          const half = Math.ceil(words.length / 2)
          const l1 = truncate(words.slice(0, half).join(' '), 16)
          const l2 = words.length > 1 ? truncate(words.slice(half).join(' '), 16) : ''
          return (
            <>
              <text x={CX} y={labelY} textAnchor="middle" fontSize={fs} fill="#E9D5FF"
                style={{ fontFamily: 'system-ui,-apple-system,sans-serif', fontWeight: '500' }}>
                {l1}
              </text>
              {l2 && (
                <text x={CX} y={labelY + fs * 1.45} textAnchor="middle" fontSize={fs} fill="#E9D5FF"
                  style={{ fontFamily: 'system-ui,-apple-system,sans-serif', fontWeight: '500' }}>
                  {l2}
                </text>
              )}
            </>
          )
        })()}
      </g>

      {/* Unit nodes — render tier 4 first (outermost), root last */}
      {([4, 3, 2, 1] as const).flatMap(tier =>
        placed.filter(p => p.unit.tier === tier).map(p => {
          const { unit, cx, cy } = p
          const status = statusMap.get(unit.id) ?? 'locked'
          const isSelected = unit.id === selectedId
          const isBlindSpot = unit.isBlindSpot
          const r = NODE_R[tier] ?? 14
          const clickable = status !== 'locked'

          // Fill color
          const fill =
            status === 'completed'   ? 'url(#km-done-fill)' :
            status === 'in-progress' ? 'url(#km-active-fill)' :
            status === 'available'   ? '#141525' :
            '#0C0D18'

          // Stroke color — blind spot units get teal accent even when locked
          const stroke =
            status === 'completed'   ? '#34C785' :
            status === 'in-progress' ? '#C026D3' :
            isBlindSpot              ? '#22D3EE' :
            status === 'available'   ? '#7C3AED' :
            '#1C1D2E'

          const labelColor =
            status === 'completed'   ? '#A7F3D0' :
            status === 'in-progress' ? '#DDD6FE' :
            status === 'available'   ? '#C4C6DA' :
            isBlindSpot              ? '#67E8F9' :
            '#282938'

          const showLabel = tier <= 2 || status === 'available' || status === 'in-progress' || status === 'completed'
          const maxC = tier === 1 ? 13 : tier === 2 ? 11 : 9
          const words = unit.title.split(' ')
          const half = Math.ceil(words.length / 2)
          const l1 = truncate(words.slice(0, half).join(' '), maxC)
          const l2 = words.length > 1 ? truncate(words.slice(half).join(' '), maxC) : ''
          const fs = tier === 1 ? 9.5 : tier === 2 ? 8.5 : 7.5
          const labelY = cy + r + fs + 4

          return (
            <g key={unit.id}
              onClick={() => clickable && onSelect(unit.id, unit.title)}
              style={{ cursor: clickable ? 'pointer' : 'default', opacity: status === 'locked' && !isBlindSpot ? 0.35 : status === 'locked' ? 0.5 : 1 }}
            >
              {/* Ambient glow for non-locked */}
              {status !== 'locked' && (
                <circle cx={cx} cy={cy} r={r + 18}
                  fill={status === 'completed' ? '#34C785' : status === 'in-progress' ? '#C026D3' : '#7C3AED'}
                  opacity={0.06}
                />
              )}

              {/* Blind spot indicator ring — always visible even when locked */}
              {isBlindSpot && status === 'locked' && (
                <circle cx={cx} cy={cy} r={r + 6}
                  fill="none" stroke="#22D3EE" strokeWidth={1}
                  strokeOpacity={0.4} strokeDasharray="3 4"
                />
              )}

              {/* Pulse ring for available nodes */}
              {status === 'available' && (
                <circle cx={cx} cy={cy} r={r + 9}
                  fill="none"
                  stroke={isBlindSpot ? '#22D3EE' : '#7C3AED'}
                  strokeWidth={1.2} className="km-pulse"
                />
              )}

              {/* Selection ring */}
              {isSelected && (
                <circle cx={cx} cy={cy} r={r + 10}
                  fill="none" stroke="#C026D3" strokeWidth={1.8} strokeOpacity={0.8}
                  filter="url(#km-glow)"
                />
              )}

              {/* Main circle */}
              <circle cx={cx} cy={cy} r={r}
                fill={fill} stroke={stroke}
                strokeWidth={isSelected ? 2 : isBlindSpot && status === 'locked' ? 1.5 : 1.5}
                filter={status !== 'locked' ? 'url(#km-glow)' : undefined}
              />

              {/* Checkmark for completed */}
              {status === 'completed' && (
                <path
                  d={`M ${cx - r * 0.36} ${cy} L ${cx - r * 0.08} ${cy + r * 0.32} L ${cx + r * 0.42} ${cy - r * 0.32}`}
                  fill="none" stroke="#08090F" strokeWidth={r * 0.11}
                  strokeLinecap="round" strokeLinejoin="round"
                />
              )}

              {/* In-progress dot */}
              {status === 'in-progress' && (
                <circle cx={cx + r * 0.6} cy={cy - r * 0.6} r={r * 0.22} fill="#F0ABFC" />
              )}

              {/* Blind spot teal dot for available blind spots */}
              {isBlindSpot && status === 'available' && (
                <circle cx={cx + r * 0.55} cy={cy - r * 0.55} r={r * 0.25} fill="#22D3EE" />
              )}

              {/* Labels */}
              {showLabel && (
                <>
                  <text x={cx} y={labelY} textAnchor="middle" fontSize={fs} fill={labelColor}
                    style={{ fontFamily: 'system-ui,-apple-system,sans-serif', fontWeight: '500' }}>
                    {l1}
                  </text>
                  {l2 && (
                    <text x={cx} y={labelY + fs * 1.45} textAnchor="middle" fontSize={fs} fill={labelColor}
                      style={{ fontFamily: 'system-ui,-apple-system,sans-serif', fontWeight: '500' }}>
                      {l2}
                    </text>
                  )}
                </>
              )}
            </g>
          )
        })
      )}

      <rect width="900" height="560" fill="url(#km-vignette)" />

      <style>{`
        .km-pulse { animation: km-pulse-anim 2.5s ease-in-out infinite; }
        @keyframes km-pulse-anim { 0%,100%{opacity:0.4} 50%{opacity:0.07} }
      `}</style>
    </svg>
  )
}
