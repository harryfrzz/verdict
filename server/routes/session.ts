import { Router } from 'express'
import type { Request, Response } from 'express'
import { randomUUID } from 'crypto'
import type { LegacyCaseFile, Plea } from '../../src/lib/agents/types.js'

const router = Router()

const VALID_PLEAS = new Set<Plea>(['guilty', 'not_guilty'])
const MAX_QUESTION_LENGTH = 2000

function detectCategory(question: string): string {
  const q = question.toLowerCase()
  if (/\b(ai|artificial intelligence|technology|tech|software|algorithm|robot|data)\b/.test(q)) return 'Technology'
  if (/\b(war|genocide|holocaust|hiroshima|nagasaki|nuclear|weapon|military|battle)\b/.test(q)) return 'History · Ethics'
  if (/\b(law|legal|crime|punishment|justice|convict|sentence|verdict)\b/.test(q)) return 'Law'
  if (/\b(policy|government|political|democracy|vote|election|legislation)\b/.test(q)) return 'Policy'
  return 'Ethics'
}

router.post('/', (req: Request, res: Response) => {
  const { question, plea } = req.body as { question?: string; plea?: string }

  if (!question || question.trim().length < 5) {
    res.status(400).json({ error: 'A question of at least 5 characters is required.' })
    return
  }

  if (question.trim().length > MAX_QUESTION_LENGTH) {
    res.status(400).json({ error: `Question must be under ${MAX_QUESTION_LENGTH} characters.` })
    return
  }

  if (plea !== undefined && !VALID_PLEAS.has(plea as Plea)) {
    res.status(400).json({ error: 'plea must be "guilty" or "not_guilty".' })
    return
  }

  const sessionId = randomUUID()
  const category = detectCategory(question)

  const caseFile: LegacyCaseFile = {
    question: question.trim(),
    category,
    plea: plea ? (plea as Plea) : null,
    transcript: [],
    phase: 'opening',
    round: 0,
  }

  res.json({ sessionId, category, caseFile })
})

export default router
