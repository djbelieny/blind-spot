'use client'
import type { BlindSpot } from '@/types/learner'

type NodeStatus = 'locked' | 'available' | 'in-progress' | 'completed'

interface KMNode {
  id: string
  label: string
  tier: 0 | 1 | 2
  parentId: string | null
  isPlaceholder: boolean
  cx: number
  cy: number
}

interface Props {
  blindSpots: BlindSpot[]
  completedIds: string[]
  activeId?: string | null
  selectedId?: string | null
  onSelect: (id: string, label: string) => void
  rootLabel?: string
}

const CX = 400, CY = 275
const R1 = 148, R2 = 272

function buildTree(blindSpots: BlindSpot[], rootLabel: string) {
  const nodes: KMNode[] = [
    { id: 'root', label: rootLabel, tier: 0, parentId: null, isPlaceholder: false, cx: CX, cy: CY },
  ]
  const edges: [string, string][] = []

  const n1 = Math.min(blindSpots.length, 6)
  if (n1 === 0) return { nodes, edges }

  const spread = n1 <= 2 ? Math.PI / 4.5 : n1 <= 4 ? Math.PI / 5.5 : Math.PI / 7

  blindSpots.slice(0, 6).forEach((bs, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI / n1) * i
    const cx = CX + Math.cos(angle) * R1
    const cy = CY + Math.sin(angle) * R1
    nodes.push({ id: bs.id, label: bs.name, tier: 1, parentId: 'root', isPlaceholder: false, cx, cy })
    edges.push(['root', bs.id])

    // 2 placeholder sub-nodes per blind spot
    ;[-1, 1].forEach((d, j) => {
      const a2 = angle + d * spread
      const chId = `${bs.id}_${j}`
      nodes.push({
        id: chId, label: '···', tier: 2, parentId: bs.id, isPlaceholder: true,
        cx: CX + Math.cos(a2) * R2, cy: CY + Math.sin(a2) * R2,
      })
      edges.push([bs.id, chId])
    })
  })

  return { nodes, edges }
}

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max - 1) + '…' : text
}

export default function KnowledgeMap({ blindSpots, completedIds, activeId, selectedId, onSelect, rootLabel = 'Path' }: Props) {
  const { nodes, edges } = buildTree(blindSpots, rootLabel)

  function getStatus(node: KMNode): NodeStatus {
    if (node.tier === 0) return 'available'
    if (node.isPlaceholder) return 'locked'
    const i = blindSpots.findIndex(b => b.id === node.id)
    if (i < 0) return 'locked'
    const bs = blindSpots[i]
    if (completedIds.includes(bs.id)) return 'completed'
    if (bs.id === activeId) return 'in-progress'
    if (i === 0) return 'available'
    if (completedIds.includes(blindSpots[i - 1].id)) return 'available'
    return 'locked'
  }

  const statusMap = new Map(nodes.map(n => [n.id, getStatus(n)]))

  return (
    <svg viewBox="0 0 800 560" className="w-full h-full select-none" aria-label="Knowledge map">
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

      <rect width="800" height="560" fill="url(#km-grid)" />

      {/* Orbital rings */}
      {blindSpots.length > 0 && (
        <>
          <circle cx={CX} cy={CY} r={R1} fill="none" stroke="#8A8FA8" strokeWidth="0.5"
            strokeOpacity="0.1" strokeDasharray="3 9" />
          <circle cx={CX} cy={CY} r={R2} fill="none" stroke="#8A8FA8" strokeWidth="0.5"
            strokeOpacity="0.06" strokeDasharray="2 12" />
        </>
      )}

      {/* Edges */}
      {edges.map(([fromId, toId]) => {
        const from = nodes.find(n => n.id === fromId)
        const to = nodes.find(n => n.id === toId)
        if (!from || !to) return null
        const fromStatus = statusMap.get(fromId)!
        const toStatus = statusMap.get(toId)!
        const locked = toStatus === 'locked'
        const done = fromStatus === 'completed' && toStatus === 'completed'
        const live = fromStatus === 'in-progress' || fromStatus === 'available'
        return (
          <line key={`${fromId}-${toId}`}
            x1={from.cx} y1={from.cy} x2={to.cx} y2={to.cy}
            stroke={done ? '#34C785' : live && !locked ? '#7C3AED' : '#8A8FA8'}
            strokeWidth={done ? 1.5 : !locked ? 1 : 0.7}
            strokeOpacity={done ? 0.5 : !locked ? 0.3 : 0.1}
            strokeDasharray={locked ? '4 5' : undefined}
          />
        )
      })}

      {/* Nodes — render outermost tier first so inner ones paint on top */}
      {([2, 1, 0] as const).flatMap(tier =>
        nodes.filter(n => n.tier === tier).map(node => {
          const status = statusMap.get(node.id)!
          const isSelected = node.id === selectedId
          const clickable = !node.isPlaceholder && status !== 'locked'

          const r = node.tier === 0 ? 34 : node.tier === 1 ? 23 : 16

          const fill =
            node.tier === 0        ? 'url(#km-root-fill)'   :
            status === 'completed' ? 'url(#km-done-fill)'   :
            status === 'in-progress' ? 'url(#km-active-fill)' :
            status === 'available'   ? '#141525'              :
            '#0C0D18'

          const stroke =
            node.tier === 0        ? '#9F67F5' :
            status === 'completed' ? '#34C785' :
            status === 'in-progress' ? '#C026D3' :
            status === 'available'   ? '#7C3AED' :
            '#1C1D2E'

          const labelColor =
            node.tier === 0        ? '#E9D5FF' :
            status === 'completed' ? '#A7F3D0' :
            status === 'in-progress' ? '#DDD6FE' :
            status === 'available'   ? '#C4C6DA' :
            '#282938'

          // Label — split long names into 2 lines
          const maxC = node.tier === 0 ? 16 : node.tier === 1 ? 13 : 0
          const words = node.label.split(' ')
          const half = Math.ceil(words.length / 2)
          const l1 = truncate(words.slice(0, half).join(' '), maxC)
          const l2 = words.length > 1 ? truncate(words.slice(half).join(' '), maxC) : ''
          const fs = node.tier === 0 ? 11 : node.tier === 1 ? 9.5 : 8
          const labelY = node.cy + r + fs + 4

          return (
            <g key={node.id}
              onClick={() => clickable && onSelect(node.id, node.label)}
              style={{ cursor: clickable ? 'pointer' : 'default', opacity: status === 'locked' ? 0.35 : 1 }}
            >
              {/* Ambient glow */}
              {(status !== 'locked') && (
                <circle cx={node.cx} cy={node.cy} r={r + 18}
                  fill={node.tier === 0 ? '#7C3AED' : status === 'completed' ? '#34C785' : status === 'in-progress' ? '#C026D3' : '#7C3AED'}
                  opacity={node.tier === 0 ? 0.1 : 0.06}
                />
              )}

              {/* Pulse ring for available tier-1 */}
              {status === 'available' && node.tier === 1 && (
                <circle cx={node.cx} cy={node.cy} r={r + 9}
                  fill="none" stroke="#7C3AED" strokeWidth={1.2} className="km-pulse" />
              )}

              {/* Selection ring */}
              {isSelected && (
                <circle cx={node.cx} cy={node.cy} r={r + 10}
                  fill="none" stroke="#C026D3" strokeWidth={1.8} strokeOpacity={0.8}
                  filter="url(#km-glow)" />
              )}

              {/* Main circle */}
              <circle cx={node.cx} cy={node.cy} r={r}
                fill={fill} stroke={stroke}
                strokeWidth={node.tier === 0 ? 2 : isSelected ? 2 : 1.5}
                filter={status !== 'locked' ? 'url(#km-glow)' : undefined}
              />

              {/* Checkmark */}
              {status === 'completed' && (
                <path
                  d={`M ${node.cx - r*0.36} ${node.cy} L ${node.cx - r*0.08} ${node.cy + r*0.32} L ${node.cx + r*0.42} ${node.cy - r*0.32}`}
                  fill="none" stroke="#08090F" strokeWidth={r * 0.11}
                  strokeLinecap="round" strokeLinejoin="round"
                />
              )}

              {/* Active indicator dot */}
              {status === 'in-progress' && node.tier > 0 && (
                <circle cx={node.cx + r * 0.6} cy={node.cy - r * 0.6} r={r * 0.22} fill="#F0ABFC" />
              )}

              {/* Root inner dot */}
              {node.tier === 0 && (
                <circle cx={node.cx} cy={node.cy} r={5} fill="rgba(255,255,255,0.35)" />
              )}

              {/* Labels (skip placeholders) */}
              {!node.isPlaceholder && (
                <>
                  <text x={node.cx} y={labelY} textAnchor="middle" fontSize={fs} fill={labelColor}
                    style={{ fontFamily: 'system-ui,-apple-system,sans-serif', fontWeight: '500' }}>
                    {l1}
                  </text>
                  {l2 && (
                    <text x={node.cx} y={labelY + fs * 1.45} textAnchor="middle" fontSize={fs} fill={labelColor}
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

      <rect width="800" height="560" fill="url(#km-vignette)" />

      <style>{`
        .km-pulse { animation: km-pulse-anim 2.5s ease-in-out infinite; }
        @keyframes km-pulse-anim { 0%,100%{opacity:0.4} 50%{opacity:0.07} }
      `}</style>
    </svg>
  )
}
