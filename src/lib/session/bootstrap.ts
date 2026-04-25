import { randomUUID } from 'node:crypto'
import type { CaseFile, Role, SessionPhase, SessionState, Turn } from '../agents/types.js'

function buildChargeAnnouncement(caseFile: CaseFile): string {
  const joinedCharges = caseFile.charges.join('; ')

  return [
    `Court is now in session for ${caseFile.title}.`,
    `Location: ${caseFile.location}. Date of incident: ${caseFile.date}.`,
    `Charges before the court: ${joinedCharges}.`,
  ].join(' ')
}

function buildObjectiveSummary(caseFile: CaseFile, playerRole: Role, aiRole: Role): string {
  const playerObjective = playerRole === 'prosecution'
    ? caseFile.prosecutionObjective
    : caseFile.defenseObjective
  const aiObjective = aiRole === 'prosecution'
    ? caseFile.prosecutionObjective
    : caseFile.defenseObjective

  return [
    `Player role: ${playerRole}. Objective: ${playerObjective}`,
    `Opposing counsel role: ${aiRole}. Objective: ${aiObjective}`,
  ].join(' ')
}

function buildInitialTranscript(caseFile: CaseFile, playerRole: Role, aiRole: Role, timestamp: number): Turn[] {
  return [
    {
      speaker: 'clerk',
      speakerId: 'clerk',
      phase: 'charges',
      content: buildChargeAnnouncement(caseFile),
      timestamp,
    },
    {
      speaker: 'clerk',
      speakerId: 'clerk',
      phase: 'opening',
      content: buildObjectiveSummary(caseFile, playerRole, aiRole),
      timestamp: timestamp + 1,
      metadata: {
        playerRole,
        aiRole,
      },
    },
  ]
}

export function createSessionState(caseFile: CaseFile, playerRole: Role): SessionState {
  const timestamp = Date.now()
  const aiRole: Role = playerRole === 'prosecution' ? 'defense' : 'prosecution'

  return {
    sessionId: randomUUID(),
    caseId: caseFile.id,
    caseFile,
    playerRole,
    aiRole,
    phase: 'opening',
    transcript: buildInitialTranscript(caseFile, playerRole, aiRole, timestamp),
    objections: [],
    awaitingPlayerInput: false,
    nextSpeaker: 'lawyer',
    playerTurnsTaken: 0,
    lawyerTurnsTaken: 0,
    maxTurnsPerSide: 2,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function isSessionPhase(value: unknown): value is SessionPhase {
  return value === 'case_selection'
    || value === 'case_study'
    || value === 'role_selection'
    || value === 'charges'
    || value === 'opening'
    || value === 'argument'
    || value === 'objection'
    || value === 'closing'
    || value === 'deliberation'
    || value === 'verdict'
}
