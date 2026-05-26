export interface LearningUnit {
  id: string
  title: string
  description: string
  tier: number        // 1=foundation, 2=core, 3=application, 4=mastery
  prerequisites: string[]
  estimatedMinutes: number
  conceptTags: string[]
  isBlindSpot: boolean
  blindSpotId?: string | null
}

export interface Roadmap {
  sessionId: string
  objective: string
  units: LearningUnit[]
  generatedAt: string
}

export interface Flashcard {
  front: string
  back: string
}

export interface QuizItem {
  question: string
  options: string[]   // exactly 4 options
  answer: string      // must match one of the options exactly
  explanation: string
}

export interface UnitContent {
  unitId: string
  explanation: string
  keyPoints: string[]
  flashcards: Flashcard[]
  quiz: QuizItem[]
  podcastScript: string
  videoScript: string
  generatedAt: string
}
