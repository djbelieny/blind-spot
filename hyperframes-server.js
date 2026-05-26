const express = require('express')
const { Producer } = require('@hyperframes/producer')
const fs = require('fs')
const path = require('path')
const os = require('os')
const crypto = require('crypto')

const app = express()
app.use(express.json({ limit: '2mb' }))

const OUTPUT_DIR = path.join(os.tmpdir(), 'hf-output')
fs.mkdirSync(OUTPUT_DIR, { recursive: true })

// Templates for each moment type
const TEMPLATES = {
  dna_reveal: (data) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 640px; height: 360px; background: #0A0C14; display: flex; align-items: center; justify-content: center; font-family: Inter, sans-serif; overflow: hidden; }
  .container { text-align: center; padding: 40px; }
  .label { color: #F5A623; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 16px; opacity: 0; animation: fadeIn 0.5s ease 0.2s forwards; }
  .title { color: #F0F0F5; font-size: 28px; font-weight: 300; margin-bottom: 12px; opacity: 0; animation: fadeIn 0.6s ease 0.5s forwards; }
  .dna { color: #F5A623; font-size: 22px; font-weight: 600; margin-bottom: 24px; opacity: 0; animation: fadeIn 0.6s ease 0.8s forwards; }
  .sub { color: #8A8FA8; font-size: 14px; line-height: 1.6; opacity: 0; animation: fadeIn 0.5s ease 1.1s forwards; }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: #F5A623; display: inline-block; margin: 0 4px; animation: pulse 1.5s ease-in-out infinite; }
  .dot:nth-child(2) { animation-delay: 0.3s; }
  .dot:nth-child(3) { animation-delay: 0.6s; }
  @keyframes fadeIn { to { opacity: 1; transform: translateY(0); } from { opacity: 0; transform: translateY(8px); } }
  @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
</style>
</head>
<body>
<div class="container">
  <div class="label">Blind Spot · Learning DNA</div>
  <div class="title">You are a <span style="color:#F5A623">${data.dnaType ?? 'Practical Explorer'}</span></div>
  <div class="dna">${data.objective ?? 'Your path forward'}</div>
  <div class="sub">${data.minutesPerDay ?? 20} min/day · ${data.persona ?? 'Coach'} mode<br><br><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
</div>
</body>
</html>`,

  blind_spot: (data) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 640px; height: 360px; background: #0A0C14; display: flex; align-items: center; justify-content: center; font-family: Inter, sans-serif; overflow: hidden; }
  .container { text-align: center; padding: 40px; }
  .label { color: #F5A623; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 20px; opacity: 0; animation: fadeIn 0.5s ease 0.3s forwards; }
  .name { color: #F0F0F5; font-size: 24px; font-weight: 500; margin-bottom: 16px; opacity: 0; animation: fadeIn 0.6s ease 0.6s forwards; }
  .conf { color: #F5A623; font-size: 48px; font-weight: 700; margin-bottom: 12px; opacity: 0; animation: countUp 0.8s ease 1s forwards; }
  .evidence { color: #8A8FA8; font-size: 13px; line-height: 1.6; max-width: 480px; opacity: 0; animation: fadeIn 0.5s ease 1.5s forwards; }
  .bar { width: 200px; height: 3px; background: #1a1f2e; border-radius: 2px; margin: 16px auto; overflow: hidden; opacity: 0; animation: fadeIn 0.3s ease 1s forwards; }
  .bar-fill { height: 100%; background: #F5A623; border-radius: 2px; width: 0; animation: grow 0.8s ease 1.2s forwards; }
  @keyframes fadeIn { to { opacity: 1; } }
  @keyframes countUp { to { opacity: 1; } }
  @keyframes grow { to { width: ${data.confidence ?? 84}%; } }
</style>
</head>
<body>
<div class="container">
  <div class="label">Blind Spot Identified</div>
  <div class="name">${data.name ?? 'Gap detected'}</div>
  <div class="conf">${data.confidence ?? 84}%</div>
  <div class="bar"><div class="bar-fill"></div></div>
  <div class="evidence">${data.evidence ?? 'Based on your diagnostic answers'}</div>
</div>
</body>
</html>`,

  session_start: (data) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 640px; height: 360px; background: #0A0C14; display: flex; align-items: center; justify-content: center; font-family: Inter, sans-serif; overflow: hidden; }
  .container { text-align: center; padding: 40px; }
  .label { color: #8A8FA8; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 16px; opacity: 0; animation: fadeIn 0.4s ease 0.1s forwards; }
  .title { color: #F0F0F5; font-size: 26px; font-weight: 300; margin-bottom: 20px; opacity: 0; animation: fadeIn 0.6s ease 0.4s forwards; }
  .goal { display: inline-block; background: rgba(245,166,35,0.1); border: 1px solid rgba(245,166,35,0.3); color: #F5A623; padding: 8px 20px; border-radius: 100px; font-size: 14px; margin-bottom: 24px; opacity: 0; animation: fadeIn 0.5s ease 0.8s forwards; }
  .time { color: #34C785; font-size: 13px; opacity: 0; animation: fadeIn 0.4s ease 1.1s forwards; }
  @keyframes fadeIn { to { opacity: 1; transform: translateY(0); } from { opacity: 0; transform: translateY(6px); } }
</style>
</head>
<body>
<div class="container">
  <div class="label">Today's session</div>
  <div class="title">${data.courseName ?? 'Your next step'}</div>
  <div class="goal">${data.blindSpotName ?? 'Fixing your top gap'}</div>
  <div class="time">${data.estimatedMinutes ?? 20} min · ${data.language === 'pt-BR' ? 'Foco total' : 'Full focus'}</div>
</div>
</body>
</html>`,

  session_end: (data) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 640px; height: 360px; background: #0A0C14; display: flex; align-items: center; justify-content: center; font-family: Inter, sans-serif; overflow: hidden; }
  .container { text-align: center; padding: 40px; }
  .label { color: #34C785; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 20px; opacity: 0; animation: fadeIn 0.4s ease 0.2s forwards; }
  .score { color: #F0F0F5; font-size: 64px; font-weight: 700; margin-bottom: 8px; opacity: 0; animation: fadeIn 0.5s ease 0.5s forwards; }
  .score span { color: #34C785; }
  .msg { color: #8A8FA8; font-size: 15px; margin-bottom: 24px; opacity: 0; animation: fadeIn 0.5s ease 0.9s forwards; }
  .learned { color: #F5A623; font-size: 14px; max-width: 440px; line-height: 1.6; opacity: 0; animation: fadeIn 0.5s ease 1.2s forwards; }
  @keyframes fadeIn { to { opacity: 1; } }
</style>
</head>
<body>
<div class="container">
  <div class="label">${data.language === 'pt-BR' ? 'Sessão concluída' : 'Session complete'}</div>
  <div class="score">${data.score ?? 85}<span>%</span></div>
  <div class="msg">${data.language === 'pt-BR' ? 'Resultado do checkpoint' : 'Checkpoint score'}</div>
  <div class="learned">${data.learned ?? (data.language === 'pt-BR' ? 'Você entendeu o conceito principal desta sessão.' : 'You grasped the key concept in this session.')}</div>
</div>
</body>
</html>`,
}

app.post('/render', async (req, res) => {
  const { type = 'dna_reveal', data = {}, fps = 30, duration = 3 } = req.body
  const id = crypto.randomBytes(8).toString('hex')
  const outputPath = path.join(OUTPUT_DIR, `${id}.mp4`)

  const templateFn = TEMPLATES[type] ?? TEMPLATES.dna_reveal
  const html = templateFn(data)

  try {
    const producer = new Producer({ fps, width: 640, height: 360 })
    await producer.render({ html, outputPath, duration })
    const videoBuffer = fs.readFileSync(outputPath)
    res.set('Content-Type', 'video/mp4')
    res.send(videoBuffer)
    fs.unlink(outputPath, () => {})
  } catch (err) {
    console.error('Render error:', err)
    res.status(500).json({ error: err.message })
  }
})

app.get('/health', (_, res) => res.json({ ok: true }))

app.listen(3001, () => console.log('HyperFrames worker on :3001'))
