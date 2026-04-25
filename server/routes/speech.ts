import { Router } from 'express'
import type { Request, Response } from 'express'
import OpenAI, { toFile } from 'openai'

const router = Router()

let _openai: OpenAI | null = null

function getClient(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set')
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

// POST /api/speech/transcribe
// Body: { audio: string (base64), mimeType?: string }
router.post('/transcribe', async (req: Request, res: Response) => {
  const { audio, mimeType } = req.body as { audio?: unknown; mimeType?: unknown }

  if (typeof audio !== 'string' || audio.length === 0) {
    res.status(400).json({ error: 'audio (base64) is required.' })
    return
  }

  const resolvedMime = typeof mimeType === 'string' ? mimeType : 'audio/webm'
  const ext = resolvedMime.includes('mp4') ? 'mp4'
    : resolvedMime.includes('ogg') ? 'ogg'
    : resolvedMime.includes('wav') ? 'wav'
    : 'webm'

  try {
    const buffer = Buffer.from(audio, 'base64')
    const client = getClient()
    const file = await toFile(buffer, `recording.${ext}`, { type: resolvedMime })

    const transcription = await client.audio.transcriptions.create({
      model: 'whisper-1',
      file,
    })

    res.json({ text: transcription.text })
  } catch (error) {
    console.error('[SPEECH] transcription failed:', error)
    res.status(500).json({ error: 'Transcription failed.' })
  }
})

export default router
