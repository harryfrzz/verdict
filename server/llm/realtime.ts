import OpenAI from 'openai'
import { OpenAIRealtimeWebSocket } from 'openai/realtime/websocket.js'

const REALTIME_MODEL = 'gpt-realtime-1.5'

export type RealtimeChunk =
  | { type: 'text'; delta: string }
  | { type: 'audio'; chunk: string }

let _openai: OpenAI | null = null

function getClient(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set')
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

class AsyncQueue<T> {
  private items: T[] = []
  private resolvers: Array<(val: T | null) => void> = []
  private rejecters: Array<(err: Error) => void> = []
  private closed = false
  private err: Error | null = null

  push(item: T) {
    if (this.resolvers.length > 0) {
      const resolve = this.resolvers.shift()!
      this.rejecters.shift()
      resolve(item)
    } else {
      this.items.push(item)
    }
  }

  close(err?: Error) {
    this.closed = true
    this.err = err ?? null
    for (let i = 0; i < this.resolvers.length; i++) {
      if (err) this.rejecters[i]?.(err)
      else this.resolvers[i]?.(null)
    }
    this.resolvers = []
    this.rejecters = []
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<T> {
    while (true) {
      if (this.items.length > 0) {
        yield this.items.shift()!
        continue
      }

      if (this.closed) {
        if (this.err) throw this.err
        return
      }

      const item = await new Promise<T | null>((resolve, reject) => {
        if (this.items.length > 0) { resolve(this.items.shift()!); return }
        if (this.closed) { this.err ? reject(this.err) : resolve(null); return }
        this.resolvers.push(resolve)
        this.rejecters.push(reject)
      })

      if (item === null) return
      yield item
    }
  }
}

export async function* streamRealtimeTurn(
  instructions: string,
  userMessage: string,
  voice: string,
): AsyncGenerator<RealtimeChunk> {
  const client = getClient()
  const queue = new AsyncQueue<RealtimeChunk>()

  const rt = await OpenAIRealtimeWebSocket.create(client, { model: REALTIME_MODEL })

  rt.on('session.created', () => {
    rt.send({
      type: 'session.update',
      session: {
        type: 'realtime',
        instructions,
        output_modalities: ['audio'],
        audio: {
          input: { turn_detection: null },
          output: {
            voice,
            format: { type: 'audio/pcm', rate: 24000 },
          },
        },
      },
    })

    rt.send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: userMessage }],
      },
    })

    rt.send({ type: 'response.create' })
  })

  rt.on('response.output_audio_transcript.delta', (event) => {
    queue.push({ type: 'text', delta: event.delta })
  })

  rt.on('response.output_audio.delta', (event) => {
    queue.push({ type: 'audio', chunk: event.delta })
  })

  rt.on('response.done', () => {
    queue.close()
    try { rt.close({ code: 1000, reason: 'done' }) } catch { /* already closed */ }
  })

  rt.on('error', (error) => {
    queue.close(new Error(error.message ?? 'Realtime API error'))
    try { rt.close({ code: 1000, reason: 'error' }) } catch { /* already closed */ }
  })

  yield* queue
}
