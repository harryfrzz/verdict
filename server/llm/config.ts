import { getLevelConfig } from '../../config/levels.js'
import type { AgentId, AIActor, DifficultyTier, LLMProvider } from '../../src/lib/agents/types.js'

export interface AgentModelConfig {
  provider: LLMProvider
  model: string
  streaming: boolean
  temperature?: number
  maxOutputTokens?: number
}

export const AGENT_CONFIGS: Record<AgentId, AgentModelConfig> = {
  arbiter:  { provider: 'openai', model: 'gpt-5.5',                       streaming: false },
  accuse:   { provider: 'openai', model: 'gpt-5',                         streaming: true  },
  advocate: { provider: 'groq',   model: 'deepseek-r1-distill-llama-70b', streaming: true  },
  chronicle:{ provider: 'groq',   model: 'llama-3.1-8b-instant',          streaming: true  },
  ethos:    { provider: 'groq',   model: 'gemma2-9b-it',                  streaming: true  },
}

export const LLM_MAX_TOKENS = parseInt(process.env.LLM_MAX_TOKENS || '600') || 600
export const LLM_TEMPERATURE = parseFloat(process.env.LLM_TEMPERATURE || '0.8') || 0.8

export function getCourtActorConfig(level: DifficultyTier, actor: AIActor): AgentModelConfig {
  const levelConfig = getLevelConfig(level)

  return {
    provider: levelConfig.provider,
    model: actor === 'lawyer' ? levelConfig.lawyerModel : levelConfig.judgeModel,
    streaming: actor === 'lawyer',
    temperature: levelConfig.temperature,
    maxOutputTokens: levelConfig.maxOutputTokens,
  }
}

export function getActorVoice(level: DifficultyTier, actor: AIActor): string {
  const levelConfig = getLevelConfig(level)
  return actor === 'lawyer' ? levelConfig.lawyerVoice : levelConfig.judgeVoice
}
