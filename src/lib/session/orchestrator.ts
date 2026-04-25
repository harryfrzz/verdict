import { randomUUID } from 'node:crypto'
import type {
  ObjectionOutcome,
  ObjectionRecord,
  ObjectionType,
  Role,
  SessionMutationResult,
  SessionPhase,
  SessionState,
  Turn,
  TurnSpeaker,
} from '../agents/types.js'

function cloneSession(session: SessionState): SessionState {
  return {
    ...session,
    transcript: [...session.transcript],
    objections: [...session.objections],
  }
}

function appendTurn(session: SessionState, turn: Turn): SessionMutationResult {
  const nextSession = cloneSession(session)
  nextSession.transcript.push(turn)
  nextSession.updatedAt = turn.timestamp

  return {
    session: nextSession,
    appendedTurn: turn,
  }
}

function buildTurn(
  speaker: TurnSpeaker,
  phase: SessionPhase,
  content: string,
  role?: Role,
  metadata?: Record<string, unknown>,
): Turn {
  return {
    speaker,
    speakerId: speaker,
    role,
    phase,
    content,
    timestamp: Date.now(),
    metadata,
  }
}

function getResumeSpeaker(session: SessionState): TurnSpeaker {
  const latest = [...session.objections].reverse().find((entry) => entry.outcome === undefined)
  return latest?.resumeSpeaker ?? session.nextSpeaker
}

function nextPhaseAfterPlayerTurn(session: SessionState): SessionPhase {
  if (session.phase === 'opening') {
    return 'argument'
  }

  return session.phase
}

export function submitAgentTurn(
  session: SessionState,
  speaker: 'lawyer' | 'judge',
  content: string,
): SessionMutationResult {
  const trimmed = content.trim()
  if (trimmed.length === 0) {
    throw new Error('Turn content is required.')
  }

  if (session.nextSpeaker !== speaker || session.awaitingPlayerInput) {
    throw new Error(`Session is not ready for a ${speaker} turn.`)
  }

  if (speaker === 'judge' && session.phase !== 'objection') {
    throw new Error('Judge turns are only valid during objection handling in this phase.')
  }

  const role = speaker === 'lawyer' ? session.aiRole : undefined
  const phase = speaker === 'judge' ? 'objection' : session.phase
  const result = appendTurn(session, buildTurn(speaker, phase, trimmed, role))
  const nextSession = result.session

  if (speaker === 'lawyer') {
    nextSession.awaitingPlayerInput = true
    nextSession.nextSpeaker = 'player'
  } else {
    nextSession.phase = 'argument'
    nextSession.awaitingPlayerInput = true
    nextSession.nextSpeaker = getResumeSpeaker(session)
  }

  return {
    ...result,
    session: nextSession,
  }
}

export function submitPlayerTurn(session: SessionState, content: string): SessionMutationResult {
  const trimmed = content.trim()
  if (trimmed.length === 0) {
    throw new Error('Turn content is required.')
  }

  if (!session.awaitingPlayerInput || session.nextSpeaker !== 'player') {
    throw new Error('Session is not waiting for player input.')
  }

  const phase = session.phase
  const result = appendTurn(session, buildTurn('player', phase, trimmed, session.playerRole))
  const nextSession = result.session

  nextSession.phase = nextPhaseAfterPlayerTurn(session)
  nextSession.awaitingPlayerInput = false
  nextSession.nextSpeaker = 'lawyer'

  return {
    ...result,
    session: nextSession,
  }
}

export function submitObjection(
  session: SessionState,
  raisedBy: Role,
  type: ObjectionType,
  rationale: string,
): SessionMutationResult {
  const trimmed = rationale.trim()
  if (trimmed.length === 0) {
    throw new Error('Objection rationale is required.')
  }

  if (session.phase === 'objection') {
    throw new Error('Session is already awaiting a judge ruling.')
  }

  const targetTurnIndex = session.transcript.length - 1
  if (targetTurnIndex < 0) {
    throw new Error('Cannot raise an objection without a prior turn.')
  }

  const latestTurn = session.transcript[targetTurnIndex]
  if (latestTurn.speaker === 'clerk' || latestTurn.speaker === 'judge') {
    throw new Error('Objections can only target lawyer or player turns.')
  }

  const resumeSpeaker = session.awaitingPlayerInput ? 'player' : session.nextSpeaker
  const objection: ObjectionRecord = {
    id: randomUUID(),
    phase: session.phase,
    raisedBy,
    targetTurnIndex,
    type,
    rationale: trimmed,
    timestamp: Date.now(),
    resumeSpeaker,
  }

  const nextSession = cloneSession(session)
  nextSession.objections.push(objection)
  nextSession.phase = 'objection'
  nextSession.awaitingPlayerInput = false
  nextSession.nextSpeaker = 'judge'
  nextSession.updatedAt = objection.timestamp

  return {
    session: nextSession,
    appendedObjection: objection,
  }
}

export function recordJudgeRuling(
  session: SessionState,
  content: string,
  outcome: ObjectionOutcome,
): SessionMutationResult {
  const reversedIndex = [...session.objections].reverse().findIndex((entry) => entry.outcome === undefined)
  const unresolvedIndex = reversedIndex < 0
    ? -1
    : session.objections.length - 1 - reversedIndex

  if (unresolvedIndex < 0) {
    throw new Error('No pending objection requires a judge ruling.')
  }

  const result = submitAgentTurn(session, 'judge', content)
  const nextSession = result.session
  const current = nextSession.objections[unresolvedIndex]

  nextSession.objections[unresolvedIndex] = {
    ...current,
    outcome,
    ruling: content.trim(),
  }

  return {
    ...result,
    session: nextSession,
  }
}

export function recordFinalVerdict(session: SessionState, content: string): SessionMutationResult {
  const trimmed = content.trim()
  if (trimmed.length === 0) {
    throw new Error('Verdict content is required.')
  }

  const result = appendTurn(session, buildTurn('judge', 'verdict', trimmed))
  const nextSession = result.session

  nextSession.phase = 'verdict'
  nextSession.awaitingPlayerInput = false
  nextSession.nextSpeaker = 'judge'

  return {
    ...result,
    session: nextSession,
  }
}
