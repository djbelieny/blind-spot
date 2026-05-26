import { QdrantClient } from '@qdrant/js-client-rest'

export const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL ?? 'http://localhost:6333',
})

export const COLLECTION_NAME = 'blind_spot_transcriptions'

export async function ensureCollection() {
  const collections = await qdrant.getCollections()
  const exists = collections.collections.some((c) => c.name === COLLECTION_NAME)
  if (!exists) {
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: { size: 1536, distance: 'Cosine' },
    })
  }
}
