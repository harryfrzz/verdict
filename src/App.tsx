import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import CharacterSetup, { type SetupCharacter } from './components/roleplay/CharacterSetup'
import CourtTurn from './components/roleplay/CourtTurn'
import LandingPage, { type CaseDifficultyRange, type CaseLevel } from './components/roleplay/LandingPage'
import type { ApiSession } from './lib/session/api'
import {
  createBackendSession,
  listBackendCases,
  requestFinalVerdict,
  streamLawyerTurn,
  submitPlayerTurn as submitPlayerTurnRequest,
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

function buildRoleMap(session: ApiSession | null, userSide: UserSide): Record<'player' | 'lawyer' | 'judge' | 'clerk', DisplayRole> {
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
  const [userSide, setUserSide] = useState<UserSide>('advocate')
  const [session, setSession] = useState<ApiSession | null>(null)
  const [streamingLawyerText, setStreamingLawyerText] = useState('')
  const [pendingJudgeText, setPendingJudgeText] = useState<string | null>(null)
  const [userTurnInput, setUserTurnInput] = useState('')
  const [playerTurnUnlocked, setPlayerTurnUnlocked] = useState(false)
  const [isWorking, setIsWorking] = useState(false)
  const [judgeControlsOpen, setJudgeControlsOpen] = useState(false)
  const judgeControlsRef = useRef<HTMLDivElement | null>(null)

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

    try {
      const updatedSession = await streamLawyerTurn(sessionId, setStreamingLawyerText)
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
        setPendingJudgeText('The judge is reviewing the record and preparing a verdict...')
        const verdictSession = await requestFinalVerdict(updatedSession.sessionId)
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
    setPendingJudgeText('The judge is reviewing the record and preparing a verdict...')

    try {
      const verdictSession = await requestFinalVerdict(session.sessionId)
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

  function resetCourt() {
    setCourtOpen(false)
    setSession(null)
    setStreamingLawyerText('')
    setPendingJudgeText(null)
    setUserTurnInput('')
    setPlayerTurnUnlocked(false)
    setJudgeControlsOpen(false)
    setSelectedLevel(null)
    setSelectedRange(null)
    setLoadingError(null)
    setIsWorking(false)
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <img
        className="absolute inset-0 z-0 h-full w-full object-cover"
        src="/bg_courtroom.png"
        alt=""
      />
      <div className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(4,4,8,0.16)_0%,rgba(4,4,8,0.34)_52%,rgba(4,4,8,0.72)_100%)]" />
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
            {judgeControlsOpen ? (
              <div className="absolute left-1/2 top-full mt-2 flex w-max -translate-x-1/2 animate-verdict-float-in items-center gap-3 rounded-md border border-stone-700 bg-stone-950/96 px-3 py-2 shadow-[0_18px_42px_rgba(0,0,0,0.36)]">
                <button
                  type="button"
                  onClick={resetCourt}
                  className="rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm font-medium text-stone-100 transition hover:border-stone-500 hover:bg-stone-800 active:scale-[0.98]"
                >
                  Court adjourned
                </button>
              </div>
            ) : null}
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
                    : session?.awaitingPlayerInput && playerTurnUnlocked && session?.phase !== 'verdict'
                      ? 'Request Verdict'
                    : undefined
                }
                isBusy={isWorking}
              />
              {parsedVerdict ? (
                <section className="mx-auto mt-4 max-w-4xl animate-verdict-float-in rounded-xl border border-stone-700 bg-stone-950/96 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.32)]">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-amber-100/75">Verdict</p>
                  <h2 className="mt-2 text-2xl font-semibold text-stone-100">
                    {parsedVerdict.outcome ?? 'Verdict returned'}
                  </h2>
                  {parsedVerdict.summary ? (
                    <p className="mt-3 text-sm leading-6 text-stone-300">{parsedVerdict.summary}</p>
                  ) : null}
                  {parsedVerdict.reasoning ? (
                    <p className="mt-3 text-sm leading-6 text-stone-400">{parsedVerdict.reasoning}</p>
                  ) : null}
                </section>
              ) : null}
            </div>
          ) : !courtOpen && selectedLevel ? (
            <div className="relative w-full">
              {selectedRange ? (
                <div className="absolute left-0 top-4 z-20 rounded-md border border-stone-700 bg-stone-950/95 px-4 py-3 shadow-[0_18px_42px_rgba(0,0,0,0.32)]">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
                    Selected case
                  </p>
                  <p className="mt-1 text-sm font-semibold text-stone-100">
                    {selectedLevel.title} · {selectedRange.difficulty}
                  </p>
                </div>
              ) : null}
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
                    Live Backend Session
                  </p>
                </div>
                <span className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-stone-300">
                  {visibleTurns.length} turns
                </span>
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
      ) : selectedLevel ? (
        <div className="fixed inset-x-0 bottom-6 z-20 flex justify-center px-4">
          <form
            className="w-full max-w-3xl animate-verdict-float-in rounded-lg border border-stone-700 bg-stone-950/98 p-2 shadow-[0_18px_54px_rgba(0,0,0,0.48)]"
            onSubmit={(event) => {
              event.preventDefault()
              void openCourt()
            }}
          >
            <div className="flex items-center gap-2 rounded-md bg-stone-900 p-1.5">
              <div className="min-w-0 flex-1 rounded-md px-3 py-2.5 text-sm text-stone-200">
                {selectedRange?.template ?? selectedLevel.summary}
              </div>
              <button
                type="submit"
                disabled={isWorking}
                className="shrink-0 rounded-md bg-amber-200 px-4 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:bg-stone-400 active:scale-[0.98]"
              >
                {isWorking ? 'Opening...' : 'Open Court'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {loadingError && courtOpen ? (
        <div className="fixed right-4 top-4 z-40 rounded-md border border-red-900/70 bg-stone-950/96 px-4 py-3 text-sm text-red-200 shadow-[0_18px_42px_rgba(0,0,0,0.32)]">
          {loadingError}
        </div>
      ) : null}
    </div>
  )
}

export default App
