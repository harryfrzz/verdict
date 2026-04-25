// Streams PCM16 24kHz audio chunks from the OpenAI Realtime API via Web Audio API.
// Base64-encoded chunks arrive in order and are scheduled for gapless playback.

export interface AudioStreamPlayer {
  enqueue: (base64Chunk: string) => void
  stop: () => void
}

export function createAudioStreamPlayer(): AudioStreamPlayer {
  const ctx = new AudioContext({ sampleRate: 24000 })
  // Kick off resume immediately — browsers may start AudioContext suspended
  void ctx.resume()

  let nextStartTime = 0
  let stopped = false

  function enqueue(base64Chunk: string) {
    if (stopped || !base64Chunk) return

    // Re-trigger resume each time in case the context drifted back to suspended
    if (ctx.state !== 'running') void ctx.resume()

    try {
      const binary = atob(base64Chunk)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

      const pcm16 = new Int16Array(bytes.buffer)
      const float32 = new Float32Array(pcm16.length)
      for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768

      const buffer = ctx.createBuffer(1, float32.length, 24000)
      buffer.copyToChannel(float32, 0)

      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)

      // Always schedule at least 80ms ahead of now so chunks don't land in the past
      const startAt = Math.max(ctx.currentTime + 0.08, nextStartTime)
      source.start(startAt)
      nextStartTime = startAt + buffer.duration
    } catch {
      // malformed chunk — skip silently
    }
  }

  function stop() {
    stopped = true
    void ctx.close()
  }

  return { enqueue, stop }
}
