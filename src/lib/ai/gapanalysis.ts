import { deepseekR1, MODELS } from './clients'
import type { LearnerProfile, BlindSpot, CEFISCourse } from '@/types/learner'

export async function analyzeGaps(
  profile: LearnerProfile,
  quizResults: Array<{ questionId: string; correct: boolean; conceptTag: string; timeToAnswerMs: number }>,
  topCourses: CEFISCourse[]
): Promise<BlindSpot[]> {
  const wrongConcepts = quizResults.filter(r => !r.correct).map(r => r.conceptTag)
  const slowCorrect = quizResults.filter(r => r.correct && r.timeToAnswerMs > 30000).map(r => r.conceptTag)

  const courseSummary = topCourses.slice(0, 15).map(c => ({
    id: c.id,
    title: c.title,
    keywords: (c.keywords ?? []).slice(0, 5),
  }))

  const prompt = `You are a learning diagnostic expert. Analyze this student's gaps with deep reasoning.

STUDENT PROFILE:
- Objective: ${profile.objective}
- Background level: ${profile.backgroundLevel}
- Domain: ${(profile as unknown as Record<string, unknown>)['domain'] ?? 'not specified'}
- Obstacle they mentioned: ${profile.obstacle ?? 'none'}

QUIZ RESULTS:
- Wrong answers on concepts: ${wrongConcepts.join(', ') || 'none'}
- Slow correct answers (possible uncertainty): ${slowCorrect.join(', ') || 'none'}
- Baseline score: ${profile.baselineScore}/100

AVAILABLE COURSES:
${JSON.stringify(courseSummary, null, 2)}

Identify the 3 most important blind spots. For each, explain:
1. What they don't know they don't know
2. Why it's blocking their objective
3. The evidence from their quiz performance

Return JSON array:
[
  {
    "id": "bs1",
    "name": "Short name of blind spot",
    "description": "What they are missing and why it matters",
    "confidence": 85,
    "evidence": "They missed X when Y changed, suggesting they haven't encountered Z",
    "impact": "This is why problems feel unpredictable in this area",
    "estimatedFixMinutes": 20,
    "relatedCourseIds": ["course_id_from_list"],
    "conceptTag": "concept-kebab",
    "prerequisiteTag": "prereq-concept-or-null",
    "status": "identified"
  }
]

Return ONLY valid JSON array.`

  const res = await deepseekR1.chat.completions.create({
    model: MODELS.R1,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2000,
  })

  const content = res.choices[0].message.content ?? '[]'
  // R1 may include reasoning before JSON — extract JSON array
  const jsonMatch = content.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []
  try {
    const spots = JSON.parse(jsonMatch[0])
    return (spots as BlindSpot[]).map((s, i) => ({ ...s, id: s.id ?? `bs${i + 1}`, status: 'identified' as const }))
  } catch {
    return []
  }
}
