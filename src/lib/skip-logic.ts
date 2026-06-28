export interface SkipRule {
  from: number
  ifValue: number
  goTo: number | 'end'
}

const skipRules: SkipRule[] = [
  { from: 1, ifValue: 2, goTo: 4 },
  { from: 2, ifValue: 2, goTo: 4 },
  { from: 6, ifValue: 2, goTo: 13 },
  { from: 23, ifValue: 2, goTo: 25 },
  { from: 28, ifValue: 2, goTo: 30 },
  { from: 35, ifValue: 2, goTo: 41 },
  { from: 41, ifValue: 2, goTo: 45 },
  { from: 56, ifValue: 2, goTo: 'end' },
]

export function getSkipTarget(questionId: number, selectedValue: number): number | 'end' | null {
  const rule = skipRules.find((r) => r.from === questionId && r.ifValue === selectedValue)
  return rule ? rule.goTo : null
}

export function getVisibleQuestionIds(allIds: number[], answers: Record<string, number | number[]>): number[] {
  const visible: number[] = []
  let i = 0

  while (i < allIds.length) {
    const id = allIds[i]
    visible.push(id)

    const answer = answers[`q${id}`]
    if (typeof answer === 'number') {
      const target = getSkipTarget(id, answer)
      if (target === 'end') break
      if (target !== null) {
        const targetIndex = allIds.indexOf(target)
        if (targetIndex !== -1) {
          i = targetIndex
          continue
        }
      }
    }
    i++
  }

  return visible
}

export function shouldShowQuestion(
  questionId: number,
  allIds: number[],
  answers: Record<string, number | number[]>
): boolean {
  return getVisibleQuestionIds(allIds, answers).includes(questionId)
}
