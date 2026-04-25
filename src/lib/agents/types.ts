export type AgentId = 'accuse' | 'advocate' | 'chronicle' | 'ethos'

export type Phase = 'opening' | 'examination' | 'cross' | 'closing'

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
