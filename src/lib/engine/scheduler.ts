import type { StudyPlan } from '@/types/learner'

const POMODORO_CAP_MINUTES = 25
const DAYS_PER_WEEK = 5 // weekdays only

export interface ScheduleConfig {
  minutesPerDay: number
  totalMinutes: number
}

export function calculateCompletionDate(config: ScheduleConfig): Date {
  const { minutesPerDay, totalMinutes } = config

  const effectiveDaily = Math.min(minutesPerDay, POMODORO_CAP_MINUTES * 2)
  const daysNeeded = Math.ceil(totalMinutes / effectiveDaily)
  const weeksNeeded = Math.ceil(daysNeeded / DAYS_PER_WEEK)
  const calendarDays = weeksNeeded * 7

  const date = new Date()
  date.setDate(date.getDate() + calendarDays)
  return date
}

export function suggestDailyMinutes(urgency: 'immediate' | 'medium-term' | 'exploratory'): number {
  switch (urgency) {
    case 'immediate': return 25
    case 'medium-term': return 20
    case 'exploratory': return 10
  }
}

export function applyScheduleToplan(
  plan: StudyPlan,
  minutesPerDay: number,
  urgency: 'immediate' | 'medium-term' | 'exploratory'
): StudyPlan {
  const effective = minutesPerDay || suggestDailyMinutes(urgency)
  const total = plan.items.reduce((sum, item) => sum + item.estimatedMinutes, 0)
  const completionDate = calculateCompletionDate({ minutesPerDay: effective, totalMinutes: total })

  return {
    ...plan,
    dailyMinutes: effective,
    totalEstimatedMinutes: total,
    estimatedCompletionDate: completionDate,
  }
}
