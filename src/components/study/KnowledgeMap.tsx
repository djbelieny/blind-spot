'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import type { LearningUnit } from '@/types/roadmap'

type NodeStatus = 'locked' | 'available' | 'in-progress' | 'completed'

// Solar-system-style orbital radii — wide spacing between tiers
const TIER_RADIUS: Record<number, number> = { 1: 3.5, 2: 7.0, 3: 11.5, 4: 16.5 }

// Planet sizes — tier 1 biggest (foundation), tier 4 smallest (mastery details)
const NODE_R: Record<number, number> = { 0: 0.85, 1: 0.60, 2: 0.50, 3: 0.40, 4: 0.32 }

// Status → emissive color (on-brand palette)
const STATUS_COLOR: Record<NodeStatus, string> = {
  available:   '#F94716',   // violet
  'in-progress': '#FF6B3D', // magenta
  completed:   '#34C785',   // teal-green
  locked:      '#555870',   // visible gray-blue
}

interface PlacedUnit { unit: LearningUnit; x: number; z: number }

function placeUnits(units: LearningUnit[]): PlacedUnit[] {
  const result: PlacedUnit[] = []
  const tierGroups: Record<number, LearningUnit[]> = {}
  for (const u of units) {
    if (!tierGroups[u.tier]) tierGroups[u.tier] = []
    tierGroups[u.tier].push(u)
  }
  for (const [tierStr, group] of Object.entries(tierGroups)) {
    const tier = Number(tierStr)
    const r = TIER_RADIUS[tier] ?? 7
    const count = group.length
    // Offset start angle slightly per tier so labels don't all stack at the top
    const startOffset = tier % 2 === 0 ? Math.PI / count : 0
    group.forEach((unit, i) => {
      const angle = -Math.PI / 2 + startOffset + (2 * Math.PI / count) * i
      result.push({ unit, x: Math.cos(angle) * r, z: Math.sin(angle) * r })
    })
  }
  return result
}

function getStatus(unit: LearningUnit, completedIds: Set<string>, activeId: string | null): NodeStatus {
  if (completedIds.has(unit.id)) return 'completed'
  if (unit.id === activeId) return 'in-progress'
  if (unit.prerequisites.length === 0) return 'available'
  if (unit.prerequisites.every(p => completedIds.has(p))) return 'available'
  return 'locked'
}

// ── Star field ────────────────────────────────────────────────────────────────
function StarField() {
  const count = 1800
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 120
      arr[i * 3 + 1] = (Math.random() - 0.5) * 60
      arr[i * 3 + 2] = (Math.random() - 0.5) * 120
    }
    return arr
  }, [])
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.055} color="#ffffff" transparent opacity={0.55} sizeAttenuation />
    </points>
  )
}

// ── Orbital ring — torus lying flat in XZ plane ───────────────────────────────
function OrbitalRing({ radius, tier }: { radius: number; tier: number }) {
  const opacity = tier === 1 ? 0.30 : tier === 2 ? 0.22 : tier === 3 ? 0.16 : 0.12
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.015, 4, 256]} />
      <meshBasicMaterial color="#6B6E92" transparent opacity={opacity} depthWrite={false} />
    </mesh>
  )
}

// ── Sun / root node ───────────────────────────────────────────────────────────
function SunNode({ label }: { label: string }) {
  const innerRef = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    if (innerRef.current) innerRef.current.rotation.y += dt * 0.25
  })

  return (
    <group>
      {/* Corona layers */}
      {[1.6, 2.2, 3.2].map((scale, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.85 * scale, 32, 32]} />
          <meshBasicMaterial
            color="#F94716"
            transparent
            opacity={[0.18, 0.08, 0.03][i]}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
      {/* Core */}
      <mesh ref={innerRef}>
        <sphereGeometry args={[0.85, 48, 48]} />
        <meshStandardMaterial
          color="#0d0620"
          emissive="#8B5CF6"
          emissiveIntensity={2.2}
          roughness={0.15}
          metalness={0.4}
        />
      </mesh>
      {/* Bright centre dot */}
      <mesh>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial color="#E9D5FF" blending={THREE.AdditiveBlending} />
      </mesh>
      <Html center position={[0, 1.35, 0]} style={{ pointerEvents: 'none' }} zIndexRange={[50, 0]}>
        <span style={{
          fontSize: 13, fontWeight: 700, color: '#E9D5FF',
          fontFamily: 'system-ui, sans-serif',
          textShadow: '0 0 12px rgba(124,58,237,0.9), 0 2px 6px #000',
          whiteSpace: 'nowrap', letterSpacing: '0.02em',
        }}>
          {label.length > 20 ? label.slice(0, 19) + '…' : label}
        </span>
      </Html>
    </group>
  )
}

// ── Planet node ───────────────────────────────────────────────────────────────
interface PlanetProps {
  placed: PlacedUnit
  status: NodeStatus
  isSelected: boolean
  isBlindSpot: boolean
  r: number
  onSelect: () => void
}

function Planet({ placed, status, isSelected, isBlindSpot, r, onSelect }: PlanetProps) {
  const surfaceRef = useRef<THREE.Mesh>(null)
  const phase = useRef(Math.random() * Math.PI * 2)

  useFrame((_, dt) => {
    if (status === 'available' && surfaceRef.current) {
      phase.current += dt * 1.1
      const mat = surfaceRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.75 + Math.sin(phase.current) * 0.25
    }
  })

  const accentColor = isBlindSpot && status === 'locked' ? '#22D3EE' : STATUS_COLOR[status]
  const isActive = status !== 'locked'

  // Surface material props
  const emissiveIntensity = status === 'locked' ? 0.45 : status === 'available' ? 0.75 : 1.0
  const baseHex = status === 'locked' ? '#1C1E2E' : status === 'completed' ? '#04180e' : status === 'in-progress' ? '#130320' : '#0b0820'

  // Label styling
  const labelColor = status === 'locked'
    ? (isBlindSpot ? '#67E8F9' : '#6B6E8A')
    : status === 'completed' ? '#6EE7B7'
    : status === 'in-progress' ? '#E879F9'
    : '#C4B5FD'

  const labelOpacity = status === 'locked' && !isBlindSpot ? 0.65 : 1

  // Title — clean truncation, 2 lines max
  const words = placed.unit.title.split(' ')
  const mid = Math.ceil(words.length / 2)
  const line1 = words.slice(0, mid).join(' ')
  const line2 = words.length > 1 ? words.slice(mid).join(' ') : ''
  const maxW = 13
  const l1 = line1.length > maxW ? line1.slice(0, maxW - 1) + '…' : line1
  const l2 = line2.length > maxW ? line2.slice(0, maxW - 1) + '…' : line2

  const clickable = isActive

  return (
    <group position={[placed.x, 0, placed.z]}>

      {/* Atmosphere glow — only for active planets */}
      {isActive && (
        <mesh>
          <sphereGeometry args={[r * 1.55, 32, 32]} />
          <meshBasicMaterial
            color={accentColor}
            transparent
            opacity={0.14}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* Outer haze — only for active */}
      {isActive && (
        <mesh>
          <sphereGeometry args={[r * 2.4, 24, 24]} />
          <meshBasicMaterial
            color={accentColor}
            transparent
            opacity={0.045}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* Selection ring */}
      {isSelected && (
        <>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r * 1.7, 0.035, 12, 96]} />
            <meshBasicMaterial color="#F0ABFC" blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <mesh>
            <sphereGeometry args={[r * 1.7, 32, 32]} />
            <meshBasicMaterial color="#FF6B3D" transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        </>
      )}

      {/* Blind spot indicator ring */}
      {isBlindSpot && status === 'locked' && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r * 1.5, 0.02, 8, 64]} />
          <meshBasicMaterial color="#22D3EE" transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      )}

      {/* Planet surface */}
      <mesh
        ref={surfaceRef}
        onClick={(e) => { e.stopPropagation(); onSelect() }}
        onPointerEnter={() => { document.body.style.cursor = 'pointer' }}
        onPointerLeave={() => { document.body.style.cursor = 'auto' }}
      >
        <sphereGeometry args={[r, 48, 48]} />
        <meshStandardMaterial
          color={baseHex}
          emissive={accentColor}
          emissiveIntensity={emissiveIntensity}
          roughness={status === 'locked' ? 0.9 : 0.2}
          metalness={status === 'locked' ? 0.0 : 0.5}
        />
      </mesh>

      {/* Specular highlight dot on active planets */}
      {isActive && (
        <mesh position={[r * 0.35, r * 0.45, r * 0.35]}>
          <sphereGeometry args={[r * 0.12, 8, 8]} />
          <meshBasicMaterial color="white" transparent opacity={0.35} blending={THREE.AdditiveBlending} />
        </mesh>
      )}

      {/* Label */}
      <Html
        center
        position={[0, -(r + 0.28), 0]}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
        distanceFactor={12}
      zIndexRange={[50, 0]}
      >
        <div style={{ textAlign: 'center', opacity: labelOpacity }}>
          <span style={{
            display: 'block',
            fontSize: placed.unit.tier <= 2 ? 11 : 10,
            fontWeight: 500,
            color: labelColor,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            textShadow: '0 1px 6px rgba(0,0,0,0.95)',
            lineHeight: 1.35,
            whiteSpace: 'nowrap',
          }}>
            {l1}
          </span>
          {l2 && (
            <span style={{
              display: 'block',
              fontSize: placed.unit.tier <= 2 ? 11 : 10,
              fontWeight: 500,
              color: labelColor,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              textShadow: '0 1px 6px rgba(0,0,0,0.95)',
              lineHeight: 1.35,
              whiteSpace: 'nowrap',
            }}>
              {l2}
            </span>
          )}
        </div>
      </Html>
    </group>
  )
}

// ── Scene ─────────────────────────────────────────────────────────────────────
interface Props {
  units: LearningUnit[]
  completedIds: string[]
  activeId?: string | null
  selectedId?: string | null
  onSelect: (id: string, title: string) => void
  rootLabel?: string
}

function MapScene({ units, completedIds, activeId, selectedId, onSelect, rootLabel = 'Goal' }: Props) {
  const placed = useMemo(() => placeUnits(units), [units])
  const completedSet = useMemo(() => new Set(completedIds), [completedIds])
  const statusMap = useMemo(
    () => new Map(placed.map(p => [p.unit.id, getStatus(p.unit, completedSet, activeId ?? null)])),
    [placed, completedSet, activeId]
  )
  const tiers = useMemo(() => [1, 2, 3, 4].filter(t => units.some(u => u.tier === t)), [units])

  return (
    <>
      <color attach="background" args={['#05060D']} />
      <fog attach="fog" args={['#05060D', 28, 60]} />

      {/* Ambient + directional lighting */}
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 8, 0]} intensity={6} color="#9F67F5" decay={2} />
      <pointLight position={[0, -4, 0]} intensity={1} color="#4B0082" decay={2} />
      <directionalLight position={[10, 10, 5]} intensity={0.4} color="#ffffff" />

      <StarField />

      {tiers.map(t => <OrbitalRing key={t} radius={TIER_RADIUS[t]} tier={t} />)}

      <SunNode label={rootLabel} />

      {placed.map(p => (
        <Planet
          key={p.unit.id}
          placed={p}
          status={statusMap.get(p.unit.id) ?? 'locked'}
          isSelected={p.unit.id === selectedId}
          isBlindSpot={p.unit.isBlindSpot}
          r={NODE_R[p.unit.tier] ?? 0.40}
          onSelect={() => onSelect(p.unit.id, p.unit.title)}
        />
      ))}

      <EffectComposer>
        <Bloom luminanceThreshold={0.08} luminanceSmoothing={0.8} intensity={1.6} mipmapBlur />
      </EffectComposer>

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={4}
        maxDistance={55}
        makeDefault
      />
    </>
  )
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function KnowledgeMap(props: Props) {
  if (!props.units?.length) return (
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="text-[#888888] text-sm">Generating your map…</span>
    </div>
  )

  return (
    <Canvas
      camera={{ position: [0, 20, 26], fov: 50, near: 0.1, far: 200 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%' }}
    >
      <MapScene {...props} />
    </Canvas>
  )
}
