import type { CaseFile, ObjectionRecord, Role, SessionPhase, SessionState, Turn } from './types.js'

function formatTranscript(turns: Turn[]): string {
  if (turns.length === 0) {
    return 'No courtroom transcript is available yet.'
  }

  return turns
    .map((turn, index) => {
      const roleText = turn.role ? ` (${turn.role})` : ''
      return `${index + 1}. ${turn.speaker.toUpperCase()}${roleText} [${turn.phase}]: ${turn.content}`
    })
    .join('\n')
}

function formatWitnesses(caseFile: CaseFile): string {
  return caseFile.witnesses
    .map((witness) => [
      `- ${witness.name} (${witness.relationToCase})`,
      `  Statement: ${witness.statement}`,
      witness.reliabilityNotes ? `  Reliability: ${witness.reliabilityNotes}` : null,
    ].filter(Boolean).join('\n'))
    .join('\n')
}

function formatEvidence(caseFile: CaseFile): string {
  return caseFile.evidence
    .map((item) => `- ${item.item}: ${item.description} Relevance: ${item.relevance}`)
    .join('\n')
}

function formatObjections(objections: ObjectionRecord[]): string {
  if (objections.length === 0) {
    return 'No objections recorded.'
  }

  return objections
    .map((entry, index) => {
      const outcome = entry.outcome ?? 'pending'
      return `${index + 1}. ${entry.raisedBy} objected on ${entry.type}. Rationale: ${entry.rationale}. Outcome: ${outcome}.`
    })
    .join('\n')
}

function roleObjective(caseFile: CaseFile, role: Role): string {
  return role === 'prosecution' ? caseFile.prosecutionObjective : caseFile.defenseObjective
}

function caseContext(caseFile: CaseFile): string {
  return [
    `Case: ${caseFile.title}`,
    `Level ${caseFile.level} (${caseFile.difficulty.label})`,
    `Category: ${caseFile.category}`,
    `Date: ${caseFile.date}`,
    `Location: ${caseFile.location}`,
    `Summary: ${caseFile.summary}`,
    `Charges: ${caseFile.charges.join('; ')}`,
    `Police report: ${caseFile.policeReport}`,
    '',
    'Witness records:',
    formatWitnesses(caseFile),
    '',
    'Evidence:',
    formatEvidence(caseFile),
  ].join('\n')
}

export function lawyerSystemPrompt(aiRole: Role): string {
  return [
    `You are the AI courtroom lawyer arguing for the ${aiRole}.`,
    'You are adversarial, evidence-aware, and concise.',
    'You must stay grounded in the authored case file and transcript.',
    'Do not invent witnesses, evidence, timeline details, or rulings that are not present in the supplied record.',
    'Use courtroom language directed to the court or opposing counsel, not to the user.',
    'Each response should be a focused courtroom turn, usually 3 to 6 sentences.',
    'If the current phase is opening, deliver an opening statement.',
    'If the current phase is argument or closing, rebut the player using the strongest grounded case points available.',
    'When witness material is relevant, cite it as a case-file statement rather than as live testimony.',
  ].join('\n')
}

export function buildLawyerUserMessage(session: SessionState): string {
  const { caseFile, playerRole, aiRole, phase } = session

  return [
    caseContext(caseFile),
    '',
    `Current phase: ${phase}`,
    `Player role: ${playerRole}`,
    `Player objective: ${roleObjective(caseFile, playerRole)}`,
    `Your role: ${aiRole}`,
    `Your objective: ${roleObjective(caseFile, aiRole)}`,
    `Difficulty reasoning notes: ${caseFile.difficulty.reasoningNotes}`,
    `Objection aggressiveness: ${caseFile.difficulty.objectionAggressiveness}`,
    '',
    'Transcript so far:',
    formatTranscript(session.transcript),
    '',
    'Generate the next lawyer turn now.',
  ].join('\n')
}

export function judgeSystemPrompt(mode: 'ruling' | 'verdict'): string {
  if (mode === 'ruling') {
    return [
      'You are the AI judge for a courtroom roleplay session.',
      'Your task is to rule on objections briefly and formally.',
      'Do not coach either side.',
      'Base your ruling only on the supplied objection, transcript, and case file context.',
      'Keep the ruling concise: usually 1 to 3 sentences.',
    ].join('\n')
  }

  return [
    'You are the AI judge for a courtroom roleplay session.',
    'Your task is to evaluate the full transcript against the authored case file and return a final verdict.',
    'You must remain grounded in the supplied record.',
    'If the player provided no substantive courtroom argument, the player should not win by default.',
    'Score both sides on argument strength, evidence use, logical consistency, pressure response, and objection handling.',
    'Return a structured response using the exact headings: OUTCOME, SUMMARY, REASONING, PLAYER_STRENGTHS, PLAYER_GAPS, OPPONENT_ADVANTAGES.',
  ].join('\n')
}

export function buildJudgeRulingUserMessage(session: SessionState): string {
  const pendingObjection = [...session.objections].reverse().find((entry) => entry.outcome === undefined)

  if (!pendingObjection) {
    throw new Error('No pending objection found for judge ruling.')
  }

  return [
    caseContext(session.caseFile),
    '',
    `Current phase: ${session.phase}`,
    `Pending objection type: ${pendingObjection.type}`,
    `Raised by: ${pendingObjection.raisedBy}`,
    `Rationale: ${pendingObjection.rationale}`,
    `Target transcript turn index: ${pendingObjection.targetTurnIndex}`,
    '',
    'Transcript so far:',
    formatTranscript(session.transcript),
    '',
    'Issue a brief courtroom ruling now.',
  ].join('\n')
}

export function buildFinalVerdictUserMessage(session: SessionState): string {
  return [
    caseContext(session.caseFile),
    '',
    `Player role: ${session.playerRole}`,
    `AI lawyer role: ${session.aiRole}`,
    `Current phase: ${session.phase}`,
    `Player turns taken: ${session.playerTurnsTaken}`,
    `Lawyer turns taken: ${session.lawyerTurnsTaken}`,
    '',
    'Transcript:',
    formatTranscript(session.transcript),
    '',
    'Objections:',
    formatObjections(session.objections),
    '',
    'Return the final verdict now.',
  ].join('\n')
}

export function nextLawyerPhase(currentPhase: SessionPhase): SessionPhase {
  return currentPhase === 'opening' ? 'opening' : currentPhase
}
