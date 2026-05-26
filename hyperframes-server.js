const express = require('express')
const app = express()
app.use(express.json())

app.post('/render', async (req, res) => {
  const { html, filename } = req.body
  // Write HTML to temp file, render with HyperFrames, return video path
  const fs = require('fs')
  const path = require('path')
  const tmpHtml = path.join('/tmp', `${Date.now()}.html`)
  fs.writeFileSync(tmpHtml, html)
  // For MVP: return a placeholder response indicating rendering started
  res.json({ status: 'queued', filename: filename ?? `video-${Date.now()}.mp4` })
})

app.listen(3001, () => console.log('HyperFrames worker running on :3001'))
