import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { renderScenePng, type SceneData } from './svgScenes'
import { logCost, calcOpenAITTSCost } from '@/lib/costs'

export interface VideoJobParams {
  cacheKey: string
  sessionId: string
  unitId: string
  topic: string
  unitTitle: string
  videoScript: string
  explanation: string
  keyPoints: string[]
  language: string
}

export function calcVideoKey(sessionId: string, unitId: string, topic: string): string {
  const topicSlug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40)
  return `${sessionId.slice(0, 12)}_${unitId.slice(0, 12)}_${topicSlug}`
}

function parseVideoSections(script: string): Array<{ label: string; text: string }> {
  const labels = ['HOOK', 'CORE CONCEPT', 'EXAMPLE', 'TAKEAWAY']
  const sections: Array<{ label: string; text: string }> = []
  let remaining = script
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i]
    const nextLabel = labels[i + 1]
    const startTag = `[${label}`
    const startIdx = remaining.indexOf(startTag)
    if (startIdx === -1) continue
    const contentStart = remaining.indexOf(']', startIdx) + 1
    const endIdx = nextLabel ? remaining.indexOf(`[${nextLabel}`) : remaining.length
    const text = remaining.slice(contentStart, endIdx === -1 ? remaining.length : endIdx).trim()
    sections.push({ label, text })
    remaining = remaining.slice(endIdx === -1 ? remaining.length : endIdx)
  }
  return sections
}

function deriveTitle(text: string, label: string): string {
  const cleaned = text.replace(/\n/g, ' ').trim()
  const words = cleaned.split(' ').slice(0, 8)
  if (words.length === 0) return label
  const title = words.join(' ')
  // Remove trailing punctuation except question mark
  return title.replace(/[,;:.]$/, '')
}

function deriveBody(text: string): string {
  const cleaned = text.replace(/\n/g, ' ').trim()
  return cleaned.slice(0, 120) + (cleaned.length > 120 ? '…' : '')
}

function run(command: string, args: string[]): void {
  execFileSync(command, args, { stdio: 'inherit' })
}

function capture(command: string, args: string[]): string {
  return execFileSync(command, args, { encoding: 'utf8' }).trim()
}

export async function generateLessonVideo(params: VideoJobParams): Promise<void> {
  const {
    cacheKey,
    videoScript,
    sessionId,
  } = params

  const workDir = mkdtempSync(join(tmpdir(), 'blindspot-lesson-'))

  try {
    // 1. Parse video script sections
    const sections = parseVideoSections(videoScript)

    // Fallback: if parsing yields fewer than 4 sections, fill with placeholders
    const labels = ['HOOK', 'CORE CONCEPT', 'EXAMPLE', 'TAKEAWAY']
    const allSections = labels.map((label, i) => {
      const found = sections.find(s => s.label === label)
      if (found) return found
      return { label, text: sections[i]?.text ?? params.explanation.slice(0, 200) }
    })

    // 2. Build scene data
    const scenes: SceneData[] = allSections.map(s => ({
      label: s.label,
      title: deriveTitle(s.text, s.label),
      body: deriveBody(s.text),
    }))

    // 3. Load logo as base64
    const logoPath = resolve(process.cwd(), 'public/blindspot-mark-gradient.png')
    const logoBase64 = readFileSync(logoPath).toString('base64')

    // 4. Render scene PNGs via rsvg-convert (writes SVG + PNG into workDir)
    const pngPaths: string[] = []
    for (let i = 0; i < scenes.length; i++) {
      renderScenePng(scenes[i], i, scenes.length, logoBase64, workDir)
      pngPaths.push(join(workDir, `scene${i}.png`))
    }

    // 5. Generate voiceover via OpenAI TTS
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured')

    const voice = process.env.OPENAI_VOICE_HOST_A ?? 'onyx'
    const fullScriptText = allSections.map(s => s.text).join(' ')

    const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'tts-1-hd',
        voice,
        input: fullScriptText.slice(0, 4096),
        response_format: 'mp3',
      }),
    })

    if (!ttsRes.ok) {
      const body = await ttsRes.text().catch(() => '')
      throw new Error(`OpenAI TTS ${ttsRes.status}: ${body.slice(0, 200)}`)
    }

    const audioBuffer = Buffer.from(await ttsRes.arrayBuffer())
    const audioPath = join(workDir, 'voiceover.mp3')
    writeFileSync(audioPath, audioBuffer)

    // Log TTS cost
    logCost({
      type: 'openai_tts',
      model: 'tts-1-hd',
      endpoint: '/api/lesson-video/generate',
      sessionId,
      characters: Math.min(fullScriptText.length, 4096),
      cost: calcOpenAITTSCost(Math.min(fullScriptText.length, 4096)),
    }).catch(() => {})

    // 6. Get audio duration via ffprobe
    const durationStr = capture('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      audioPath,
    ])
    const audioDuration = parseFloat(durationStr)
    if (isNaN(audioDuration) || audioDuration <= 0) throw new Error('ffprobe returned invalid duration')

    // 7. Compute per-scene durations
    const weights = [0.20, 0.28, 0.28, 0.24]
    const minDuration = 4
    const durations = weights.map(w => Math.max(minDuration, audioDuration * w))

    // 8. Build ffmpeg filter_complex with zoompan + fade
    const FPS = 30
    const fadeDuration = 0.5

    // Build filter_complex segments
    const filterParts: string[] = []
    for (let i = 0; i < 4; i++) {
      const dur = durations[i]
      const frames = Math.round(dur * FPS)
      const isFirst = i === 0
      const isLast = i === 3

      let filters = `[${i}:v]scale=1920:1080,zoompan=z='min(zoom+0.0003,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1920x1080`

      // Fade in (all except first)
      if (!isFirst) {
        filters += `,fade=t=in:st=0:d=${fadeDuration}`
      }

      // Fade out (all except last)
      if (!isLast) {
        const fadeOutStart = Math.max(0, dur - fadeDuration)
        filters += `,fade=t=out:st=${fadeOutStart.toFixed(3)}:d=${fadeDuration}`
      }

      filters += `[v${i}]`
      filterParts.push(filters)
    }

    const concatFilter = `[v0][v1][v2][v3]concat=n=4:v=1:a=0[outv]`
    const filterComplex = [...filterParts, concatFilter].join(';\n  ')

    // 9. Build ffmpeg args
    const outputPath = join(workDir, 'output.mp4')
    const ffmpegArgs: string[] = ['-y']

    // Input each scene image with its duration
    for (let i = 0; i < 4; i++) {
      ffmpegArgs.push('-loop', '1', '-t', durations[i].toFixed(3), '-i', pngPaths[i])
    }

    // Audio input
    ffmpegArgs.push('-i', audioPath)

    // Filter complex
    ffmpegArgs.push(
      '-filter_complex', filterComplex,
      '-map', '[outv]',
      '-map', '4:a',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '22',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '160k',
      '-movflags', '+faststart',
      '-shortest',
      outputPath,
    )

    run('ffmpeg', ffmpegArgs)

    // 10. Extract poster frame
    const posterPath = join(workDir, 'poster.png')
    run('ffmpeg', [
      '-y',
      '-ss', '0.5',
      '-i', outputPath,
      '-frames:v', '1',
      posterPath,
    ])

    // 11. Ensure output directory exists
    const outDir = resolve(process.cwd(), 'public/generated/lesson-videos')
    mkdirSync(outDir, { recursive: true })

    // 12. Copy files to public directory (copyFileSync works across devices/volumes)
    const finalVideoPath = join(outDir, `${cacheKey}.mp4`)
    const finalPosterPath = join(outDir, `${cacheKey}-poster.png`)
    copyFileSync(outputPath, finalVideoPath)
    copyFileSync(posterPath, finalPosterPath)

  } finally {
    // 14. Clean up temp dir
    try {
      rmSync(workDir, { recursive: true, force: true })
    } catch {
      // Best-effort cleanup
    }
  }
}
