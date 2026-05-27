export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { existsSync, statSync, createReadStream } from 'node:fs'
import { join } from 'node:path'
import { Readable } from 'node:stream'

export const VIDEO_DIR = '/data/lesson-videos'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params

  // Prevent path traversal — only alphanumeric, underscores, dashes, dots
  if (!/^[\w-]+\.(mp4|png)$/.test(filename)) {
    return new NextResponse(null, { status: 400 })
  }

  const filePath = join(VIDEO_DIR, filename)
  if (!existsSync(filePath)) {
    return new NextResponse(null, { status: 404 })
  }

  const { size } = statSync(filePath)
  const isVideo = filename.endsWith('.mp4')
  const contentType = isVideo ? 'video/mp4' : 'image/png'
  const range = req.headers.get('range')

  if (isVideo && range) {
    const [s, e] = range.replace(/bytes=/, '').split('-')
    const start = parseInt(s, 10)
    const end = e ? parseInt(e, 10) : size - 1
    const webStream = Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream
    return new NextResponse(webStream, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(end - start + 1),
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=604800',
      },
    })
  }

  const webStream = Readable.toWeb(createReadStream(filePath)) as ReadableStream
  return new NextResponse(webStream, {
    headers: {
      'Content-Length': String(size),
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=604800',
    },
  })
}
