import { useEffect, useMemo, useState } from 'react'
import CharacterSetup, { type SetupCharacter } from './components/roleplay/CharacterSetup'
import CourtTurn from './components/roleplay/CourtTurn'
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
  {
    id: 'chronicle',
    name: 'CHRONICLE',
    title: 'Witness I',
    imageSrc: '/witness_1_chronicle.png',
    accentClass: 'bg-sky-400',
  },
  {
    id: 'ethos',
    name: 'ETHOS',
    title: 'Witness II',
    imageSrc: '/witness_2_ethos.png',
    accentClass: 'bg-emerald-400',
  },
]

const modelOptions = ['gpt-4.1-mini', 'gpt-4.1', 'gpt-5-mini', 'gpt-5']

const defaultModelAssignments = Object.fromEntries(
  setupCharacters.map((character) => [character.id, modelOptions[0]]),
)

function App() {
  const turns = sessionData.turns as SessionTurn[]
  const [courtOpen, setCourtOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const [casePrompt, setCasePrompt] = useState('')
  const [modelAssignments, setModelAssignments] = useState<Record<string, string>>(
    defaultModelAssignments,
  )

  useEffect(() => {
    if (!courtOpen) {
      setActiveIndex(-1)
      return
    }

    let cancelled = false
    let timeoutId: number | undefined

    const playTurn = (index: number) => {
      if (cancelled) {
        return
      }

      setActiveIndex(index)

      if (index >= turns.length - 1) {
        return
      }

      timeoutId = window.setTimeout(() => {
        playTurn(index + 1)
      }, turns[index].delayMs)
    }

    timeoutId = window.setTimeout(() => {
      playTurn(0)
    }, 700)

    return () => {
      cancelled = true
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [courtOpen, turns])

  const visibleTurns = useMemo(() => {
    if (activeIndex < 0) {
      return []
    }

    return turns.slice(0, activeIndex + 1)
  }, [activeIndex, turns])

  const activeTurn = activeIndex >= 0 ? turns[activeIndex] : null
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
        {courtOpen ? (
          <div className="absolute right-4 top-4 z-30 sm:right-6">
            <button
              type="button"
              onClick={() => {
                setCourtOpen(false)
                window.setTimeout(() => setCourtOpen(true), 30)
              }}
              className="rounded-md border border-amber-200/28 bg-black/64 px-4 py-2 text-sm font-medium text-amber-50 backdrop-blur-sm transition hover:bg-black/76"
            >
              Replay Court
            </button>
          </div>
        ) : null}

        <main className="flex flex-1 items-center">
          {activeTurn ? (
            <CourtTurn
              name={roleMap[activeTurn.agentId].name}
              title={roleMap[activeTurn.agentId].title}
              imageSrc={roleMap[activeTurn.agentId].imageSrc}
              side={roleMap[activeTurn.agentId].side}
              text={activeTurn.text}
              accentClass={roleMap[activeTurn.agentId].accentClass}
            />
          ) : !courtOpen ? (
            <CharacterSetup
              characters={setupCharacters}
              modelAssignments={modelAssignments}
              modelOptions={modelOptions}
              onModelChange={(characterId, model) => {
                setModelAssignments((currentAssignments) => ({
                  ...currentAssignments,
                  [characterId]: model,
                }))
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
                    Transcript
                  </p>
                  <p className="truncate text-sm font-semibold text-stone-100">
                    Simulated Conversation
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-stone-800 sm:block">
                    <span
                      className="block h-full rounded-full bg-amber-200 transition-all duration-300"
                      style={{ width: `${(visibleTurns.length / turns.length) * 100}%` }}
                    />
                  </span>
                  <span className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-stone-300">
                    {visibleTurns.length}/{turns.length}
                  </span>
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
      ) : (
        <div className="fixed inset-x-0 bottom-6 z-20 flex justify-center px-4">
          <form
            className="w-full max-w-3xl animate-verdict-float-in rounded-lg border border-stone-700 bg-stone-950/98 p-2 shadow-[0_18px_54px_rgba(0,0,0,0.48)]"
            onSubmit={(event) => {
              event.preventDefault()
              setCourtOpen(false)
              window.setTimeout(() => setCourtOpen(true), 30)
            }}
          >
            <div className="flex items-center gap-2 rounded-md bg-stone-900 p-1.5">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Crime case</span>
                <input
                  value={casePrompt}
                  onChange={(event) => setCasePrompt(event.target.value)}
                  required
                  placeholder="Type the crime case to be tried..."
                  className="block w-full rounded-md border border-transparent bg-transparent px-3 py-2.5 text-sm text-stone-100 outline-none transition placeholder:text-stone-500 focus:border-stone-600"
                />
              </label>
              <button
                type="submit"
                className="shrink-0 rounded-md bg-amber-200 px-4 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-amber-100 active:scale-[0.98]"
              >
                Open Court
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default App
