import { useEffect, useMemo, useState } from 'react'
import { Home } from 'lucide-react'
import CharacterSetup, { type SetupCharacter } from './components/roleplay/CharacterSetup'
import CourtTurn from './components/roleplay/CourtTurn'
import LandingPage, { type CaseDifficultyRange, type CaseLevel } from './components/roleplay/LandingPage'
import sessionData from './data/courtSession.json'

type AgentId = 'accuse' | 'advocate' | 'chronicle' | 'ethos'

interface RoleConfig {
  name: string
  title: string
  imageSrc: string
  side: 'left' | 'right'
  accentClass: string
}

interface SessionTurn {
  id: string
  agentId: AgentId
  phase: string
  text: string
  delayMs: number
}

const roleMap: Record<AgentId, RoleConfig> = {
  accuse: {
    name: 'ACCUSE',
    title: 'Prosecution',
    imageSrc: '/lawyer_1.png',
    side: 'right',
    accentClass: 'bg-red-400',
  },
  advocate: {
    name: 'ADVOCATE',
    title: 'Defense',
    imageSrc: '/lawyer_2.png',
    side: 'left',
    accentClass: 'bg-violet-400',
  },
  chronicle: {
    name: 'CHRONICLE',
    title: 'Witness I',
    imageSrc: '/witness_1_chronicle.png',
    side: 'right',
    accentClass: 'bg-sky-400',
  },
  ethos: {
    name: 'ETHOS',
    title: 'Witness II',
    imageSrc: '/witness_2_ethos.png',
    side: 'left',
    accentClass: 'bg-emerald-400',
  },
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

const caseLevels: CaseLevel[] = [
  {
    id: 'missing-ledger',
    level: 1,
    title: 'The Missing Ledger',
    category: 'Theft',
    thumbnailSrc: '/missing_ledger.png',
    summary:
      'A clerk is accused of stealing courthouse funds after a ledger page disappears before audit.',
    charge: 'A courthouse clerk is accused of stealing funds from an internal ledger.',
    evidence:
      'The prosecution relies on access records, missing paperwork, and the timing of the vanished ledger entry.',
    complication:
      'The storage cabinet was old, key access was loosely controlled, and the office workflow was poorly documented.',
    ranges: [
      {
        difficulty: 'Easy',
        challenge: 'A relatively direct fact pattern with limited ambiguity and fewer competing explanations.',
        template:
          'A courthouse clerk is accused of stealing petty funds after a ledger page disappears before audit. The evidence turns on access, motive, and whether the cabinet was secure.',
      },
      {
        difficulty: 'Medium',
        challenge: 'Adds conflicting access histories, supervisor involvement, and more room for reasonable doubt.',
        template:
          'A courthouse clerk is accused of coordinated embezzlement from filing fees. Missing ledger pages align with deposits they handled, but a supervisor also had override access.',
      },
      {
        difficulty: 'Difficult',
        challenge: 'Introduces audit-log disputes, shared credentials, and a harder causation trail to argue through.',
        template:
          'A courthouse clerk is accused of destroying financial records to conceal larger fraud. Audit logs point to their terminal, but login sharing was common in the office.',
      },
    ],
  },
  {
    id: 'warehouse-fire',
    level: 2,
    title: 'The Warehouse Fire',
    category: 'Arson',
    thumbnailSrc: '/warehouse_fire.png',
    summary:
      'A business owner is charged after a failing warehouse burns down days before an insurance deadline.',
    charge: 'A business owner is accused of orchestrating a warehouse fire for financial gain.',
    evidence:
      'The case turns on insurance timing, surveillance gaps, and testimony about the owner’s recent conduct.',
    complication:
      'The building also had electrical faults and multiple people with access knew the site and alarm routines.',
    ranges: [
      {
        difficulty: 'Easy',
        challenge: 'The motive trail is clear and the fact pattern is mostly linear.',
        template:
          'A business owner is charged with insurance-motivated arson after a failing warehouse burns down. Coverage was increased shortly before the fire, but electrical faults were documented.',
      },
      {
        difficulty: 'Medium',
        challenge: 'The timeline gets murkier and an alternate suspect has credible motive and access.',
        template:
          'A business owner is charged with arson after a warehouse burns down days before an insurance deadline. Security footage is incomplete and a former employee had threatened revenge.',
      },
      {
        difficulty: 'Difficult',
        challenge: 'This version relies on ambiguous messages and competing inferences from circumstantial evidence.',
        template:
          'A business owner is accused of conspiring to burn a warehouse and falsify insurance claims. Messages mention removing inventory, but may refer to a planned renovation.',
      },
    ],
  },
  {
    id: 'algorithmic-crash',
    level: 3,
    title: 'The Algorithmic Crash',
    category: 'Corporate negligence',
    thumbnailSrc: '/algorithmic_crash.png',
    summary:
      'A transport AI caused a fatal crash after executives allegedly ignored safety warnings.',
    charge: 'Executives are accused of criminal negligence after deploying unsafe transport AI.',
    evidence:
      'Internal testing, launch approvals, and known braking failures form the backbone of the prosecution case.',
    complication:
      'Responsibility is split across executives, engineers, regulators, and outside sensor dependencies.',
    ranges: [
      {
        difficulty: 'Easy',
        challenge: 'The warning signs are visible and the defense has fewer technical escape routes.',
        template:
          'A transport AI caused a fatal crash after internal tests showed braking failures. Executives launched after engineers said a patch had resolved the issue.',
      },
      {
        difficulty: 'Medium',
        challenge: 'Regulatory compliance and incomplete reproduction of the bug make negligence less straightforward.',
        template:
          'A transport AI caused a fatal crash after executives received unresolved safety warnings. The case turns on recklessness, regulatory compliance, and foreseeability.',
      },
      {
        difficulty: 'Difficult',
        challenge: 'This version forces both sides to argue around third-party dependencies and diluted accountability.',
        template:
          'A transport AI caused a fatal crash after a risk report predicted the same crash pattern under rare conditions. The defense argues third-party sensor data caused the failure.',
      },
    ],
  },
  {
    id: 'state-secret',
    level: 4,
    title: 'The State Secret',
    category: 'Espionage',
    thumbnailSrc: '/state_secret.png',
    summary:
      'A scientist leaked classified research, claiming the public had a right to know about hidden risks.',
    charge: 'A scientist is accused of illegal disclosure of classified national-security research.',
    evidence:
      'The prosecution relies on the scientist’s admissions, document tracing, and downstream exposure of classified material.',
    complication:
      'The defense argues public-interest necessity and disputes whether downstream foreign access should be attributed to the scientist.',
    ranges: [
      {
        difficulty: 'Easy',
        challenge: 'The admission is clear, but the public-interest defense still creates a moral gray area.',
        template:
          'A scientist admits leaking classified research to a journalist. The defense argues the leak exposed a concealed safety risk the public had a right to know.',
      },
      {
        difficulty: 'Medium',
        challenge: 'The link between initial disclosure and foreign access becomes harder to assign cleanly.',
        template:
          'A scientist is accused of espionage after leaked classified research reached foreign analysts. The scientist claims they only disclosed the material to a domestic journalist.',
      },
      {
        difficulty: 'Difficult',
        challenge: 'This version adds ambiguous encrypted coordination evidence and a sharper dispute over intent.',
        template:
          'A scientist is accused of intentionally compromising national-security research. Encrypted messages suggest coordination before the leak, but may be privileged strategy notes.',
      },
    ],
  },
]

function App() {
  const turns = sessionData.turns as SessionTurn[]
  const [courtOpen, setCourtOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const [casePrompt, setCasePrompt] = useState('')
  const [userTurnInput, setUserTurnInput] = useState('')
  const [userTurnResponses, setUserTurnResponses] = useState<Record<string, string>>({})
  const [selectedLevel, setSelectedLevel] = useState<CaseLevel | null>(null)
  const [selectedRange, setSelectedRange] = useState<CaseDifficultyRange | null>(null)
  const [caseDetailsOpen, setCaseDetailsOpen] = useState(false)
  const [userSide, setUserSide] = useState<'accuse' | 'advocate'>('advocate')

  const replayLevel = () => {
    setActiveIndex(-1)
    setUserTurnInput('')
    setUserTurnResponses({})
    setCourtOpen(false)
    window.setTimeout(() => setCourtOpen(true), 30)
  }

  const resetCourt = () => {
    setCourtOpen(false)
    setActiveIndex(-1)
    setCasePrompt('')
    setUserTurnInput('')
    setUserTurnResponses({})
    setSelectedLevel(null)
    setSelectedRange(null)
    setCaseDetailsOpen(false)
    setUserSide('advocate')
  }

  useEffect(() => {
    if (!courtOpen) {
      setActiveIndex(-1)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setActiveIndex(0)
    }, 700)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [courtOpen, turns])

  useEffect(() => {
    if (!courtOpen || activeIndex < 0) {
      return
    }

    const activeTurnForTimer = turns[activeIndex]
    const isUserTurnForTimer = activeTurnForTimer.agentId === userSide

    if (isUserTurnForTimer || activeIndex >= turns.length - 1) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setActiveIndex((currentIndex) => Math.min(currentIndex + 1, turns.length - 1))
    }, activeTurnForTimer.delayMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [activeIndex, courtOpen, turns, userSide])

  const visibleTurns = useMemo(() => {
    if (activeIndex < 0) {
      return []
    }

    return turns.slice(0, activeIndex + 1).map((turn) => ({
      ...turn,
      text: userTurnResponses[turn.id] ?? turn.text,
    }))
  }, [activeIndex, turns, userTurnResponses])

  const activeTurn = activeIndex >= 0 ? turns[activeIndex] : null
  const activeTurnText = activeTurn ? userTurnResponses[activeTurn.id] ?? activeTurn.text : ''
  const isUserTurn = activeTurn?.agentId === userSide
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
          <div className="group absolute left-[50.1%] top-[44.5%] z-[2] -translate-x-1/2 -translate-y-1/2">
            <img
              className="relative h-[min(9vh,28rem)] w-auto object-contain drop-shadow-[0_22px_28px_rgba(0,0,0,0.46)] transition duration-300 group-hover:scale-105"
              src="/judge.png"
              alt="Judge"
            />
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
          {activeTurn ? (
            <CourtTurn
              key={activeTurn.id}
              name={roleMap[activeTurn.agentId].name}
              title={roleMap[activeTurn.agentId].title}
              imageSrc={roleMap[activeTurn.agentId].imageSrc}
              side={roleMap[activeTurn.agentId].side}
              text={activeTurnText}
              accentClass={roleMap[activeTurn.agentId].accentClass}
              isUserTurn={isUserTurn}
              userInput={userTurnInput}
              onUserInputChange={setUserTurnInput}
              onUserSubmit={() => {
                const response = userTurnInput.trim()

                if (!response) {
                  return
                }

                setUserTurnResponses((responses) => ({
                  ...responses,
                  [activeTurn.id]: response,
                }))
                setUserTurnInput('')
                setActiveIndex((currentIndex) => Math.min(currentIndex + 1, turns.length - 1))
              }}
            />
          ) : !courtOpen && selectedLevel ? (
            <div className="relative w-full">
              <div className="absolute left-0 top-4 z-30 flex max-w-2xl items-stretch gap-3">
                <button
                  type="button"
                  aria-label="Go home"
                  onClick={resetCourt}
                  className="flex h-16 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-100/20 bg-stone-950/82 text-stone-100 shadow-[0_18px_48px_rgba(0,0,0,0.42)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-amber-100/45 hover:bg-stone-900/90 hover:text-amber-100"
                >
                  <Home className="h-6 w-6" aria-hidden="true" />
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
                  setActiveIndex(-1)
                  setUserTurnInput('')
                  setUserTurnResponses({})
                  setCourtOpen(false)
                  window.setTimeout(() => setCourtOpen(true), 30)
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
                      value={casePrompt}
                      className="block h-8 w-full whitespace-nowrap rounded-xl border-transparent bg-stone-900/70 px-3 text-sm text-stone-100 outline-none transition focus:ring-amber-100/35"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  className="h-16 shrink-0 rounded-2xl border border-amber-50/45 bg-gradient-to-r from-amber-100 to-orange-200 px-6 text-sm font-bold text-stone-950 shadow-[0_18px_48px_rgba(251,191,36,0.24)] transition hover:-translate-y-0.5 hover:from-amber-50 hover:to-orange-100 active:scale-[0.98]"
                >
                  Begin Mission
                </button>
              </form>
              <CharacterSetup
                characters={setupCharacters}
                userSide={userSide}
                onUserSideChange={setUserSide}
              />
            </div>
          ) : !courtOpen ? (
            <LandingPage
              levels={caseLevels}
              onPlay={(level, range) => {
                setSelectedLevel(level)
                setSelectedRange(range)
                setCasePrompt(range.template)
              }}
            />
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
                    {selectedRange?.difficulty ?? 'Case'} Mission
                  </p>
                  <p className="truncate text-sm font-semibold text-stone-100">
                    {selectedLevel?.title ?? 'Simulated Conversation'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault()
                      resetCourt()
                    }}
                    className="rounded-md border border-red-400/50 bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-red-300 hover:bg-red-500"
                  >
                    Court adjourned
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault()
                      replayLevel()
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
                      style={{ width: `${(visibleTurns.length / turns.length) * 100}%` }}
                    />
                  </span>
                  <span className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-stone-300">
                    {visibleTurns.length}/{turns.length}
                  </span>
                  <svg
                    className="h-4 w-4 shrink-0 text-stone-300 transition-transform duration-200 group-open:rotate-180"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </summary>

              <div className="mt-3 max-h-[42vh] space-y-3 overflow-y-auto pb-2">
                {visibleTurns.length > 0 ? (
                  visibleTurns.map((turn, index) => {
                    const role = roleMap[turn.agentId]

                    return (
                      <article
                        key={turn.id}
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
                        <p className="mt-2 text-sm leading-6 text-stone-300">{turn.text}</p>
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
