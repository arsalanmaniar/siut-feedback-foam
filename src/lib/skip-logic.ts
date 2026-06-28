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

// ── Deceased-patient handling ──────────────────────────────────────────────
// A gentle screening question (id 58) is shown just before the discharge section.
// If the child passed away during the stay (answer = 1/Yes), the discharge and
// teen-discharge questions don't apply: they are auto-marked Not Applicable in the
// stored answers and hidden from the parent (skipped entirely).
export const DECEASED_QUESTION_ID = 58
export const DECEASED_YES = 1
export const NA_VALUE = 5
export const DECEASED_NA_QUESTIONS = [33, 34, 35, 36, 37, 38, 39, 40, 43, 44]

function isDeceased(answers: Record<string, unknown>): boolean {
  return answers[`q${DECEASED_QUESTION_ID}`] === DECEASED_YES
}

// Keeps the answers object consistent with the deceased screening answer:
// when Yes, force the non-applicable discharge questions to Not Applicable;
// when the answer is cleared/changed to No, remove those auto-applied NA values
// so the questions can be answered normally again.
export function withDeceasedSideEffects(
  answers: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...answers }
  if (isDeceased(answers)) {
    for (const id of DECEASED_NA_QUESTIONS) next[`q${id}`] = NA_VALUE
  } else {
    for (const id of DECEASED_NA_QUESTIONS) {
      if (next[`q${id}`] === NA_VALUE) delete next[`q${id}`]
    }
  }
  return next
}

export function getVisibleQuestionIds(allIds: number[], answers: Record<string, number | number[]>): number[] {
  const visible: number[] = []
  const deceased = isDeceased(answers)
  let i = 0

  while (i < allIds.length) {
    const id = allIds[i]

    // Hide discharge / teen-discharge questions when the child passed away.
    if (deceased && DECEASED_NA_QUESTIONS.includes(id)) {
      i++
      continue
    }

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
