import { useRef, useState } from 'react'

interface CourtTurnProps {
  name: string
  title: string
  imageSrc: string
  side: 'left' | 'right'
  text: string
  accentClass: string
  isUserTurn?: boolean
  userInput?: string
  onUserInputChange?: (value: string) => void
  onUserSubmit?: () => void
  onTranscribeAudio?: (blob: Blob) => Promise<string>
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  isBusy?: boolean
}

function CourtTurn({
  name,
  title,
  imageSrc,
  side,
  text,
  accentClass,
  isUserTurn = false,
  userInput = '',
  onUserInputChange,
  onUserSubmit,
  onTranscribeAudio,
  secondaryActionLabel,
  onSecondaryAction,
  isBusy = false,
}: CourtTurnProps) {
  const wrapperPosition = side === 'left' ? 'justify-start' : 'justify-end'
  const textAlign = side === 'left' ? 'text-left items-start' : 'text-right items-end'
  const slideAnimation =
    side === 'left' ? 'animate-verdict-slide-in-left' : 'animate-verdict-slide-in-right'

  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  async function handleVoiceClick() {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      return
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      return
    }

    const chunks: Blob[] = []
    const recorder = new MediaRecorder(stream)

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    recorder.onstop = async () => {
      setIsRecording(false)
      stream.getTracks().forEach((t) => t.stop())

      if (!onTranscribeAudio) return
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
      setIsTranscribing(true)
      try {
        const text = await onTranscribeAudio(blob)
        if (text) onUserInputChange?.(text)
      } finally {
        setIsTranscribing(false)
      }
    }

    mediaRecorderRef.current = recorder
    recorder.start()
    setIsRecording(true)
  }

  const voiceButtonDisabled = isBusy || isTranscribing || !onTranscribeAudio

  return (
    <div className={`flex min-h-[calc(100vh-8rem)] w-full items-center ${wrapperPosition}`}>
      <div className={`flex w-full max-w-[34rem] flex-col ${textAlign} ${slideAnimation}`}>
        <div className="relative flex w-full justify-center">
          <div
            className={`absolute bottom-8 h-44 w-44 rounded-full blur-3xl ${
              side === 'left' ? 'left-10 bg-violet-500/28' : 'right-10 bg-red-500/28'
            }`}
          />
          <img
            className="relative z-10 h-[min(50vh,34rem)] w-full object-contain object-bottom drop-shadow-[0_28px_32px_rgba(0,0,0,0.55)]"
            src={imageSrc}
            alt={name}
          />
        </div>

        <div
          className={`relative z-20 -mt-8 flex w-full flex-col gap-3 ${textAlign} animate-verdict-float-in`}
          style={{ animationDelay: '120ms' }}
        >
          <div className="rounded-md border border-white/12 bg-black/70 px-4 py-3 backdrop-blur-sm">
            <div className={`flex items-center gap-3 ${side === 'right' ? 'justify-end' : ''}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${accentClass}`} />
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-stone-400">{title}</p>
                <p className="text-base font-semibold text-stone-100">{name}</p>
              </div>
            </div>
          </div>
          {isUserTurn ? (
            <form
              className="rounded-xl w-120 border border-amber-200/45 bg-stone-50 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.42)]"
              onSubmit={(event) => {
                event.preventDefault()
                onUserSubmit?.()
              }}
            >
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Your argument
                </span>
                <div className="mt-2 flex gap-2">
                  <textarea
                    value={userInput}
                    onChange={(event) => onUserInputChange?.(event.target.value)}
                    rows={6}
                    placeholder={text}
                    className="block h-32 w-full overflow-y-auto resize-none rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm leading-6 text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-stone-950"
                  />
                  <button
                    type="button"
                    aria-label={isRecording ? 'Stop recording' : isTranscribing ? 'Transcribing…' : 'Record voice input'}
                    title={isRecording ? 'Stop recording' : 'Voice input'}
                    disabled={voiceButtonDisabled && !isRecording}
                    onClick={() => { void handleVoiceClick() }}
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border transition ${
                      isRecording
                        ? 'border-red-400 bg-red-50 text-red-500 hover:border-red-600 hover:text-red-600'
                        : isTranscribing
                          ? 'border-stone-200 bg-stone-100 text-stone-400 cursor-wait'
                          : 'border-stone-300 bg-white text-stone-700 hover:border-stone-950 hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-40'
                    }`}
                  >
                    {isRecording ? (
                      // Stop icon
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <rect x="4" y="4" width="16" height="16" rx="2" />
                      </svg>
                    ) : isTranscribing ? (
                      // Spinner
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="animate-spin">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                    ) : (
                      // Mic icon
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <path d="M12 19v3" />
                      </svg>
                    )}
                  </button>
                </div>
              </label>
              <button
                type="submit"
                disabled={isBusy || userInput.trim().length === 0}
                className="mt-3 w-full rounded-lg bg-stone-950 px-4 py-3 text-sm font-semibold text-stone-50 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
              >
                {isBusy ? 'Submitting...' : 'Submit Argument'}
              </button>
              {secondaryActionLabel && onSecondaryAction ? (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={onSecondaryAction}
                  className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-950 hover:text-stone-950 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400"
                >
                  {secondaryActionLabel}
                </button>
              ) : null}
            </form>
          ) : (
            <div className="w-full">
              <div className="h-56 overflow-y-auto rounded-md border border-white/12 bg-stone-50 px-5 py-4 text-base font-medium leading-7 text-stone-950 shadow-[0_22px_70px_rgba(0,0,0,0.36)]">
                {text}
              </div>
              {secondaryActionLabel && onSecondaryAction ? (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={onSecondaryAction}
                  className="mt-3 w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-950 hover:text-stone-950 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400"
                >
                  {secondaryActionLabel}
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CourtTurn
