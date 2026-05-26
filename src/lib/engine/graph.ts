import type { CEFISCourse, StudyPlanItem } from '@/types/learner'

export interface KnowledgeNode {
  id: string
  name: string
  prerequisites: string[]
  estimatedMinutes: number
}

export interface KnowledgeGraph {
  nodes: Map<string, KnowledgeNode>
}

export function buildKnowledgeGraph(courses: CEFISCourse[]): KnowledgeGraph {
  const nodes = new Map<string, KnowledgeNode>()

  for (const course of courses) {
    nodes.set(course.id, {
      id: course.id,
      name: course.title ?? course.id,
      prerequisites: [],
      estimatedMinutes: course.duration ?? 30,
    })
  }

  return { nodes }
}

export function topologicalSort(graph: KnowledgeGraph, targetIds: string[]): string[] {
  const visited = new Set<string>()
  const order: string[] = []

  function visit(id: string) {
    if (visited.has(id)) return
    visited.add(id)
    const node = graph.nodes.get(id)
    if (!node) return
    for (const prereq of node.prerequisites) {
      visit(prereq)
    }
    order.push(id)
  }

  for (const id of targetIds) {
    visit(id)
  }

  return order
}

export function buildStudyPath(
  graph: KnowledgeGraph,
  targetIds: string[],
  blindSpotCourseIds: string[]
): string[] {
  const prioritySet = new Set(blindSpotCourseIds)
  const sorted = topologicalSort(graph, targetIds)

  // Blind spot courses first, then remaining in topological order
  return [
    ...sorted.filter(id => prioritySet.has(id)),
    ...sorted.filter(id => !prioritySet.has(id)),
  ]
}

export function courseIdsToStudyPlanItems(
  courseIds: string[],
  graph: KnowledgeGraph,
  reasons: Map<string, string>
): StudyPlanItem[] {
  return courseIds.map((id, index) => {
    const node = graph.nodes.get(id)
    return {
      order: index + 1,
      courseId: id,
      courseName: node?.name ?? id,
      reason: reasons.get(id) ?? 'Recommended based on your learning profile',
      estimatedMinutes: Math.round(node?.estimatedMinutes ?? 30),
      conceptsCovered: [],
    }
  })
}
