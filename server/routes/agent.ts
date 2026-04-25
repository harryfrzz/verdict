import { Router } from 'express'
import type { Request, Response } from 'express'
import { SYSTEM_PROMPTS } from '../../src/lib/agents/prompts.js'
import { AGENT_CONFIGS } from '../llm/config.js'
import { streamAgentTurn, callAgentOnce } from '../llm/client.js'
import type { CaseFile, AgentId } from '../../src/lib/agents/types.js'

const router = Router()

const VALID_AGENT_IDS = new Set<AgentId>(['arbiter', 'accuse', 'advocate', 'chronicle', 'ethos'])
const MAX_QUESTION_LENGTH = 2000

function isValidCaseFile(cf: unknown): cf is CaseFile {
  if (!cf || typeof cf !== 'object') return false
  const c = cf as Record<string, unknown>
  return (
    typeof c.question === 'string' &&
    c.question.length > 0 &&
    c.question.length <= MAX_QUESTION_LENGTH &&
    Array.isArray(c.transcript)
  )
}

function buildUserMessage(caseFile: CaseFile): string {
  const transcriptText = caseFile.transcript
    .filter(t => t.type === 'statement')
    .map(t => `[${t.agentId.toUpperCase()}]: ${t.content}`)
    .join('\n\n')

  return [
    `Case before the court: ${caseFile.question}`,
    `Category: ${caseFile.category}`,
    `Accused's plea: ${caseFile.plea ?? 'not yet entered'}`,
    `Current phase: ${caseFile.phase}`,
    '',
    transcriptText
      ? `Prior transcript:\n\n${transcriptText}`
      : 'Court has just opened. No prior testimony.',
    '',
    'It is now your turn to speak.',
  ].join('\n')
}

router.post('/', async (req: Request, res: Response) => {
  const { agentId, caseFile } = req.body as {
    sessionId?: string
    agentId: unknown
    phase?: string
    caseFile: unknown
  }

  if (typeof agentId !== 'string' || !VALID_AGENT_IDS.has(agentId as AgentId)) {
    res.status(400).json({ error: 'Invalid agentId.' })
    return
  }

  if (!isValidCaseFile(caseFile)) {
    res.status(400).json({ error: 'Invalid or missing caseFile.' })
    return
  }

  const validAgentId = agentId as AgentId
  const systemPrompt = SYSTEM_PROMPTS[validAgentId]
  const agentConfig = AGENT_CONFIGS[validAgentId]

  const userMessage = buildUserMessage(caseFile)

  // ARBITER: non-streaming — returns full verdict JSON
  if (validAgentId === 'arbiter') {
    try {
      const content = await callAgentOnce(systemPrompt, userMessage, agentConfig)
      res.json({ content, done: true })
    } catch (err) {
      console.error('[ARBITER] call failed:', err)
      res.status(500).json({ error: 'ARBITER call failed.' })
    }
    return
  }

  // All other agents: stream via SSE
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  let fullContent = ''

  try {
    for await (const token of streamAgentTurn(systemPrompt, userMessage, agentConfig)) {
      fullContent += token
      res.write(`data: ${JSON.stringify({ token, done: false })}\n\n`)
    }
    res.write(`data: ${JSON.stringify({ token: '', done: true, fullContent })}\n\n`)
  } catch (err) {
    console.error(`[${validAgentId.toUpperCase()}] stream failed:`, err)
    res.write(`data: ${JSON.stringify({ token: '', done: true, error: 'Stream failed', fullContent })}\n\n`)
  } finally {
    res.end()
  }
})

export default router
