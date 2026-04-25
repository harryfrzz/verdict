export interface StreamEvent {
  token: string
  done: boolean
  fullContent?: string
  error?: string
}

export async function* readSSEStream(response: Response): AsyncGenerator<StreamEvent> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Response body is not readable')

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue
        const raw = trimmed.slice(6)
        try {
          const event = JSON.parse(raw) as StreamEvent
          yield event
          if (event.done) return
        } catch {
          // malformed line — skip
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
