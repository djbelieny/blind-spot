import { deepseekR1, MODELS } from './clients'
import type { LearnerProfile, StudyPlan, StudyPlanItem, BlindSpot, CEFISCourse } from '@/types/learner'

export async function generateStudyPlan(
  profile: LearnerProfile,
  blindSpots: BlindSpot[],
  availableCourses: CEFISCourse[]
): Promise<StudyPlan> {
  const courseSummary = availableCourses.slice(0, 20).map(c => ({
    id: c.id,
    title: c.title,
    duration: c.duration,
    keywords: (c.keywords ?? []).slice(0, 4),
  }))

  const prompt = `You are building a personalized study plan. Use minimal necessary content — maximum efficiency.

STUDENT:
- Objective: ${profile.objective}
- Time per day: ${profile.minutesPerDay} minutes
- Learning style: ${profile.learningStyle}
- Obstacle: ${profile.obstacle ?? 'none mentioned'}
- DNA type: ${profile.dnaType ?? 'explorer'}
- Blind spots to address: ${blindSpots.map(b => b.name).join(', ')}

BLIND SPOTS (ordered by priority):
${blindSpots.map(b => `- ${b.name}: ${b.description} (related: ${b.relatedCourseIds.join(', ')})`).join('\n')}

AVAILABLE COURSES:
${JSON.stringify(courseSummary, null, 2)}

Create a minimal effective study plan. Select 4-8 courses that form the shortest path from current knowledge to goal.
Order them logically. For each, write a personalized reason why THIS specific student needs it.

Return JSON:
{
  "items": [
    {
      "order": 1,
      "courseId": "id_from_list",
      "courseName": "course title",
      "reason": "personalized reason for this specific student, referencing their objective/obstacle",
      "estimatedMinutes": 30,
      "conceptsCovered": ["concept1", "concept2"]
    }
  ],
  "totalEstimatedMinutes": 120
}

Return ONLY valid JSON.`

  const res = await deepseekR1.chat.completions.create({
    model: MODELS.R1,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2000,
  })

  const content = res.choices[0].message.content ?? '{}'
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return { sessionId: profile.sessionId, items: [], totalEstimatedMinutes: 0, dailyMinutes: profile.minutesPerDay }
  }

  try {
    const data = JSON.parse(jsonMatch[0]) as { items?: unknown[]; totalEstimatedMinutes?: number }
    const items: StudyPlanItem[] = (data.items ?? []).map((item, i) => {
      const it = item as Record<string, unknown>
      return {
        order: (it['order'] as number) ?? i + 1,
        courseId: (it['courseId'] as string) ?? '',
        courseName: (it['courseName'] as string) ?? '',
        reason: (it['reason'] as string) ?? '',
        estimatedMinutes: (it['estimatedMinutes'] as number) ?? 20,
        conceptsCovered: (it['conceptsCovered'] as string[]) ?? [],
      }
    })
    return {
      sessionId: profile.sessionId,
      items,
      totalEstimatedMinutes: data.totalEstimatedMinutes ?? items.reduce((s, i) => s + i.estimatedMinutes, 0),
      dailyMinutes: profile.minutesPerDay,
    }
  } catch {
    return { sessionId: profile.sessionId, items: [], totalEstimatedMinutes: 0, dailyMinutes: profile.minutesPerDay }
  }
}
