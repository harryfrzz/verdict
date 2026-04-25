import { useMemo, useRef, useState } from 'react'
import Scene from './components/courtroom/Scene'
import CharacterSetup, { type SetupCharacter } from './components/roleplay/CharacterSetup'
import TranscriptFeed from './components/transcript/TranscriptFeed'
import PhaseIndicator from './components/ui/PhaseIndicator'
import TensionMeter from './components/ui/TensionMeter'
import { readSSEStream } from './lib/llm/stream'
import { clerkAnnouncement } from './lib/agents/prompts'
import type {
  AgentId,
  AgentRole,
  CaseFile,
  ClerkEvent as ClerkEventType,
  Phase,
  Plea,
  TranscriptTurn,
  Turn,
} from './lib/agents/types'

type FlowStep =
  | { kind: 'clerk'; event: ClerkEventType; phase: Phase }
  | { kind: 'agent'; agentId: AgentId; phase: Phase }

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'

const roles: AgentRole[] = [
  {
    id: 'accuse',
    name: 'ACCUSE',
    title: 'Prosecution',
    imageSrc: '/lawyer_1.png',
    alignment: 'right',
    accentClass: 'bg-red-400',
  },
  {
    id: 'advocate',
    name: 'ADVOCATE',
    title: 'Defense',
    imageSrc: '/lawyer_2.png',
    alignment: 'left',
    accentClass: 'bg-violet-400',
  },
  {
    id: 'chronicle',
    name: 'CHRONICLE',
    title: 'Witness I',
    imageSrc: '/witness_1_chronicle.png',
    alignment: 'right',
    accentClass: 'bg-sky-400',
  },
  {
    id: 'ethos',
    name: 'ETHOS',
    title: 'Witness II',
    imageSrc: '/witness_2_ethos.png',
    alignment: 'left',
    accentClass: 'bg-emerald-400',
  },
]

const flow: FlowStep[] = [
  { kind: 'clerk', event: 'session_open', phase: 'opening' },
  { kind: 'clerk', event: 'opening_accuse', phase: 'opening' },
  { kind: 'agent', agentId: 'accuse', phase: 'opening' },
  { kind: 'clerk', event: 'opening_advocate', phase: 'opening' },
  { kind: 'agent', agentId: 'advocate', phase: 'opening' },
  { kind: 'clerk', event: 'call_chronicle', phase: 'examination' },
  { kind: 'agent', agentId: 'chronicle', phase: 'examination' },
  { kind: 'clerk', event: 'cross_advocate', phase: 'cross' },
  { kind: 'agent', agentId: 'advocate', phase: 'cross' },
  { kind: 'clerk', event: 'witness_dismissed', phase: 'cross' },
  { kind: 'clerk', event: 'call_ethos', phase: 'examination' },
  { kind: 'agent', agentId: 'ethos', phase: 'examination' },
  { kind: 'clerk', event: 'cross_accuse', phase: 'cross' },
  { kind: 'agent', agentId: 'accuse', phase: 'cross' },
  { kind: 'clerk', event: 'witness_dismissed', phase: 'cross' },
  { kind: 'clerk', event: 'closing_accuse', phase: 'closing' },
  { kind: 'agent', agentId: 'accuse', phase: 'closing' },
  { kind: 'clerk', event: 'closing_advocate', phase: 'closing' },
  { kind: 'agent', agentId: 'advocate', phase: 'closing' },
  { kind: 'clerk', event: 'deliberation_begin', phase: 'deliberation' },
  { kind: 'clerk', event: 'verdict_begin', phase: 'verdict' },
  { kind: 'agent', agentId: 'arbiter', phase: 'verdict' },
]

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

function buildTurn(
  partial: Omit<Turn, 'timestamp' | 'turnNumber'>,
  turnNumber: number
): Turn {
  return {
    ...partial,
    turnNumber,
    timestamp: Date.now(),
  }
}

function getBenchLine(activeAgentId: AgentId | null, activeLine: string, status: string) {
  if (activeAgentId === 'arbiter') {
    return 'ARBITER is delivering the ruling.'
  }
  if (activeAgentId) {
    return activeLine || 'Witness and counsel statements are streaming into the court record.'
  }
  if (status === 'complete') {
    return 'Proceedings complete. The court record is closed.'
  }
  return 'Submit a case question and open the court to begin the proceeding.'
}

function App() {
  const runIdRef = useRef(0)
  const [question, setQuestion] = useState(
    'Was the launch of a high-risk AI system justified despite known public-risk concerns?'
  )
  const [plea, setPlea] = useState<Plea>('not_guilty')
  const [status, setStatus] = useState<'idle' | 'starting' | 'running' | 'complete' | 'error'>(
    'idle'
  )
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [category, setCategory] = useState('')
  const [caseFile, setCaseFile] = useState<CaseFile | null>(null)
  const [turns, setTurns] = useState<TranscriptTurn[]>([])
  const [activeAgentId, setActiveAgentId] = useState<AgentId | null>(null)
  const [activeLine, setActiveLine] = useState('')
  const [modelAssignments, setModelAssignments] = useState<Record<string, string>>(
    defaultModelAssignments,
  )

  const currentPhase = caseFile?.phase ?? 'opening'
  const statementCount = turns.filter((turn) => turn.type === 'statement').length
  const tension = useMemo(() => {
    const phaseBoost: Record<Phase, number> = {
      plea: 0,
      opening: 20,
      examination: 48,
      cross: 72,
      closing: 88,
      deliberation: 94,
      verdict: 100,
    }

    const progressBoost = Math.min(18, Math.round((statementCount / 7) * 18))
    return Math.min(100, phaseBoost[currentPhase] + progressBoost)
  }, [currentPhase, statementCount])

  async function startCourt() {
    const nextRunId = runIdRef.current + 1
    runIdRef.current = nextRunId

    setStatus('starting')
    setError(null)
    setSessionId(null)
    setCategory('')
    setCaseFile(null)
    setTurns([])
    setActiveAgentId(null)
    setActiveLine('')

    try {
      const sessionResponse = await fetch(`${API_BASE_URL}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, plea, modelAssignments }),
      })

      const sessionPayload = (await sessionResponse.json()) as
        | { error: string }
        | { sessionId: string; category: string; caseFile: CaseFile }

      if (!sessionResponse.ok) {
        throw new Error(
          'error' in sessionPayload ? sessionPayload.error : 'Failed to create session.'
        )
      }

      if ('error' in sessionPayload) {
        throw new Error(sessionPayload.error)
      }

      if (runIdRef.current !== nextRunId) {
        return
      }

      setStatus('running')
      setSessionId(sessionPayload.sessionId)
      setCategory(sessionPayload.category)

      let workingCaseFile = sessionPayload.caseFile
      setCaseFile(workingCaseFile)

      const commitCaseFile = (nextCaseFile: CaseFile) => {
        workingCaseFile = nextCaseFile
        setCaseFile(nextCaseFile)
        setTurns(nextCaseFile.transcript)
      }

      const pushTurn = (turn: Turn) => {
        const nextCaseFile = {
          ...workingCaseFile,
          transcript: [...workingCaseFile.transcript, turn],
        }
        commitCaseFile(nextCaseFile)
      }

      const updateLatestTurn = (content: string) => {
        const transcript = [...workingCaseFile.transcript]
        const lastTurn = transcript.at(-1)
        if (!lastTurn) {
          return
        }

        transcript[transcript.length - 1] = {
          ...lastTurn,
          content,
        }

        commitCaseFile({ ...workingCaseFile, transcript })
      }

      for (const step of flow) {
        if (runIdRef.current !== nextRunId) {
          return
        }

        commitCaseFile({ ...workingCaseFile, phase: step.phase })

        if (step.kind === 'clerk') {
          const line = clerkAnnouncement(step.event)
          setActiveAgentId(null)
          setActiveLine(line)
          pushTurn(
            buildTurn(
              {
                agentId: 'clerk',
                phase: step.phase,
                content: line,
                type: 'clerk',
              },
              workingCaseFile.transcript.length + 1
            ),
          )
          await new Promise((resolve) => window.setTimeout(resolve, 450))
          continue
        }

        setActiveAgentId(step.agentId)
        setActiveLine('')

        if (step.agentId === 'arbiter') {
          const verdictResponse = await fetch(`${API_BASE_URL}/api/agent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: sessionPayload.sessionId,
              agentId: step.agentId,
              caseFile: workingCaseFile,
              modelAssignments,
            }),
          })

          const verdictPayload = (await verdictResponse.json()) as {
            content?: string
            error?: string
          }

          if (!verdictResponse.ok || verdictPayload.error || !verdictPayload.content) {
            throw new Error(verdictPayload.error || 'ARBITER call failed.')
          }

          const verdictText = verdictPayload.content.trim()
          setActiveLine(verdictText)
          pushTurn(
            buildTurn(
              {
                agentId: 'arbiter',
                phase: step.phase,
                content: verdictText,
                type: 'statement',
              },
              workingCaseFile.transcript.length + 1
            ),
          )
          continue
        }

        pushTurn(
          buildTurn(
            {
              agentId: step.agentId,
              phase: step.phase,
              content: '',
              type: 'statement',
            },
            workingCaseFile.transcript.length + 1
          ),
        )

        const response = await fetch(`${API_BASE_URL}/api/agent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionPayload.sessionId,
            agentId: step.agentId,
            caseFile: workingCaseFile,
            modelAssignments,
          }),
        })

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string }
          throw new Error(payload.error || `Failed to stream ${step.agentId}.`)
        }

        let fullContent = ''
        for await (const event of readSSEStream(response)) {
          if (runIdRef.current !== nextRunId) {
            return
          }

          if (event.error) {
            throw new Error(event.error)
          }

          fullContent = event.fullContent ?? `${fullContent}${event.token}`
          setActiveLine(fullContent)
          updateLatestTurn(fullContent)
        }
      }

      if (runIdRef.current === nextRunId) {
        setStatus('complete')
        setActiveAgentId(null)
      }
    } catch (err) {
      if (runIdRef.current !== nextRunId) {
        return
      }

      setStatus('error')
      setActiveAgentId(null)
      setError(err instanceof Error ? err.message : 'Court session failed.')
    }
  }

  const showSetup = status === 'idle' && turns.length === 0

  return (
    <div className="relative min-h-screen overflow-hidden">
      <img
        className="absolute inset-0 z-0 h-full w-full object-cover"
        src="/bg_courtroom.png"
        alt=""
      />
      <div className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(5,5,8,0.2)_0%,rgba(5,5,8,0.5)_55%,rgba(5,5,8,0.82)_100%)]" />

      <div className="relative z-10 mx-auto min-h-screen w-full max-w-[1520px] px-4 py-5 sm:px-6">
        <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
          <aside className="space-y-4">
            <section className="rounded-md border border-white/10 bg-black/50 p-4 backdrop-blur-md">
              <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">Case Intake</p>
              <h1 className="mt-1 text-2xl font-semibold text-stone-100">Verdict</h1>
              <p className="mt-2 text-sm leading-6 text-stone-300">
                Open a live courtroom session with counsel, witnesses, and a final ruling.
              </p>

              <label className="mt-4 block text-[11px] uppercase tracking-[0.16em] text-stone-400">
                Case Question
              </label>
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={7}
                className="mt-2 w-full rounded-md border border-white/10 bg-black/45 px-3 py-3 text-sm leading-6 text-stone-100 outline-none transition focus:border-amber-200/35"
              />

              <div className="mt-4 grid grid-cols-2 gap-2">
                {(['not_guilty', 'guilty'] as Plea[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPlea(value)}
                    className={`rounded-md border px-3 py-3 text-sm font-medium capitalize transition ${
                      plea === value
                        ? 'border-amber-200/35 bg-amber-100/12 text-amber-50'
                        : 'border-white/10 bg-white/[0.03] text-stone-300'
                    }`}
                  >
                    {value.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  void startCourt()
                }}
                disabled={status === 'starting' || status === 'running'}
                className="mt-4 w-full rounded-md border border-amber-200/28 bg-amber-200/12 px-4 py-3 text-sm font-semibold text-amber-50 transition hover:bg-amber-200/18 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === 'idle' || status === 'error' ? 'Open Court' : 'Restart Proceeding'}
              </button>

              {error ? (
                <p className="mt-3 rounded-md border border-red-400/18 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                  {error}
                </p>
              ) : null}
            </section>

            <PhaseIndicator currentPhase={currentPhase} />
            <TensionMeter value={tension} />

            <section className="rounded-md border border-white/10 bg-black/50 p-4 backdrop-blur-md">
              <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">Session</p>
              <div className="mt-3 space-y-3 text-sm text-stone-300">
                <p>
                  <span className="text-stone-500">Status</span>
                  <br />
                  <span className="font-medium capitalize text-stone-100">{status}</span>
                </p>
                <p>
                  <span className="text-stone-500">Category</span>
                  <br />
                  <span className="font-medium text-stone-100">{category || 'Pending intake'}</span>
                </p>
                <p>
                  <span className="text-stone-500">Session ID</span>
                  <br />
                  <span className="font-medium text-stone-100">{sessionId ?? 'Not started'}</span>
                </p>
              </div>
            </section>
          </aside>

          <main className="rounded-md border border-white/10 bg-black/28 backdrop-blur-sm">
            {showSetup ? (
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
            ) : (
              <Scene
                roles={roles}
                activeAgentId={activeAgentId === 'arbiter' ? null : activeAgentId}
                activeLine={activeLine}
                benchLine={getBenchLine(activeAgentId, activeLine, status)}
              />
            )}
          </main>

          <aside>
            {turns.length > 0 ? (
              <TranscriptFeed roles={roles} turns={turns} />
            ) : (
              <section className="rounded-md border border-dashed border-white/10 bg-black/40 p-6 text-sm leading-6 text-stone-400 backdrop-blur-sm">
                The transcript will populate once the clerk opens the session and each turn is streamed into the record.
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

export default App
