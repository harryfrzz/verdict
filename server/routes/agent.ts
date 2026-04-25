import { Router } from 'express'
import type { Request, Response } from 'express'
import {
  buildFinalVerdictUserMessage,
  buildJudgeRulingUserMessage,
  buildLawyerUserMessage,
  judgeSystemPrompt,
  lawyerSystemPrompt,
} from '../../src/lib/agents/prompts.js'
import { getActorVoice, getCourtActorConfig } from '../llm/config.js'
import { callAgentOnce } from '../llm/client.js'
import { streamRealtimeTurn } from '../llm/realtime.js'
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

function sseHeaders(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()
}

function buildAutoLossVerdict(session: NonNullable<ReturnType<typeof getSession>>): string {
  return [
    'OUTCOME: Loss for player.',
    'SUMMARY: The player requested a verdict without presenting a substantive courtroom argument, so the opposing counsel prevails on the record presented.',
    'REASONING: The court cannot credit advocacy that was never made. The authored case file contains enough material for opposing counsel to advance a theory of the case, but the player offered no developed argument, no rebuttal, and no evidence-based challenge. On that record, the player does not meet the burden of persuasion for their chosen side.',
    'PLAYER_STRENGTHS: None developed on the live record.',
    'PLAYER_GAPS: No opening or closing argument was presented. No evidence was cited by the player. No rebuttal was made to the opposing theory.',
    `OPPONENT_ADVANTAGES: The ${session.aiRole} side was the only side to place a developed argument into the session record.`,
  ].join('\n')
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
  if (!session) return

  if (action === 'lawyer_turn') {
    const systemPrompt = lawyerSystemPrompt(session.aiRole)
    const userMessage = buildLawyerUserMessage(session)
    const voice = getActorVoice(session.caseFile.level, 'lawyer')

    sseHeaders(res)
    let fullContent = ''

    try {
      for await (const chunk of streamRealtimeTurn(systemPrompt, userMessage, voice)) {
        if (chunk.type === 'text') {
          fullContent += chunk.delta
          res.write(`data: ${JSON.stringify({ token: chunk.delta, done: false })}\n\n`)
        } else {
          res.write(`data: ${JSON.stringify({ audio: chunk.chunk, done: false })}\n\n`)
        }
      }

      const result = submitAgentTurn(session, 'lawyer', fullContent)
      sessionStore.set(result.session)
      res.write(`data: ${JSON.stringify({ token: '', done: true, fullContent, session: result.session })}\n\n`)
    } catch (error) {
      console.error('[LAWYER] realtime stream failed:', error)
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
        { ...config, streaming: false },
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

  // final_verdict — streamed via SSE with Realtime audio
  sseHeaders(res)

  if (session.playerTurnsTaken === 0) {
    const content = buildAutoLossVerdict(session)
    const result = recordFinalVerdict(session, content)
    sessionStore.set(result.session)
    // Emit each word as a token so the frontend can stream the text
    for (const word of content.split(' ')) {
      res.write(`data: ${JSON.stringify({ token: word + ' ', done: false })}\n\n`)
    }
    res.write(`data: ${JSON.stringify({ token: '', done: true, content, session: result.session })}\n\n`)
    res.end()
    return
  }

  const systemPrompt = judgeSystemPrompt('verdict')
  const userMessage = buildFinalVerdictUserMessage(session)
  const voice = getActorVoice(session.caseFile.level, 'judge')
  let fullContent = ''

  try {
    for await (const chunk of streamRealtimeTurn(systemPrompt, userMessage, voice)) {
      if (chunk.type === 'text') {
        fullContent += chunk.delta
        res.write(`data: ${JSON.stringify({ token: chunk.delta, done: false })}\n\n`)
      } else {
        res.write(`data: ${JSON.stringify({ audio: chunk.chunk, done: false })}\n\n`)
      }
    }

    const result = recordFinalVerdict(session, fullContent)
    sessionStore.set(result.session)
    res.write(`data: ${JSON.stringify({ token: '', done: true, content: fullContent, session: result.session })}\n\n`)
  } catch (error) {
    console.error('[JUDGE] verdict realtime failed:', error)
    res.write(`data: ${JSON.stringify({ token: '', done: true, error: 'Verdict stream failed', fullContent })}\n\n`)
  } finally {
    res.end()
  }
})

export default router
