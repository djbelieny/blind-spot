'use client'
import { useEffect, useRef, useCallback } from 'react'

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  opacity: number
  targetOpacity: number
  size: number
  color: string
  pulsing: boolean
  pulsePhase: number
}

interface ConstellationBackgroundProps {
  nodeCount?: number
  pulsingNodeIds?: number[]
  allGreen?: boolean
  className?: string
}

export default function ConstellationBackground({
  nodeCount = 0,
  pulsingNodeIds = [],
  allGreen = false,
  className = '',
}: ConstellationBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<Node[]>([])
  const frameRef = useRef<number>(0)
  const prevCountRef = useRef(0)

  const addNodes = useCallback((count: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const toAdd = count - prevCountRef.current
    for (let i = 0; i < toAdd; i++) {
      nodesRef.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        opacity: 0,
        targetOpacity: 0.3 + Math.random() * 0.3,
        size: 2 + Math.random() * 2,
        color: '#7C3AED',
        pulsing: false,
        pulsePhase: Math.random() * Math.PI * 2,
      })
    }
    prevCountRef.current = count
  }, [])

  useEffect(() => {
    addNodes(nodeCount)
  }, [nodeCount, addNodes])

  useEffect(() => {
    pulsingNodeIds.forEach(id => {
      if (nodesRef.current[id]) {
        nodesRef.current[id].pulsing = true
        nodesRef.current[id].targetOpacity = 1
        nodesRef.current[id].color = '#7C3AED'
      }
    })
  }, [pulsingNodeIds])

  useEffect(() => {
    if (allGreen) {
      nodesRef.current.forEach(n => { n.color = '#34C785'; n.targetOpacity = 0.6 })
    }
  }, [allGreen])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const nodes = nodesRef.current
      const time = Date.now() / 1000

      // Draw edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 150) {
            const alpha = (1 - dist / 150) * 0.08
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(245, 166, 35, ${alpha})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      // Draw nodes
      nodes.forEach(node => {
        node.opacity += (node.targetOpacity - node.opacity) * 0.02
        node.x += node.vx
        node.y += node.vy
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1

        let size = node.size
        let opacity = node.opacity
        if (node.pulsing) {
          const pulse = Math.sin(time * 3 + node.pulsePhase)
          size = node.size + pulse * 3
          opacity = node.opacity + pulse * 0.3
        }

        const hex = node.color
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)

        ctx.beginPath()
        ctx.arc(node.x, node.y, size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`
        ctx.fill()
      })

      frameRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(frameRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none ${className}`}
      style={{ zIndex: 0 }}
    />
  )
}
