// Boot script: indexes CEFIS lesson transcriptions into Qdrant for RAG
// Run: npx ts-node --project tsconfig.scripts.json scripts/index-cefis.ts
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function main() {
  const { getAllCourses, getLessons } = await import('../src/lib/cefis')
  const { ensureCollection } = await import('../src/lib/qdrant')
  const { chunkTranscript, upsertChunks } = await import('../src/lib/engine/rag')

  await ensureCollection()
  const courses = await getAllCourses()
  console.log(`Found ${courses.length} courses. Indexing...`)

  let totalChunks = 0
  for (const course of courses) {
    try {
      const lessons = await getLessons(course.id)
      for (const lesson of lessons) {
        const url = lesson.transcriptionUrl ?? lesson.transcription_url
        if (!url) continue
        const res = await fetch(url)
        if (!res.ok) continue
        const text = await res.text()
        if (!text.trim()) continue
        const chunks = chunkTranscript(text, course.id, lesson.id)
        await upsertChunks(chunks)
        totalChunks += chunks.length
        console.log(`  ✓ ${course.title} / ${lesson.title} (${chunks.length} chunks)`)
      }
    } catch (e) {
      console.error(`  ✗ ${course.id}:`, (e as Error).message)
    }
  }
  console.log(`Done. Indexed ${totalChunks} chunks.`)
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
