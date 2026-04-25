import { Router } from 'express'
import type { Request, Response } from 'express'
import { listCaseFileSummaries, loadCaseFileById } from '../../src/lib/casefiles/index.js'
import {
  createSessionState,
  recordJudgeRuling,
  submitAgentTurn,
  submitObjection,
  submitPlayerTurn,
} from '../../src/lib/session/index.js'
import type { ObjectionOutcome, ObjectionType, Role, SessionState } from '../../src/lib/agents/types.js'
import { sessionStore } from '../session/store.js'

const router = Router()

const VALID_ROLES = new Set<Role>(['prosecution', 'defense'])
const VALID_OBJECTION_TYPES = new Set<ObjectionType>([
  'leading',
  'hearsay',
  'speculation',
  'argumentative',
  'relevance',
  'asked_and_answered',
  'foundation',
  'compound',
  'other',
])
const VALID_OBJECTION_OUTCOMES = new Set<ObjectionOutcome>(['sustained', 'overruled', 'reserved'])

function isRole(value: unknown): value is Role {
  return typeof value === 'string' && VALID_ROLES.has(value as Role)
}

function isObjectionType(value: unknown): value is ObjectionType {
  return typeof value === 'string' && VALID_OBJECTION_TYPES.has(value as ObjectionType)
}

function isObjectionOutcome(value: unknown): value is ObjectionOutcome {
  return typeof value === 'string' && VALID_OBJECTION_OUTCOMES.has(value as ObjectionOutcome)
}

function getSessionFromRequest(req: Request, res: Response): SessionState | undefined {
  const sessionId = req.params.sessionId

  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    res.status(400).json({ error: 'sessionId is required.' })
    return undefined
  }

  const session = sessionStore.get(sessionId)
  if (!session) {
    res.status(404).json({ error: 'Session not found.' })
    return undefined
  }

  return session
}

router.get('/cases', async (_req: Request, res: Response) => {
  try {
    const cases = await listCaseFileSummaries()
    res.json({ cases })
  } catch (error) {
    console.error('[SESSION] case listing failed:', error)
    res.status(500).json({ error: 'Unable to load case files.' })
  }
})

router.get('/:sessionId', (req: Request, res: Response) => {
  const session = getSessionFromRequest(req, res)
  if (!session) {
    return
  }

  res.json(session)
})

router.post('/:sessionId/player-turn', (req: Request, res: Response) => {
  const session = getSessionFromRequest(req, res)
  if (!session) {
    return
  }

  const { content } = req.body as { content?: unknown }
  if (typeof content !== 'string') {
    res.status(400).json({ error: 'content is required.' })
    return
  }

  try {
    const result = submitPlayerTurn(session, content)
    sessionStore.set(result.session)
    res.json(result.session)
  } catch (error) {
    if (error instanceof Error) {
      res.status(409).json({ error: error.message })
      return
    }

    res.status(500).json({ error: 'Unable to record player turn.' })
  }
})

router.post('/:sessionId/agent-turn', (req: Request, res: Response) => {
  const session = getSessionFromRequest(req, res)
  if (!session) {
    return
  }

  const { speaker, content, outcome } = req.body as {
    speaker?: unknown
    content?: unknown
    outcome?: unknown
  }

  if ((speaker !== 'lawyer' && speaker !== 'judge') || typeof content !== 'string') {
    res.status(400).json({ error: 'speaker must be "lawyer" or "judge" and content is required.' })
    return
  }

  try {
    const result = speaker === 'judge'
      ? recordJudgeRuling(session, content, isObjectionOutcome(outcome) ? outcome : 'reserved')
      : submitAgentTurn(session, speaker, content)

    sessionStore.set(result.session)
    res.json(result.session)
  } catch (error) {
    if (error instanceof Error) {
      res.status(409).json({ error: error.message })
      return
    }

    res.status(500).json({ error: 'Unable to record agent turn.' })
  }
})

router.post('/:sessionId/objection', (req: Request, res: Response) => {
  const session = getSessionFromRequest(req, res)
  if (!session) {
    return
  }

  const { raisedBy, type, rationale } = req.body as {
    raisedBy?: unknown
    type?: unknown
    rationale?: unknown
  }

  if (!isRole(raisedBy) || !isObjectionType(type) || typeof rationale !== 'string') {
    res.status(400).json({
      error: 'raisedBy must be "prosecution" or "defense", type must be a valid objection type, and rationale is required.',
    })
    return
  }

  try {
    const result = submitObjection(session, raisedBy, type, rationale)
    sessionStore.set(result.session)
    res.json(result.session)
  } catch (error) {
    if (error instanceof Error) {
      res.status(409).json({ error: error.message })
      return
    }

    res.status(500).json({ error: 'Unable to record objection.' })
  }
})

router.post('/', async (req: Request, res: Response) => {
  const { caseId, role } = req.body as { caseId?: unknown; role?: unknown }

  if (typeof caseId !== 'string' || caseId.trim().length === 0) {
    res.status(400).json({ error: 'caseId is required.' })
    return
  }

  if (!isRole(role)) {
    res.status(400).json({ error: 'role must be "prosecution" or "defense".' })
    return
  }

  try {
    const caseFile = await loadCaseFileById(caseId.trim())
    const session = createSessionState(caseFile, role)

    sessionStore.set(session)

    res.status(201).json(session)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('No case file found')) {
      res.status(404).json({ error: error.message })
      return
    }

    console.error('[SESSION] creation failed:', error)
    res.status(500).json({ error: 'Unable to create session.' })
  }
})

export default router
