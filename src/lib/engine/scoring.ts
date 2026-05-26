import type { QuizAnswer, QuizQuestion, BackgroundLevel, DNAType, LearningStyle, Rhythm } from '@/types/learner'

export function scoreQuizAnswers(answers: QuizAnswer[], questions: QuizQuestion[]): number {
  if (!questions.length) return 0

  let correct = 0
  for (const answer of answers) {
    if (answer.skipped || answer.selectedAnswer === '__skipped__') continue
    const question = questions.find(q => q.id === answer.questionId)
    if (!question) continue
    if (answer.selectedAnswer === question.correctAnswer) {
      correct++
    }
  }

  return Math.round((correct / questions.length) * 100)
}

export function classifyBaselineLevel(score: number): BackgroundLevel {
  if (score >= 71) return 'expert'
  if (score >= 40) return 'intermediate'
  return 'novice'
}

interface DNAInputs {
  learningStyle: LearningStyle
  rhythm: Rhythm
  challengeLevel: 'challenged' | 'comfortable'
  backgroundLevel: BackgroundLevel
}

export function determineDNAType(inputs: DNAInputs): DNAType {
  const { learningStyle, rhythm, challengeLevel, backgroundLevel } = inputs

  // Sprint DNA: intensive learners who do sprints
  if (rhythm === 'sprints' && challengeLevel === 'challenged') {
    return 'sprint'
  }

  // Visual + deep-dive = absorvedor
  if (learningStyle === 'visual' && rhythm === 'deep-dive') {
    return 'absorvedor'
  }

  // Practice-oriented = construtor
  if (learningStyle === 'practice') {
    return 'construtor'
  }

  // Reading + expert background = conector (connects concepts)
  if (learningStyle === 'reading' && backgroundLevel !== 'novice') {
    return 'conector'
  }

  // Default: explorador
  return 'explorador'
}
