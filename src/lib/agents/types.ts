export type AgentId = 'arbiter' | 'accuse' | 'advocate' | 'chronicle' | 'ethos'

export type Phase =
  | 'plea'
  | 'opening'
  | 'examination'
  | 'cross'
  | 'closing'
  | 'deliberation'
  | 'verdict'

export type Plea = 'guilty' | 'not_guilty'

export type LLMProvider = 'openai' | 'groq'

export interface Turn {
  agentId: AgentId | 'clerk'
  phase: Phase
  turnNumber: number
  content: string
  timestamp: number
  type: 'statement' | 'clerk'
}

export interface CaseFile {
  question: string
  category: string
  plea: Plea | null
  transcript: Turn[]
  phase: Phase
  round: number
}

export interface VerdictResult {
  ruling: string
  reasoning: string
  dissent: string
  winningSide: 'prosecution' | 'defense' | 'split'
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
