export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import CommentsClient from './CommentsClient'

export type CommentCategory = 'positive' | 'negative' | 'improvement'
// Display category — adds 'none' for responses that left Q55 blank
export type RowCategory = CommentCategory | 'none'

export interface CommentRow {
  id: string
  patientName: string
  mrnNo: string
  language: string
  submittedAt: string
  text: string
  category: RowCategory
}

const POSITIVE_WORDS = [
  'excellent','great','good','wonderful','amazing','best','perfect','satisfied',
  'happy','professional','friendly','helpful','caring','kind','thank','appreciate',
  'outstanding','nice','love','well','clean','comfortable','impressed','superb',
  'pleased','dedicated','attentive','courteous','prompt','efficient',
]
const NEGATIVE_WORDS = [
  'bad','poor','terrible','worst','awful','horrible','rude','slow','dirty',
  'problem','issue','complaint','unhappy','disappointed','upset','insufficient',
  'inadequate','failure','wrong','lack','delay','long wait','crowded','ignored',
  'neglect','unclean','disrespectful','unfriendly','incompetent','worse',
]
const IMPROVEMENT_WORDS = [
  'improve','better','should','could','need','more','suggest','recommend',
  'wish','hope','please','would like','request','consider','increase','add',
  'maybe','perhaps','if possible','require','lack of','not enough','too long',
  'too slow','missing','provide','shortage','limited','less','reduce',
]

// Matches negation words as whole words (won't fire inside "notable", "annotation", etc.)
const NEGATION_RE = /\b(not|no|never|n't|neither|nor|without|hardly|barely|scarcely)\b/

// Returns the start index of the first whole-word occurrence of `word` in `text`, or -1.
function indexOfWholeWord(text: string, word: string): number {
  let start = 0
  while (true) {
    const idx = text.indexOf(word, start)
    if (idx === -1) return -1
    const before = idx === 0 ? ' ' : text[idx - 1]
    const after = idx + word.length >= text.length ? ' ' : text[idx + word.length]
    if (/\W/.test(before) && /\W/.test(after)) return idx
    start = idx + 1
  }
}

// True when a negation word appears in the 30 chars immediately before `wordStart`.
function isPrecededByNegation(lower: string, wordStart: number): boolean {
  const window = lower.slice(Math.max(0, wordStart - 30), wordStart)
  return NEGATION_RE.test(window)
}

function categorize(text: string): CommentCategory {
  const lower = text.toLowerCase()
  let pos = 0, neg = 0, imp = 0

  for (const w of POSITIVE_WORDS) {
    const idx = indexOfWholeWord(lower, w)
    if (idx === -1) continue
    // "not good", "never clean", etc. → flip to negative signal
    if (isPrecededByNegation(lower, idx)) neg++
    else pos++
  }
  for (const w of NEGATIVE_WORDS) {
    if (lower.includes(w)) neg++
  }
  for (const w of IMPROVEMENT_WORDS) {
    if (lower.includes(w)) imp++
  }

  // Negative wins on a tie with positive (doubt favours caution)
  if (neg > 0 && neg >= pos) return 'negative'
  if (pos > neg && pos > imp) return 'positive'
  if (imp > 0) return 'improvement'
  if (pos > 0) return 'positive'
  return 'improvement'
}

export default async function CommentsPage() {
  const responses = await prisma.surveyResponse.findMany({
    orderBy: { submittedAt: 'desc' },
    take: 1000,
    select: {
      id: true,
      patientName: true,
      mrnNo: true,
      language: true,
      submittedAt: true,
      answers: true,
    },
  })

  // 'none' is allowed so staff can manually mark a non-blank comment (e.g. "No")
  // as having no real feedback via the Edit modal.
  const VALID_CATS = new Set<string>(['positive', 'negative', 'improvement', 'none'])

  const comments: CommentRow[] = []
  for (const r of responses) {
    const ans = r.answers as Record<string, unknown>
    const raw = ans['q55_text'] ?? ans['q55']
    const text = typeof raw === 'string' ? raw.trim() : ''
    if (!text) {
      // Blank Q55 → surface as a "No Comment" row (no sentiment categorisation)
      comments.push({
        id: r.id,
        patientName: r.patientName,
        mrnNo: r.mrnNo,
        language: r.language,
        submittedAt: r.submittedAt.toISOString(),
        text: '',
        category: 'none',
      })
      continue
    }
    // Respect manual override saved by the Edit modal (stored as q55_category)
    const override = typeof ans['q55_category'] === 'string' && VALID_CATS.has(ans['q55_category'] as string)
      ? (ans['q55_category'] as RowCategory)
      : null
    comments.push({
      id: r.id,
      patientName: r.patientName,
      mrnNo: r.mrnNo,
      language: r.language,
      submittedAt: r.submittedAt.toISOString(),
      text,
      category: override ?? categorize(text),
    })
  }

  return <CommentsClient comments={comments} />
}
