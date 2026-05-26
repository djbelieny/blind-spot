import type { CEFISCourse } from '@/types/learner'

// Simple BM25-like search index using FlexSearch
// We use a plain in-memory approach to avoid FlexSearch ESM issues in Next.js

interface SearchEntry {
  id: string
  text: string
  course: CEFISCourse
}

export interface SearchIndex {
  entries: SearchEntry[]
}

export function buildSearchIndex(courses: CEFISCourse[]): SearchIndex {
  const entries: SearchEntry[] = courses.map(course => ({
    id: course.id,
    text: [
      course.title ?? '',
      course.description ?? '',
      ...(course.keywords ?? []),
    ]
      .join(' ')
      .toLowerCase(),
    course,
  }))
  return { entries }
}

export function searchCourses(
  query: string,
  index: SearchIndex,
  limit = 20
): CEFISCourse[] {
  if (!query.trim() || !index.entries.length) return index.entries.slice(0, limit).map(e => e.course)

  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(t => t.length > 2)

  if (!terms.length) return index.entries.slice(0, limit).map(e => e.course)

  const scored = index.entries.map(entry => {
    let score = 0
    for (const term of terms) {
      // Count occurrences (BM25-inspired: diminishing returns)
      const occurrences = (entry.text.match(new RegExp(term, 'g')) ?? []).length
      score += Math.log(1 + occurrences)

      // Title match bonus
      if ((entry.course.title ?? '').toLowerCase().includes(term)) {
        score += 2
      }
    }
    return { course: entry.course, score }
  })

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.course)
}
