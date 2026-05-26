export type Language = 'pt-BR' | 'en'
export type CommunicationStyle = 'formal' | 'casual' | 'technical' | 'simple'
export type BackgroundLevel = 'novice' | 'intermediate' | 'expert'
export type Urgency = 'immediate' | 'medium-term' | 'exploratory'
export type MotivationType = 'career' | 'curiosity' | 'academic' | 'survival'
export type LearningStyle = 'visual' | 'reading' | 'practice' | 'auditory'
export type Rhythm = 'sprints' | 'deep-dive'
export type PersonaType = 'direto' | 'encorajador' | 'socratico'
export type DNAType = 'explorador' | 'absorvedor' | 'construtor' | 'conector' | 'sprint'
export type AgeProxy = 'young' | 'adult' | 'senior'
export type OnboardingStage =
  | 'entry'
  | 'connection_chat'
  | 'quiz'
  | 'persona_selection'
  | 'analyzing'
  | 'dna_reveal'
  | 'blind_spot_reveal'
  | 'first_fix'
  | 'plan'
  | 'account_gate'
  | 'dashboard'

export interface LearnerProfile {
  sessionId: string
  language: Language
  communicationStyle: CommunicationStyle
  ageProxy: AgeProxy
  backgroundLevel: BackgroundLevel
  urgency: Urgency
  motivationType: MotivationType
  obstacle?: string
  objective: string
  timeframe?: string
  minutesPerDay: number
  learningStyle: LearningStyle
  rhythm: Rhythm
  challengeLevel: 'challenged' | 'comfortable'
  persona?: PersonaType
  dnaType?: DNAType
  baselineScore: number
  blindSpotsIdentified: BlindSpot[]
  recommendedCourseIds: string[]
  stage: OnboardingStage
  userId?: string
  cefisToken?: string
  cefisUserId?: string
  cefisName?: string
  cefisEmail?: string
  cefisTrackIds?: string[]
  createdAt: Date
  updatedAt: Date
}

export interface BlindSpot {
  id: string
  name: string
  description: string
  confidence: number // 0-100
  evidence: string
  impact: string
  estimatedFixMinutes: number
  relatedCourseIds: string[]
  conceptTag: string
  prerequisiteTag?: string
  status: 'identified' | 'in_progress' | 'fixed'
}

export interface StudyPlan {
  sessionId: string
  items: StudyPlanItem[]
  totalEstimatedMinutes: number
  estimatedCompletionDate?: Date
  dailyMinutes: number
}

export interface StudyPlanItem {
  order: number
  courseId: string
  courseName: string
  reason: string
  estimatedMinutes: number
  conceptsCovered: string[]
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: string
  conceptTag: string
  prerequisiteTag?: string
  difficulty: 'basic' | 'intermediate' | 'advanced'
}

export interface QuizAnswer {
  questionId: string
  selectedAnswer: string
  timeToAnswerMs: number
  skipped: boolean
}

export interface QuizResult {
  questionId: string
  correct: boolean
  conceptTag: string
  timeToAnswerMs: number
}

export interface CEFISCourse {
  id: string
  title: string
  description: string
  keywords: string[]
  rating?: number
  duration?: number
  teacherId?: string
  trackIds?: string[]
  lessonsCount?: number
}

export interface CEFISLesson {
  id: string
  courseId: string
  title: string
  order: number
  duration?: number
  videoUrl?: string
  transcriptionUrl?: string
}

export interface CEFISTrack {
  id: string
  title: string
  description: string
  courseIds: string[]
}

export interface TextChunk {
  id: string
  courseId: string
  lessonId: string
  text: string
  startTime?: number
  endTime?: number
  embedding?: number[]
}

export interface LearnerPillars {
  comprehension: number   // 0-100
  application: number
  analysis: number
  synthesis: number
  speed: number
  retention: number
  consistency: number
  precision: number
}

export interface TrackProgress {
  trackId: string
  trackName: string
  pillars: LearnerPillars
  lastUpdatedAt: string
  totalSessionsCompleted: number
  coursesCompleted: string[]
}

export interface StudyTopic {
  id: string
  name: string
  blindSpots: BlindSpot[]
  pillars: LearnerPillars
  createdAt: string
  lastStudiedAt?: string
}

export interface LearnerProgress {
  sessionId: string
  completedCourseIds: string[]
  currentCourseId?: string
  currentLessonId?: string
  checkpointScores: Record<string, number>
  studyStreakDays: number
  lastStudiedAt?: Date
  totalMinutesStudied: number
  trackProgress: TrackProgress[]
  topics?: StudyTopic[]
}

export interface InferredProfile {
  domain: string
  urgency: Urgency
  motivationType: MotivationType
  communicationStyle: CommunicationStyle
  ageProxy: AgeProxy
  backgroundLevel: BackgroundLevel
}
