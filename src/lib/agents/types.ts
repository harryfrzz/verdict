export type Role = 'prosecution' | 'defense'

export type SessionPhase =
  | 'case_selection'
  | 'case_study'
  | 'role_selection'
  | 'charges'
  | 'opening'
  | 'argument'
  | 'objection'
  | 'closing'
  | 'deliberation'
  | 'verdict'

type LegacyPhase = 'plea' | 'examination' | 'cross'

// Transitional union to keep the existing frontend compiling while the new
// turn-based courtroom flow is introduced phase by phase.
export type Phase = SessionPhase | LegacyPhase

export type LLMProvider = 'openai' | 'groq'

export type TurnSpeaker = 'player' | 'lawyer' | 'judge' | 'clerk'
export type AIActor = 'lawyer' | 'judge'

export type ObjectionType =
  | 'leading'
  | 'hearsay'
  | 'speculation'
  | 'argumentative'
  | 'relevance'
  | 'asked_and_answered'
  | 'foundation'
  | 'compound'
  | 'other'

export type ObjectionOutcome = 'sustained' | 'overruled' | 'reserved'

export type DifficultyTier = 1 | 2 | 3 | 4 | 5
export type Aggressiveness = 'low' | 'medium' | 'high' | 'extreme'
export type Strictness = 'low' | 'medium' | 'high'

export interface WitnessRecord {
  id: string
  name: string
  relationToCase: string
  statement: string
  reliabilityNotes?: string
}

export interface EvidenceItem {
  id: string
  item: string
  description: string
  whereFound: string
  relevance: string
}

export interface PriorRuling {
  title: string
  citation?: string
  relevance: string
}

export interface CasePreview {
  summary: string
  charge: string
  evidence: string
  complication: string
}

export interface DifficultyConfig {
  level: DifficultyTier
  label: string
  provider: LLMProvider
  lawyerModel: string
  judgeModel: string
  temperature: number
  reasoningNotes: string
  maxOutputTokens: number
  objectionAggressiveness: Aggressiveness
  witnessConsistencyStrictness: Strictness
  retrievalEnabled: boolean
  lawyerVoice: string
  judgeVoice: string
}

export interface CaseFile {
  id: string
  title: string
  level: DifficultyTier
  category: string
  summary: string
  preview: CasePreview
  date: string
  location: string
  charges: string[]
  policeReport: string
  witnesses: WitnessRecord[]
  evidence: EvidenceItem[]
  prosecutionObjective: string
  defenseObjective: string
  priorRulings?: PriorRuling[]
  difficulty: DifficultyConfig
}

export interface Turn {
  speaker: TurnSpeaker
  speakerId?: string
  role?: Role
  phase: Phase
  content: string
  timestamp: number
  metadata?: Record<string, unknown>
}

export interface ObjectionRecord {
  id: string
  phase: Phase
  raisedBy: Role
  targetTurnIndex: number
  type: ObjectionType
  rationale: string
  outcome?: ObjectionOutcome
  ruling?: string
  resumeSpeaker?: TurnSpeaker
  timestamp: number
}

export interface SessionState {
  sessionId: string
  caseId: string
  caseFile: CaseFile
  playerRole: Role
  aiRole: Role
  phase: SessionPhase
  transcript: Turn[]
  objections: ObjectionRecord[]
  awaitingPlayerInput: boolean
  nextSpeaker: TurnSpeaker
  createdAt: number
  updatedAt: number
}

export interface SessionMutationResult {
  session: SessionState
  appendedTurn?: Turn
  appendedObjection?: ObjectionRecord
}

export interface ScoreBreakdown {
  argumentStrength: number
  evidenceUse: number
  logicalConsistency: number
  pressureResponse: number
  objectionHandling: number
}

export interface VerdictFeedback {
  strongestArguments: string[]
  missedEvidence: string[]
  exploitedWeaknesses: string[]
  improvementNotes: string[]
}

export interface VerdictResult {
  outcome: 'win' | 'loss'
  winner: Role
  playerScore: ScoreBreakdown
  aiScore: ScoreBreakdown
  summary: string
  reasoning: string
  feedback: VerdictFeedback
}

export type LevelConfig = DifficultyConfig

export interface SessionStore {
  get(sessionId: string): SessionState | undefined | Promise<SessionState | undefined>
  set(session: SessionState): void | Promise<void>
  delete(sessionId: string): void | Promise<void>
}

// Compatibility exports for the deprecated pre-pivot implementation.
export type Plea = 'guilty' | 'not_guilty'
export type LegacyAgentId = 'arbiter' | 'accuse' | 'advocate' | 'chronicle' | 'ethos'
export type AgentId = LegacyAgentId

export interface LegacyTurn {
  agentId: AgentId | 'clerk'
  phase: Phase
  turnNumber: number
  content: string
  timestamp: number
  type: 'statement' | 'clerk'
}

export interface LegacyCaseFile {
  question: string
  category: string
  plea: Plea | null
  transcript: LegacyTurn[]
  phase: Phase
  round: number
}

export interface AgentScore {
  agentId: AgentId
  pointsArgued: number
  witnessesExamined: number
}

export interface AgentRole {
  id: AgentId
  name: string
  title: string
  imageSrc: string
  alignment: 'left' | 'right'
  accentClass: string
}

export interface TranscriptTurn {
  agentId: AgentId
  phase: Phase
  content: string
}

export type ClerkEvent =
  | 'session_open'
  | 'opening_accuse'
  | 'opening_advocate'
  | 'call_chronicle'
  | 'call_ethos'
  | 'cross_advocate'
  | 'cross_accuse'
  | 'witness_dismissed'
  | 'closing_accuse'
  | 'closing_advocate'
  | 'deliberation_begin'
  | 'verdict_begin'
