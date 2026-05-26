import { NextRequest, NextResponse } from 'next/server'
import { analyzeGaps } from '@/lib/ai/gapanalysis'
import { generateStudyPlan } from '@/lib/ai/plangeneration'
import { generateDNAReveal } from '@/lib/ai/dnareveal'
import { searchCourses, buildSearchIndex } from '@/lib/engine/catalog'
import { getAllCourses } from '@/lib/cefis'
import { getProfile, updateProfile } from '@/lib/engine/progress'

export async function POST(req: NextRequest) {
  const { sessionId, quizResults, persona } = await req.json()

  const profile = await getProfile(sessionId)
  if (!profile) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  await updateProfile(sessionId, { stage: 'analyzing' })

  // Fetch CEFIS catalog
  let allCourses: unknown[] = []
  try {
    allCourses = await getAllCourses()
  } catch (e) {
    console.error('CEFIS catalog fetch failed:', e)
  }

  // Find relevant courses using BM25
  const index = buildSearchIndex(allCourses as Parameters<typeof buildSearchIndex>[0])
  const relevantCourses = searchCourses(profile.objective, index, 20)

  // Run gap analysis, plan generation, and DNA reveal in parallel
  const [blindSpots, dnaReveal] = await Promise.all([
    analyzeGaps(profile, quizResults ?? [], relevantCourses).catch(() => []),
    generateDNAReveal(
      profile,
      profile.language,
      (profile as unknown as Record<string, unknown>)['domain'] as string ?? profile.objective
    ).catch(() => ''),
  ])

  const studyPlan = await generateStudyPlan(profile, blindSpots, relevantCourses).catch(() => ({
    sessionId,
    items: [],
    totalEstimatedMinutes: 0,
    dailyMinutes: profile.minutesPerDay,
  }))

  await updateProfile(sessionId, {
    blindSpotsIdentified: blindSpots,
    recommendedCourseIds: studyPlan.items.map(i => i.courseId),
    persona: persona ?? undefined,
    stage: 'plan',
  })

  return NextResponse.json({ blindSpots, dnaReveal, studyPlan })
}
