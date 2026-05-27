import { execFileSync } from 'node:child_process'
import { writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface SceneData {
  label: string  // 'HOOK' | 'CORE CONCEPT' | 'EXAMPLE' | 'TAKEAWAY'
  title: string  // short headline (max 8 words)
  body: string   // 1–2 sentence summary
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function wrap(text: string, max = 38): string[] {
  const lines: string[] = []
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

function textBlock(
  lines: string[],
  x: number,
  y: number,
  size: number,
  weight: number,
  color: string,
  lineHeight: number,
): string {
  return `<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${
    lines.map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`).join('')
  }</text>`
}

function progressDots(current: number, total: number): string {
  const dotSpacing = 20
  const dotRadius = 5
  const totalWidth = (total - 1) * dotSpacing
  const startX = 960 - totalWidth / 2
  const y = 980

  return Array.from({ length: total })
    .map((_, i) => {
      const cx = startX + i * dotSpacing
      if (i === current) {
        return `<circle cx="${cx}" cy="${y}" r="${dotRadius}" fill="#F94716"/>`
      }
      return `<circle cx="${cx}" cy="${y}" r="${dotRadius}" fill="none" stroke="#F94716" stroke-width="1.5" opacity="0.5"/>`
    })
    .join('\n')
}

export function buildSceneSvg(
  scene: SceneData,
  index: number,
  total: number,
  logoBase64: string,
): string {
  const titleLines = wrap(scene.title, 22)
  const bodyLines = wrap(scene.body, 50)
  const number = String(index + 1).padStart(2, '0')
  const totalStr = String(total).padStart(2, '0')
  const logoData = `data:image/png;base64,${logoBase64}`

  const titleY = 460
  const titleLineCount = titleLines.length
  const titleBottom = titleY + (titleLineCount - 1) * 94
  const bodyY = titleBottom + 80

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs>
    <radialGradient id="bg1" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#111111"/>
      <stop offset="100%" stop-color="#0d0d0d"/>
    </radialGradient>
    <filter id="glowSoft" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="40" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1920" height="1080" fill="url(#bg1)"/>

  <!-- Orange glow orbs -->
  <circle cx="220" cy="180" r="380" fill="#F94716" opacity="0.07" filter="url(#glowSoft)"/>
  <circle cx="1700" cy="900" r="440" fill="#F94716" opacity="0.06" filter="url(#glowSoft)"/>

  <!-- Diagonal grid lines -->
  ${Array.from({ length: 14 })
    .map((_, i) => `<line x1="${220 + i * 120}" y1="80" x2="${380 + i * 120}" y2="1000" stroke="#ffffff" stroke-width="1" opacity="0.05"/>`)
    .join('\n  ')}

  <!-- Top-left: Logo mark + wordmark -->
  <g transform="translate(52 44)">
    <image href="${logoData}" x="0" y="0" width="68" height="58" preserveAspectRatio="xMidYMid meet"/>
    <text x="82" y="42" font-family="Arial, sans-serif" font-size="34" font-weight="800" fill="#ffffff" letter-spacing="1">BlindSpot</text>
  </g>

  <!-- Section label pill -->
  <rect x="${960 - 160}" y="290" width="320" height="48" rx="24" fill="#F94716" fill-opacity="0.10" stroke="#F94716" stroke-opacity="0.40" stroke-width="1.5"/>
  <text x="960" y="323" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="5" fill="#F94716">${escapeXml(scene.label.toUpperCase())}</text>

  <!-- Title -->
  ${textBlock(titleLines, 960, titleY, 82, 800, '#ffffff', 94)}

  <!-- Body -->
  ${textBlock(bodyLines, 960, bodyY, 32, 400, '#A6A6B7', 46)}

  <!-- Progress dots -->
  ${progressDots(index, total)}

  <!-- Scene counter bottom-right -->
  <text x="1868" y="1010" text-anchor="end" font-family="Arial, sans-serif" font-size="20" font-weight="400" fill="#888888" opacity="0.6" letter-spacing="2">${number} / ${totalStr}</text>
</svg>`
}

/**
 * Renders a scene SVG to PNG using rsvg-convert (librsvg).
 * Writes temp SVG to workDir, runs rsvg-convert, returns PNG as Buffer.
 */
export function renderScenePng(
  scene: SceneData,
  index: number,
  total: number,
  logoBase64: string,
  workDir: string,
): Buffer {
  const svgPath = join(workDir, `scene${index}.svg`)
  const pngPath = join(workDir, `scene${index}.png`)

  const svgContent = buildSceneSvg(scene, index, total, logoBase64)
  writeFileSync(svgPath, svgContent)

  execFileSync('rsvg-convert', [
    '-w', '1920',
    '-h', '1080',
    '-f', 'png',
    '-o', pngPath,
    svgPath,
  ])

  return readFileSync(pngPath)
}
