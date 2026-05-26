import { NextRequest, NextResponse } from 'next/server'

const HYPERFRAMES_URL = process.env.HYPERFRAMES_URL ?? 'http://hyperframes:3001'

export async function POST(req: NextRequest) {
  const body = await req.json()

  try {
    const res = await fetch(`${HYPERFRAMES_URL}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Render failed' }, { status: 502 })
    }

    const videoBuffer = await res.arrayBuffer()
    return new NextResponse(videoBuffer, {
      headers: { 'Content-Type': 'video/mp4', 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json({ error: 'HyperFrames worker unavailable' }, { status: 503 })
  }
}
