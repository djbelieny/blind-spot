import {execFileSync} from 'node:child_process'
import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'public/videos')
const output = join(outDir, 'blindspot-explainer.mp4')
const poster = join(outDir, 'blindspot-explainer-poster.png')
const workDir = mkdtempSync(join(tmpdir(), 'blindspot-explainer-'))

const voiceover = `Você não sabe o que não sabe. E é exatamente isso que trava seu aprendizado. O BlindSpot começa perguntando seu objetivo: mandarim, programação, filosofia, qualquer coisa. Em poucos minutos, a inteligência artificial analisa suas respostas, seu ritmo e seus padrões de hesitação. Depois, ela revela os pontos cegos: as lacunas que você nem sabia que existiam. A partir daí, o app monta uma trilha prática, adaptada ao seu jeito de aprender, com sessões curtas e foco no que realmente importa. Menos conteúdo aleatório. Mais direção. BlindSpot: aprenda qualquer coisa, do jeito certo.`

const scenes = [
  {
    kicker: 'O problema',
    title: 'Você não sabe o que não sabe',
    body: 'BlindSpot começa onde o estudo comum falha: encontrando as lacunas invisíveis que travam sua evolução.',
  },
  {
    kicker: 'Passo 1',
    title: 'Diga seu objetivo',
    body: 'Mandarim, programação, filosofia, finanças ou qualquer outra habilidade. Você descreve onde quer chegar.',
  },
  {
    kicker: 'Passo 2',
    title: 'A AI encontra seus pontos cegos',
    body: 'O sistema analisa respostas, ritmo e hesitação para revelar o que você ainda não percebeu que falta.',
  },
  {
    kicker: 'Passo 3',
    title: 'Receba a trilha certa',
    body: 'Sessões curtas, conteúdo no ponto e uma sequência que se adapta ao seu jeito de aprender.',
  },
  {
    kicker: 'Resultado',
    title: 'Menos conteúdo aleatório. Mais direção.',
    body: 'BlindSpot transforma diagnóstico em ação para você aprender qualquer coisa do jeito certo.',
  },
]

function run(command, args) {
  execFileSync(command, args, {stdio: 'inherit'})
}

function capture(command, args) {
  return execFileSync(command, args, {encoding: 'utf8'}).trim()
}

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function wrap(text, max = 38) {
  const lines = []
  let current = ''
  for (const word of text.split(' ')) {
    const next = current ? `${current} ${word}` : word
    if (next.length > max && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines
}

function textBlock(lines, x, y, size, weight, color, lineHeight) {
  return `<text x="${x}" y="${y}" text-anchor="middle" font-family="Avenir Next, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${lines.map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`).join('')}</text>`
}

function sceneSvg(scene, index, logoData) {
  const titleLines = wrap(scene.title, 24)
  const bodyLines = wrap(scene.body, 54)
  const number = String(index + 1).padStart(2, '0')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs>
    <radialGradient id="bg1" cx="50%" cy="20%" r="70%">
      <stop offset="0%" stop-color="#24100b"/>
      <stop offset="45%" stop-color="#111111"/>
      <stop offset="100%" stop-color="#0d0d0d"/>
    </radialGradient>
    <linearGradient id="accent" x1="0" x2="1">
      <stop offset="0%" stop-color="#F94716"/>
      <stop offset="100%" stop-color="#FF8C5A"/>
    </linearGradient>
    <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="18" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="1920" height="1080" fill="url(#bg1)"/>
  <circle cx="265" cy="150" r="360" fill="#F94716" opacity="0.10" filter="url(#glow)"/>
  <circle cx="1625" cy="880" r="420" fill="#F94716" opacity="0.08" filter="url(#glow)"/>
  <g opacity="0.18">
    ${Array.from({length: 12}).map((_, i) => `<line x1="${260 + i * 124}" y1="190" x2="${360 + i * 124}" y2="890" stroke="#ffffff" stroke-width="1"/>`).join('')}
  </g>
  <g transform="translate(782 112)">
    <image href="${logoData}" x="0" y="0" width="118" height="102" preserveAspectRatio="xMidYMid meet"/>
    <text x="142" y="66" font-family="Avenir Next, Arial, sans-serif" font-size="48" font-weight="800" fill="#ffffff">BlindSpot</text>
  </g>
  <rect x="690" y="278" width="540" height="54" rx="27" fill="#F94716" opacity="0.12" stroke="#F94716" stroke-opacity="0.35"/>
  <circle cx="724" cy="305" r="6" fill="#F94716"/>
  <text x="960" y="314" text-anchor="middle" font-family="Avenir Next, Arial, sans-serif" font-size="22" font-weight="800" letter-spacing="4" fill="#F94716">${escapeXml(scene.kicker.toUpperCase())}</text>
  ${textBlock(titleLines, 960, 470, 78, 900, '#ffffff', 86)}
  ${textBlock(bodyLines, 960, 690, 34, 500, '#A6A6B7', 48)}
  <g transform="translate(850 852)">
    <rect width="220" height="62" rx="31" fill="url(#accent)" filter="url(#glow)"/>
    <text x="110" y="41" text-anchor="middle" font-family="Avenir Next, Arial, sans-serif" font-size="24" font-weight="900" fill="#fff">${number}</text>
  </g>
</svg>`
}

async function synthesizeVoiceover(audioPath) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? process.env.ELEVENLABS_VOICE_ENCORAJADOR ?? 'EXAVITQu4vr4xnSDxMaL'

  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is required to generate the voiceover.')
  }

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text: voiceover,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {stability: 0.52, similarity_boost: 0.76},
    }),
  })

  if (!res.ok) {
    throw new Error(`ElevenLabs TTS failed: ${res.status} ${await res.text()}`)
  }

  writeFileSync(audioPath, Buffer.from(await res.arrayBuffer()))
}

async function main() {
  const logo = readFileSync(resolve(root, 'public/blindspot-mark-gradient.png')).toString('base64')
  const logoData = `data:image/png;base64,${logo}`
  const audioPath = join(workDir, 'voiceover.mp3')

  await synthesizeVoiceover(audioPath)

  scenes.forEach((scene, i) => {
    const svg = join(workDir, `scene-${i + 1}.svg`)
    const png = join(workDir, `scene-${i + 1}.png`)
    writeFileSync(svg, sceneSvg(scene, i, logoData))
    run('magick', [svg, png])
  })

  const duration = Number(capture('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    audioPath,
  ]))
  const weights = [0.18, 0.2, 0.22, 0.22, 0.18]
  const concatPath = join(workDir, 'scenes.txt')
  const concat = scenes.flatMap((_, i) => {
    const seconds = Math.max(3, duration * weights[i])
    return [`file '${join(workDir, `scene-${i + 1}.png`).replace(/'/g, "'\\''")}'`, `duration ${seconds.toFixed(3)}`]
  })
  concat.push(`file '${join(workDir, `scene-${scenes.length}.png`).replace(/'/g, "'\\''")}'`)
  writeFileSync(concatPath, concat.join('\n'))

  run('ffmpeg', [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatPath,
    '-i', audioPath,
    '-vf', 'fps=30,scale=1920:1080,format=yuv420p',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '20',
    '-c:a', 'aac',
    '-b:a', '160k',
    '-movflags', '+faststart',
    '-shortest',
    output,
  ])
  run('magick', [join(workDir, 'scene-1.png'), '-resize', '1280x720', poster])

  console.log(`Wrote ${output}`)
  console.log(`Wrote ${poster}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
