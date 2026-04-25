import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import CharacterSetup, { type SetupCharacter } from './components/roleplay/CharacterSetup'
import CourtTurn from './components/roleplay/CourtTurn'
import LandingPage, { type CaseDifficultyRange, type CaseLevel } from './components/roleplay/LandingPage'
import { createAudioStreamPlayer, type AudioStreamPlayer } from './lib/audio/player'
import type { ApiSession } from './lib/session/api'
import {
  createBackendSession,
  listBackendCases,
  streamFinalVerdict,
  streamLawyerTurn,
  submitPlayerTurn as submitPlayerTurnRequest,
  transcribeAudio,
} from './lib/session/api'
import { parseVerdictContent } from './lib/session/verdict'

type UserSide = 'accuse' | 'advocate'

interface DisplayRole {
  name: string
  title: string
  imageSrc: string
  side: 'left' | 'right'
  accentClass: string
}

const setupCharacters: SetupCharacter[] = [
  {
    id: 'arbiter',
    name: 'ARBITER',
    title: 'Judge',
    imageSrc: '/judge.png',
    accentClass: 'bg-amber-300',
  },
  {
    id: 'accused',
    name: 'ACCUSED',
    title: 'Non-speaking subject',
    imageSrc: '/accused_person.png',
    accentClass: 'bg-stone-300',
  },
  {
    id: 'accuse',
    name: 'ACCUSE',
    title: 'Prosecution',
    imageSrc: '/lawyer_1.png',
    accentClass: 'bg-red-400',
  },
  {
    id: 'advocate',
    name: 'ADVOCATE',
    title: 'Defense',
    imageSrc: '/lawyer_2.png',
    accentClass: 'bg-violet-400',
  },
]

function backendRoleForUserSide(userSide: UserSide): 'prosecution' | 'defense' {
  return userSide === 'accuse' ? 'prosecution' : 'defense'
}

function buildRoleMap(
  session: ApiSession | null,
  userSide: UserSide,
): Record<'player' | 'lawyer' | 'judge' | 'clerk', DisplayRole> {
  const playerRole = session?.playerRole ?? backendRoleForUserSide(userSide)
  const aiRole = session?.aiRole ?? (playerRole === 'prosecution' ? 'defense' : 'prosecution')

  const prosecutionRole: DisplayRole = {
    name: 'ACCUSE',
    title: 'Prosecution',
    imageSrc: '/lawyer_1.png',
    side: 'right',
    accentClass: 'bg-red-400',
  }

  const defenseRole: DisplayRole = {
    name: 'ADVOCATE',
    title: 'Defense',
    imageSrc: '/lawyer_2.png',
    side: 'left',
    accentClass: 'bg-violet-400',
  }

  return {
    player: playerRole === 'prosecution' ? prosecutionRole : defenseRole,
    lawyer: aiRole === 'prosecution' ? prosecutionRole : defenseRole,
    judge: {
      name: 'ARBITER',
      title: 'Judge',
      imageSrc: '/judge.png',
      side: 'right',
      accentClass: 'bg-amber-300',
    },
    clerk: {
      name: 'CLERK',
      title: 'Court Clerk',
      imageSrc: '/clerk.png',
      side: 'right',
      accentClass: 'bg-stone-400',
    },
  }
}

function App() {
  const [cases, setCases] = useState<CaseLevel[]>([])
  const [casesLoading, setCasesLoading] = useState(true)
  const [loadingError, setLoadingError] = useState<string | null>(null)
  const [courtOpen, setCourtOpen] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState<CaseLevel | null>(null)
  const [selectedRange, setSelectedRange] = useState<CaseDifficultyRange | null>(null)
  const [caseDetailsOpen, setCaseDetailsOpen] = useState(false)
  const [adjournmentOpen, setAdjournmentOpen] = useState(false)
  const [returnCountdown, setReturnCountdown] = useState(5)
  const [userSide, setUserSide] = useState<UserSide>('advocate')
  const [session, setSession] = useState<ApiSession | null>(null)
  const [streamingLawyerText, setStreamingLawyerText] = useState('')
  const [pendingJudgeText, setPendingJudgeText] = useState<string | null>(null)
  const [userTurnInput, setUserTurnInput] = useState('')
  const [playerTurnUnlocked, setPlayerTurnUnlocked] = useState(false)
  const [isWorking, setIsWorking] = useState(false)
  const [judgeControlsOpen, setJudgeControlsOpen] = useState(false)
  const [bgMusicMuted, setBgMusicMuted] = useState(false)
  const judgeControlsRef = useRef<HTMLDivElement | null>(null)
  const lawyerAudioRef = useRef<AudioStreamPlayer | null>(null)
  const judgeAudioRef = useRef<AudioStreamPlayer | null>(null)
  const bgMusicRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadCases() {
      try {
        const loadedCases = await listBackendCases()
        if (!cancelled) {
          setCases(loadedCases as CaseLevel[])
          setLoadingError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setLoadingError(error instanceof Error ? error.message : 'Unable to load cases.')
        }
      } finally {
        if (!cancelled) {
          setCasesLoading(false)
        }
      }
    }

    void loadCases()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!judgeControlsOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (judgeControlsRef.current?.contains(event.target as Node)) {
        return
      }

      setJudgeControlsOpen(false)
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [judgeControlsOpen])

  useEffect(() => {
    if (!adjournmentOpen) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      if (returnCountdown <= 1) {
        resetCourt()
        return
      }

      setReturnCountdown((countdown) => countdown - 1)
    }, 1000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [adjournmentOpen, returnCountdown])

  useEffect(() => {
    const audio = bgMusicRef.current
    if (!audio) {
      return
    }

    const shouldPlayMenuMusic = !courtOpen && !adjournmentOpen
    audio.loop = true
    audio.volume = 0.35
    audio.muted = bgMusicMuted

    if (shouldPlayMenuMusic && !bgMusicMuted) {
      void audio.play().catch(() => {
        // Browsers may block autoplay until the first user gesture.
      })
      return
    }

    audio.pause()
  }, [adjournmentOpen, bgMusicMuted, courtOpen])

  useEffect(() => {
    if (courtOpen || adjournmentOpen || bgMusicMuted) {
      return
    }

    const playOnInteraction = () => {
      const audio = bgMusicRef.current
      if (!audio) {
        return
      }

      audio.muted = false
      void audio.play().catch(() => {
        // If playback is still blocked, the toggle button can start it later.
      })
    }

    window.addEventListener('pointerdown', playOnInteraction, { once: true })
    return () => {
      window.removeEventListener('pointerdown', playOnInteraction)
    }
  }, [adjournmentOpen, bgMusicMuted, courtOpen])

  const roleMap = useMemo(() => buildRoleMap(session, userSide), [session, userSide])
  const visibleTurns = useMemo(() => session?.transcript ?? [], [session])
  const latestTurn = useMemo(() => {
    if (visibleTurns.length === 0) {
      return null
    }

    return visibleTurns[visibleTurns.length - 1]
  }, [visibleTurns])

  const verdictTurn = useMemo(() => {
    const candidate = [...visibleTurns].reverse().find((turn) => turn.phase === 'verdict')
    return candidate ?? null
  }, [visibleTurns])
  const parsedVerdict = useMemo(
    () => (verdictTurn ? parseVerdictContent(verdictTurn.content) : null),
    [verdictTurn],
  )

  const activeCourtTurn = useMemo(() => {
    if (!session) {
      return null
    }

    if (streamingLawyerText.length > 0) {
      return {
        speaker: 'lawyer' as const,
        text: streamingLawyerText,
        phase: session.phase,
      }
    }

    if (pendingJudgeText) {
      return {
        speaker: 'judge' as const,
        text: pendingJudgeText,
        phase: session.phase === 'verdict' ? 'deliberation' : session.phase,
      }
    }

    if (session.awaitingPlayerInput && playerTurnUnlocked) {
      return {
        speaker: 'player' as const,
        text: selectedRange?.template ?? 'Present your next courtroom argument.',
        phase: session.phase,
      }
    }

    if (latestTurn && latestTurn.speaker !== 'clerk') {
      return {
        speaker: latestTurn.speaker,
        text: latestTurn.content,
        phase: latestTurn.phase,
      }
    }

    if (latestTurn) {
      return {
        speaker: 'clerk' as const,
        text: latestTurn.content,
        phase: latestTurn.phase,
      }
    }

    return null
  }, [latestTurn, pendingJudgeText, playerTurnUnlocked, selectedRange, session, streamingLawyerText])

  async function runLawyerTurn(sessionId: string) {
    setIsWorking(true)
    setStreamingLawyerText('')
    setPendingJudgeText(null)

    judgeAudioRef.current?.stop()
    judgeAudioRef.current = null
    lawyerAudioRef.current?.stop()
    lawyerAudioRef.current = createAudioStreamPlayer()
    const lawyerPlayer = lawyerAudioRef.current

    try {
      const updatedSession = await streamLawyerTurn(
        sessionId,
        setStreamingLawyerText,
        (chunk) => lawyerPlayer.enqueue(chunk),
      )
      startTransition(() => {
        setSession(updatedSession)
      })
      setPlayerTurnUnlocked(false)
    } catch (error) {
      setLoadingError(error instanceof Error ? error.message : 'Lawyer turn failed.')
    } finally {
      setStreamingLawyerText('')
      setIsWorking(false)
    }
  }

  async function openCourt() {
    if (!selectedLevel) {
      return
    }

    setLoadingError(null)
    setCourtOpen(true)
    setSession(null)
    setUserTurnInput('')
    setPlayerTurnUnlocked(false)
    setPendingJudgeText(null)
    setIsWorking(true)

    try {
      const createdSession = await createBackendSession(
        selectedLevel.id,
        backendRoleForUserSide(userSide),
      )

      startTransition(() => {
        setSession(createdSession)
      })

      await runLawyerTurn(createdSession.sessionId)
    } catch (error) {
      setCourtOpen(false)
      setLoadingError(error instanceof Error ? error.message : 'Unable to open court.')
      setIsWorking(false)
    }
  }

  async function handlePlayerSubmit() {
    if (!session || userTurnInput.trim().length === 0) {
      return
    }

    setIsWorking(true)
    setLoadingError(null)

    try {
      const updatedSession = await submitPlayerTurnRequest(session.sessionId, userTurnInput.trim())
      setUserTurnInput('')
      setPlayerTurnUnlocked(false)
      startTransition(() => {
        setSession(updatedSession)
      })

      if (updatedSession.phase === 'deliberation' || updatedSession.nextSpeaker === 'judge') {
        lawyerAudioRef.current?.stop()
        lawyerAudioRef.current = null
        judgeAudioRef.current?.stop()
        judgeAudioRef.current = createAudioStreamPlayer()
        const judgePlayer = judgeAudioRef.current
        const verdictSession = await streamFinalVerdict(
          updatedSession.sessionId,
          setPendingJudgeText,
          (chunk) => judgePlayer.enqueue(chunk),
        )
        startTransition(() => {
          setSession(verdictSession)
        })
        setPendingJudgeText(null)
        setIsWorking(false)
        return
      }

      await runLawyerTurn(updatedSession.sessionId)
    } catch (error) {
      setLoadingError(error instanceof Error ? error.message : 'Unable to submit player turn.')
      setIsWorking(false)
    }
  }

  async function handleRequestVerdict() {
    if (!session) {
      return
    }

    setIsWorking(true)
    setLoadingError(null)
    lawyerAudioRef.current?.stop()
    lawyerAudioRef.current = null
    judgeAudioRef.current?.stop()
    judgeAudioRef.current = createAudioStreamPlayer()
    const judgePlayer = judgeAudioRef.current

    try {
      const verdictSession = await streamFinalVerdict(
        session.sessionId,
        setPendingJudgeText,
        (chunk) => judgePlayer.enqueue(chunk),
      )
      startTransition(() => {
        setSession(verdictSession)
      })
      setPendingJudgeText(null)
    } catch (error) {
      setLoadingError(error instanceof Error ? error.message : 'Unable to request final verdict.')
      setPendingJudgeText(null)
    } finally {
      setIsWorking(false)
    }
  }

  async function replayLevel() {
    if (!selectedLevel) {
      return
    }

    setCaseDetailsOpen(false)
    setAdjournmentOpen(false)
    setReturnCountdown(5)
    await openCourt()
  }

  function initiateAdjournment() {
    setCaseDetailsOpen(false)
    setReturnCountdown(5)
    setAdjournmentOpen(true)
  }

  function resetCourt() {
    lawyerAudioRef.current?.stop()
    lawyerAudioRef.current = null
    judgeAudioRef.current?.stop()
    judgeAudioRef.current = null
    setCourtOpen(false)
    setSession(null)
    setStreamingLawyerText('')
    setPendingJudgeText(null)
    setUserTurnInput('')
    setPlayerTurnUnlocked(false)
    setJudgeControlsOpen(false)
    setCaseDetailsOpen(false)
    setAdjournmentOpen(false)
    setReturnCountdown(5)
    setSelectedLevel(null)
    setSelectedRange(null)
    setLoadingError(null)
    setIsWorking(false)
  }

  function toggleBgMusic() {
    const nextMuted = !bgMusicMuted
    setBgMusicMuted(nextMuted)

    const audio = bgMusicRef.current
    if (!audio) {
      return
    }

    audio.muted = nextMuted
    if (!nextMuted && !courtOpen && !adjournmentOpen) {
      void audio.play().catch(() => {
        // Playback can be retried on the next user gesture.
      })
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <audio ref={bgMusicRef} src="/bg_sound.mp3" loop preload="auto" />
      <img
        className="absolute inset-0 z-0 h-full w-full object-cover"
        src="/bg_courtroom.png"
        alt=""
      />
      <div className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(4,4,8,0.16)_0%,rgba(4,4,8,0.34)_52%,rgba(4,4,8,0.72)_100%)]" />
      {!courtOpen && !selectedLevel ? (
        <button
          type="button"
          aria-label={bgMusicMuted ? 'Unmute background music' : 'Mute background music'}
          onClick={toggleBgMusic}
          className="fixed right-4 top-4 z-30 flex items-center gap-2 rounded-2xl border border-amber-100/20 bg-stone-950/82 px-4 py-3 text-sm font-semibold text-stone-100 shadow-[0_18px_48px_rgba(0,0,0,0.42)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-amber-100/45 hover:bg-stone-900/90 hover:text-amber-100"
        >
          {bgMusicMuted ? (
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M11 5 6 9H2v6h4l5 4V5Z" />
              <path d="m22 9-6 6" />
              <path d="m16 9 6 6" />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M11 5 6 9H2v6h4l5 4V5Z" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
          <span>{bgMusicMuted ? 'Muted' : 'Music'}</span>
        </button>
      ) : null}
      {courtOpen ? (
        <>
          <div
            ref={judgeControlsRef}
            className="group absolute left-[50.1%] top-[44.5%] z-30 -translate-x-1/2 -translate-y-1/2 p-4"
          >
            <button
              type="button"
              aria-label="Toggle court controls"
              onClick={() => setJudgeControlsOpen((isOpen) => !isOpen)}
              className="block"
            >
              <img
                className="relative h-[min(9vh,28rem)] w-auto object-contain drop-shadow-[0_22px_28px_rgba(0,0,0,0.46)] transition duration-300 group-hover:scale-105"
                src="/judge.png"
                alt="Judge"
              />
            </button>
          </div>
          <div className="group absolute left-1/2 top-[65%] z-[3] -translate-x-1/2 -translate-y-1/2">
            <img
              className="relative h-[min(20vh,26rem)] w-auto object-contain drop-shadow-[0_24px_30px_rgba(0,0,0,0.48)] transition duration-300 group-hover:scale-105"
              src="/accused_person.png"
              alt="Accused person"
            />
          </div>
        </>
      ) : null}

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 pb-24 pt-2 sm:px-6">
        <main className="flex flex-1 items-center">
          {activeCourtTurn ? (
            <div className="w-full">
              <CourtTurn
                key={`${activeCourtTurn.speaker}-${session?.updatedAt ?? 'idle'}`}
                name={roleMap[activeCourtTurn.speaker].name}
                title={roleMap[activeCourtTurn.speaker].title}
                imageSrc={roleMap[activeCourtTurn.speaker].imageSrc}
                side={roleMap[activeCourtTurn.speaker].side}
                text={activeCourtTurn.text}
                accentClass={roleMap[activeCourtTurn.speaker].accentClass}
                isUserTurn={activeCourtTurn.speaker === 'player' && session?.phase !== 'verdict'}
                userInput={userTurnInput}
                onUserInputChange={setUserTurnInput}
                onUserSubmit={() => {
                  void handlePlayerSubmit()
                }}
                onTranscribeAudio={transcribeAudio}
                onSecondaryAction={() => {
                  if (session?.awaitingPlayerInput && !playerTurnUnlocked) {
                    setPlayerTurnUnlocked(true)
                    return
                  }

                  void handleRequestVerdict()
                }}
                secondaryActionLabel={
                  session?.awaitingPlayerInput && !playerTurnUnlocked
                    ? 'Next'
                    : session?.awaitingPlayerInput &&
                        playerTurnUnlocked &&
                        session?.phase !== 'verdict'
                      ? 'Request Verdict'
                      : undefined
                }
                isBusy={isWorking}
              />
              {parsedVerdict ? (
                <section className="mx-auto mt-4 max-w-4xl animate-verdict-float-in rounded-xl border border-stone-700 bg-stone-950/96 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.32)]">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-amber-100/75">
                    Verdict
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-stone-100">
                    {parsedVerdict.outcome ?? 'Verdict returned'}
                  </h2>
                  {parsedVerdict.summary ? (
                    <p className="mt-3 text-sm leading-6 text-stone-300">{parsedVerdict.summary}</p>
                  ) : null}
                  {parsedVerdict.reasoning ? (
                    <p className="mt-3 text-sm leading-6 text-stone-400">
                      {parsedVerdict.reasoning}
                    </p>
                  ) : null}
                </section>
              ) : null}
            </div>
          ) : !courtOpen && selectedLevel ? (
            <div className="relative w-full">
              <div className="absolute left-0 top-4 z-30 flex max-w-2xl items-stretch gap-3">
                <button
                  type="button"
                  aria-label="Go home"
                  onClick={resetCourt}
                  className="flex h-16 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-100/20 bg-stone-950/82 text-stone-100 shadow-[0_18px_48px_rgba(0,0,0,0.42)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-amber-100/45 hover:bg-stone-900/90 hover:text-amber-100"
                >
                  <svg
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m3 11 9-8 9 8" />
                    <path d="M5 10v10h14V10" />
                    <path d="M9 20v-6h6v6" />
                  </svg>
                </button>
                {selectedRange ? (
                  <div className="flex h-16 min-w-0 items-center rounded-2xl border border-amber-100/15 bg-[linear-gradient(145deg,rgba(28,25,23,0.88),rgba(12,10,9,0.86))] px-4 shadow-[0_18px_48px_rgba(0,0,0,0.42)] backdrop-blur-sm">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-100/75">
                        {selectedRange.difficulty} Mission
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-stone-50">
                        {selectedLevel.title}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
              <form
                className="absolute right-0 top-4 z-30 flex h-16 w-full max-w-2xl animate-verdict-float-in items-stretch gap-3"
                onSubmit={(event) => {
                  event.preventDefault()
                  void openCourt()
                }}
              >
                <div className="flex min-w-0 flex-1 items-center rounded-2xl border border-amber-100/15 bg-[linear-gradient(145deg,rgba(28,25,23,0.96),rgba(12,10,9,0.96)_58%,rgba(41,18,18,0.9))] px-4 py-2 shadow-[0_24px_74px_rgba(0,0,0,0.58)] ring-1 ring-white/[0.04] backdrop-blur-sm">
                  <label className="min-w-0 flex-1">
                    <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-100/70">
                      Mission Description
                    </span>
                    <input
                      type="text"
                      readOnly
                      value={selectedRange?.template ?? selectedLevel.summary}
                      className="block h-8 w-full whitespace-nowrap rounded-xl border-transparent bg-stone-900/70 px-3 text-sm text-stone-100 outline-none transition focus:ring-amber-100/35"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={isWorking}
                  className="h-16 shrink-0 rounded-2xl border border-amber-50/45 bg-gradient-to-r from-amber-100 to-orange-200 px-6 text-sm font-bold text-stone-950 shadow-[0_18px_48px_rgba(251,191,36,0.24)] transition hover:-translate-y-0.5 hover:from-amber-50 hover:to-orange-100 disabled:cursor-not-allowed disabled:opacity-70 active:scale-[0.98]"
                >
                  {isWorking ? 'Opening...' : 'Begin Mission'}
                </button>
              </form>
              <CharacterSetup
                characters={setupCharacters}
                userSide={userSide}
                onUserSideChange={setUserSide}
              />
            </div>
          ) : !courtOpen ? (
            casesLoading ? (
              <div className="mx-auto max-w-2xl rounded-xl border border-stone-700 bg-stone-950/96 px-6 py-8 text-center text-stone-200">
                Loading authored case files...
              </div>
            ) : loadingError ? (
              <div className="mx-auto max-w-2xl rounded-xl border border-red-900/70 bg-stone-950/96 px-6 py-8 text-center text-red-200">
                {loadingError}
              </div>
            ) : (
              <LandingPage
                levels={cases}
                onPlay={(level, range) => {
                  setSelectedLevel(level)
                  setSelectedRange(range)
                }}
              />
            )
          ) : null}
        </main>
      </div>

      {courtOpen ? (
        <div className="fixed inset-x-0 bottom-0 z-20 animate-verdict-slide-up border-t border-stone-700 bg-stone-950">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-3 sm:px-6">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md border border-stone-700 bg-stone-900 px-4 py-3 transition hover:border-stone-500">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
                    Transcript
                  </p>
                  <p className="truncate text-sm font-semibold text-stone-100">
                    {selectedLevel?.title ?? 'Live Backend Session'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault()
                      initiateAdjournment()
                    }}
                    className="rounded-md border border-red-400/50 bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-red-300 hover:bg-red-500"
                  >
                    Court adjourned
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault()
                      void replayLevel()
                    }}
                    className="rounded-md bg-amber-200 px-3 py-1.5 text-xs font-semibold text-stone-950 transition hover:bg-amber-100 active:scale-[0.98]"
                  >
                    Replay level
                  </button>
                  {selectedLevel && selectedRange ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault()
                        setCaseDetailsOpen(true)
                      }}
                      className="rounded-md border border-stone-700 bg-stone-950 px-3 py-1.5 text-xs font-medium text-stone-200 transition hover:border-stone-500 hover:bg-stone-800"
                    >
                      Case details
                    </button>
                  ) : null}
                  <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-stone-800 sm:block">
                    <span
                      className="block h-full rounded-full bg-amber-200 transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            session?.maxTurnsPerSide
                              ? ((session.playerTurnsTaken + session.lawyerTurnsTaken) /
                                  (session.maxTurnsPerSide * 2)) *
                                  100
                              : 0,
                          ),
                        )}%`,
                      }}
                    />
                  </span>
                  <span className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-stone-300">
                    {visibleTurns.length} turns
                  </span>
                </div>
              </summary>

              <div className="mt-3 max-h-[42vh] space-y-3 overflow-y-auto pb-2">
                {visibleTurns.length > 0 ? (
                  visibleTurns.map((turn, index) => {
                    const role = roleMap[turn.speaker === 'clerk' ? 'clerk' : turn.speaker]

                    return (
                      <article
                        key={`${turn.speaker}-${turn.timestamp}-${index}`}
                        className="animate-verdict-float-in rounded-md border border-stone-700 bg-stone-900 px-4 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.24)]"
                        style={{ animationDelay: `${index * 35}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`h-2.5 w-2.5 rounded-full ${role.accentClass}`} />
                          <p className="text-sm font-semibold text-stone-100">{role.name}</p>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-stone-400">
                            {turn.phase}
                          </p>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-stone-300">{turn.content}</p>
                      </article>
                    )
                  })
                ) : (
                  <div className="rounded-md border border-dashed border-stone-700 bg-stone-900 px-4 py-6 text-sm leading-6 text-stone-400">
                    The transcript will populate after the court opens.
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>
      ) : null}

      {loadingError && courtOpen ? (
        <div className="fixed right-4 top-4 z-40 rounded-md border border-red-900/70 bg-stone-950/96 px-4 py-3 text-sm text-red-200 shadow-[0_18px_42px_rgba(0,0,0,0.32)]">
          {loadingError}
        </div>
      ) : null}

      {adjournmentOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/88 px-4 backdrop-blur-md">
          <div className="w-full max-w-3xl animate-verdict-float-in overflow-hidden rounded-3xl border border-red-300/25 bg-[linear-gradient(145deg,rgba(28,25,23,0.98),rgba(12,10,9,0.98)_58%,rgba(69,10,10,0.88))] shadow-[0_34px_110px_rgba(0,0,0,0.72)] ring-1 ring-white/[0.05]">
            <div className="relative h-72 overflow-hidden bg-stone-900 sm:h-96">
              <img
                className="absolute inset-0 h-full w-full object-cover"
                src="/court_adjourned.png"
                alt="Court adjourned"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,10,9,0.04)_0%,rgba(12,10,9,0.18)_42%,rgba(12,10,9,0.94)_100%)]" />
            </div>
            <div className="px-6 py-7 text-center sm:px-8">
              <h2 className="text-3xl font-black uppercase tracking-[0.16em] text-red-500 sm:text-4xl">
                Court adjourned
              </h2>
              <p className="mt-3 text-sm font-medium text-stone-300">
                Returning to main menu in {returnCountdown} second{returnCountdown === 1 ? '' : 's'}.
              </p>
              <button
                type="button"
                onClick={resetCourt}
                className="mt-6 rounded-2xl border border-amber-50/45 bg-gradient-to-r from-amber-100 to-orange-200 px-6 py-3 text-sm font-bold text-stone-950 shadow-[0_18px_48px_rgba(251,191,36,0.24)] transition hover:-translate-y-0.5 hover:from-amber-50 hover:to-orange-100 active:scale-[0.98]"
              >
                Return to main menu
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {caseDetailsOpen && selectedLevel && selectedRange ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-2xl animate-verdict-float-in rounded-2xl border border-stone-700 bg-stone-950 p-5 shadow-[0_32px_90px_rgba(0,0,0,0.62)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
                  {selectedRange.difficulty} Mission
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-stone-100">
                  {selectedLevel.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCaseDetailsOpen(false)}
                className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-300 transition hover:border-stone-500 hover:text-stone-100"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-3 rounded-xl border border-stone-800 bg-stone-900 p-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-stone-500">Charge</p>
                <p className="mt-1 text-sm leading-6 text-stone-200">{selectedLevel.charge}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-stone-500">Evidence</p>
                <p className="mt-1 text-sm leading-6 text-stone-300">{selectedLevel.evidence}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-stone-500">
                  Complication
                </p>
                <p className="mt-1 text-sm leading-6 text-stone-300">
                  {selectedLevel.complication}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-stone-500">
                  Difficulty
                </p>
                <p className="mt-1 text-sm leading-6 text-stone-300">{selectedRange.challenge}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
