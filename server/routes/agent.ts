import { Router } from 'express'
import type { Request, Response } from 'express'
import {
  buildFinalVerdictUserMessage,
  buildJudgeRulingUserMessage,
  buildLawyerUserMessage,
  judgeSystemPrompt,
  lawyerSystemPrompt,
} from '../../src/lib/agents/prompts.js'
import { getCourtActorConfig } from '../llm/config.js'
import { callAgentOnce, streamAgentTurn } from '../llm/client.js'
import { recordFinalVerdict, recordJudgeRuling, submitAgentTurn } from '../../src/lib/session/index.js'
import { sessionStore } from '../session/store.js'

const router = Router()

type AgentAction = 'lawyer_turn' | 'judge_ruling' | 'final_verdict'

function isAgentAction(value: unknown): value is AgentAction {
  return value === 'lawyer_turn' || value === 'judge_ruling' || value === 'final_verdict'
}

function getSession(sessionId: unknown, res: Response) {
  if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
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

router.post('/', async (req: Request, res: Response) => {
  const { sessionId, action, outcome } = req.body as {
    sessionId?: unknown
    action?: unknown
    outcome?: unknown
  }

  if (!isAgentAction(action)) {
    res.status(400).json({ error: 'action must be "lawyer_turn", "judge_ruling", or "final_verdict".' })
    return
  }

  const session = getSession(sessionId, res)
  if (!session) {
    return
  }

  if (action === 'lawyer_turn') {
    const config = getCourtActorConfig(session.caseFile.level, 'lawyer')
    const systemPrompt = lawyerSystemPrompt(session.aiRole)
    const userMessage = buildLawyerUserMessage(session)

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    let fullContent = ''

    try {
      for await (const token of streamAgentTurn(systemPrompt, userMessage, config)) {
        fullContent += token
        res.write(`data: ${JSON.stringify({ token, done: false })}\n\n`)
      }

      const result = submitAgentTurn(session, 'lawyer', fullContent)
      sessionStore.set(result.session)
      res.write(`data: ${JSON.stringify({ token: '', done: true, fullContent, session: result.session })}\n\n`)
    } catch (error) {
      console.error('[LAWYER] stream failed:', error)
      res.write(`data: ${JSON.stringify({ token: '', done: true, error: 'Stream failed', fullContent })}\n\n`)
    } finally {
      res.end()
    }

    return
  }

  if (action === 'judge_ruling') {
    try {
      const config = getCourtActorConfig(session.caseFile.level, 'judge')
      const content = await callAgentOnce(
        judgeSystemPrompt('ruling'),
        buildJudgeRulingUserMessage(session),
        {
          ...config,
          streaming: false,
        },
      )

      const resolvedOutcome = outcome === 'sustained' || outcome === 'overruled' || outcome === 'reserved'
        ? outcome
        : 'reserved'
      const result = recordJudgeRuling(session, content, resolvedOutcome)
      sessionStore.set(result.session)
      res.json({ content, session: result.session })
    } catch (error) {
      console.error('[JUDGE] ruling failed:', error)
      res.status(500).json({ error: 'Judge ruling failed.' })
    }

    return
  }

  try {
    const config = getCourtActorConfig(session.caseFile.level, 'judge')
    const content = await callAgentOnce(
      judgeSystemPrompt('verdict'),
      buildFinalVerdictUserMessage(session),
      {
        ...config,
        streaming: false,
      },
    )

    const result = recordFinalVerdict(session, content)
    sessionStore.set(result.session)
    res.json({ content, session: result.session })
  } catch (error) {
    console.error('[JUDGE] verdict failed:', error)
    res.status(500).json({ error: 'Final verdict failed.' })
  }
})

export default router
