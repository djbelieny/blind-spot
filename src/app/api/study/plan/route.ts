import { NextRequest, NextResponse } from 'next/server'
import { getProfile } from '@/lib/engine/progress'
import { getAllCourses } from '@/lib/cefis'

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })

  const profile = await getProfile(sessionId)
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let courses: Array<{ id: string; title: string; description: string }> = []
  try {
    courses = await getAllCourses()
  } catch {
    // continue without enrichment
  }

  const planItems = profile.recommendedCourseIds.map((id, i) => {
    const course = courses.find(c => c.id === id)
    return {
      order: i + 1,
      courseId: id,
      courseName: course?.title ?? id,
      description: course?.description ?? '',
    }
  })

  return NextResponse.json({
    blindSpots: profile.blindSpotsIdentified,
    planItems,
    objective: profile.objective,
    dailyMinutes: profile.minutesPerDay,
  })
}
