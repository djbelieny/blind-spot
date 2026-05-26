import { qdrant, COLLECTION_NAME } from '@/lib/qdrant'
import { deepseekV3 } from '@/lib/ai/clients'
import type { TextChunk } from '@/types/learner'

const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIM = 1536

async function embed(text: string): Promise<number[]> {
  try {
    const res = await deepseekV3.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    })
    return res.data[0].embedding
  } catch {
    return new Array(EMBEDDING_DIM).fill(0)
  }
}

export async function upsertChunks(chunks: TextChunk[]): Promise<void> {
  const BATCH = 100
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH)
    const vectors = await Promise.all(batch.map(c => embed(c.content)))
    const points = batch.map((chunk, idx) => ({
      id: chunk.id,
      vector: vectors[idx],
      payload: {
        courseId: chunk.courseId,
        lessonId: chunk.lessonId,
        content: chunk.content,
        language: chunk.language,
      },
    }))
    await qdrant.upsert(COLLECTION_NAME, { wait: true, points })
  }
}

export async function searchSimilar(
  query: string,
  limit = 5,
  courseIds?: string[]
): Promise<TextChunk[]> {
  try {
    const vector = await embed(query)
    const filter = courseIds?.length
      ? { must: [{ key: 'courseId', match: { any: courseIds } }] }
      : undefined

    const results = await qdrant.search(COLLECTION_NAME, {
      vector,
      limit,
      filter,
      with_payload: true,
    })

    return results.map(r => ({
      id: String(r.id),
      courseId: (r.payload?.courseId as string) ?? '',
      lessonId: (r.payload?.lessonId as string) ?? '',
      content: (r.payload?.content as string) ?? '',
      language: (r.payload?.language as string) ?? 'pt-BR',
    }))
  } catch {
    return []
  }
}

export function chunkTranscript(
  text: string,
  courseId: string,
  lessonId: string,
  wordsPerChunk = 300
): TextChunk[] {
  const words = text.split(/\s+/)
  const chunks: TextChunk[] = []
  let i = 0

  while (i < words.length) {
    const slice = words.slice(i, i + wordsPerChunk).join(' ')
    chunks.push({
      id: `${courseId}-${lessonId}-${i}`,
      courseId,
      lessonId,
      content: slice,
      language: 'pt-BR',
    })
    i += wordsPerChunk
  }

  return chunks
}
