import { Router } from 'express'
import type { Request, Response } from 'express'
import { listCaseFileSummaries, loadCaseFileById } from '../../src/lib/casefiles/index.js'
import { createSessionState } from '../../src/lib/session/index.js'
import type { Role } from '../../src/lib/agents/types.js'
import { sessionStore } from '../session/store.js'

const router = Router()

const VALID_ROLES = new Set<Role>(['prosecution', 'defense'])

function isRole(value: unknown): value is Role {
  return typeof value === 'string' && VALID_ROLES.has(value as Role)
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
  const sessionId = req.params.sessionId

  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    res.status(400).json({ error: 'sessionId is required.' })
    return
  }

  const session = sessionStore.get(sessionId)

  if (!session) {
    res.status(404).json({ error: 'Session not found.' })
    return
  }

  res.json(session)
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
