import OpenAI from 'openai'
import Groq from 'groq-sdk'
import type { AgentModelConfig } from './config.js'
import { LLM_MAX_TOKENS, LLM_TEMPERATURE } from './config.js'

type Message = { role: 'system' | 'user' | 'assistant'; content: string }

// Singletons — instantiated once on first use, not on every call
let _openai: OpenAI | null = null
let _groq: Groq | null = null

export function getOpenAIClient(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set')
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

function getGroqClient(): Groq {
  if (!_groq) {
    if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not set')
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return _groq
}

export async function* streamAgentTurn(
  systemPrompt: string,
  userMessage: string,
  config: AgentModelConfig
): AsyncGenerator<string> {
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: userMessage  },
  ]

  if (config.provider === 'openai') {
    const client = getOpenAIClient()
    const stream = await client.chat.completions.create({
      model: config.model,
      messages,
      max_completion_tokens: 4000,
      stream: true,
    })
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content
      if (token) yield token
    }

  } else {
    const client = getGroqClient()
    const stream = await client.chat.completions.create({
      model: config.model,
      messages,
      max_tokens: LLM_MAX_TOKENS,
      temperature: LLM_TEMPERATURE,
      stream: true,
    })
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content
      if (token) yield token
    }
  }
}

// Used for ARBITER deliberation — returns full content at once, no streaming
export async function callAgentOnce(
  systemPrompt: string,
  userMessage: string,
  config: AgentModelConfig
): Promise<string> {
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: userMessage  },
  ]

  if (config.provider === 'openai') {
    const client = getOpenAIClient()
    const response = await client.chat.completions.create({
      model: config.model,
      messages,
      max_completion_tokens: 8000,
      stream: false,
    })
    return response.choices[0]?.message?.content ?? ''

  } else {
    const client = getGroqClient()
    const response = await client.chat.completions.create({
      model: config.model,
      messages,
      max_tokens: 800,
      temperature: LLM_TEMPERATURE,
      stream: false,
    })
    return response.choices[0]?.message?.content ?? ''
  }
}
