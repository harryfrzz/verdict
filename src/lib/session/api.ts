import { readSSEStream } from '../llm/stream.js'

type ApiRole = 'prosecution' | 'defense'
type ApiSpeaker = 'player' | 'lawyer' | 'judge' | 'clerk'
type ApiPhase =
  | 'case_selection'
  | 'case_study'
  | 'role_selection'
  | 'charges'
  | 'opening'
  | 'argument'
  | 'objection'
  | 'closing'
  | 'deliberation'
  | 'verdict'

export interface ApiTurn {
  speaker: ApiSpeaker
  speakerId?: string
  role?: ApiRole
  phase: ApiPhase
  content: string
  timestamp: number
  metadata?: Record<string, unknown>
}

export interface ApiObjection {
  id: string
  phase: ApiPhase
  raisedBy: ApiRole
  targetTurnIndex: number
  type: string
  rationale: string
  outcome?: 'sustained' | 'overruled' | 'reserved'
  ruling?: string
  timestamp: number
}

export interface ApiCaseLevel {
  id: string
  title: string
  level: number
  category: string
  summary: string
  preview: {
    summary: string
    charge: string
    evidence: string
    complication: string
  }
}

export interface ApiCaseCard {
  id: string
  level: number
  title: string
  category: string
  thumbnailSrc: string
  summary: string
  charge: string
  evidence: string
  complication: string
  ranges: Array<{
    difficulty: 'Easy' | 'Medium' | 'Difficult'
    challenge: string
    template: string
  }>
}

export interface ApiSession {
  sessionId: string
  caseId: string
  playerRole: ApiRole
  aiRole: ApiRole
  phase: ApiPhase
  transcript: ApiTurn[]
  objections: ApiObjection[]
  awaitingPlayerInput: boolean
  nextSpeaker: ApiSpeaker
  playerTurnsTaken: number
  lawyerTurnsTaken: number
  maxTurnsPerSide: number
  createdAt: number
  updatedAt: number
}

function resolveApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:8787'
  }

  return window.location.hostname === 'localhost'
    ? 'http://localhost:8787'
    : `${window.location.origin}`
}

const API_BASE_URL = resolveApiBaseUrl()

const difficultyRangesByLevel: Record<number, ApiCaseCard['ranges']> = {
  1: [
    {
      difficulty: 'Easy',
      challenge: 'A relatively direct fact pattern with limited ambiguity and fewer competing explanations.',
      template: 'Opening statement focused on the strongest direct reading of the evidence.',
    },
  ],
  2: [
    {
      difficulty: 'Easy',
      challenge: 'A more contested theory with a viable alternate explanation to address.',
      template: 'Opening statement focused on the strongest grounded reading of the fire evidence.',
    },
  ],
  3: [
    {
      difficulty: 'Easy',
      challenge: 'A higher-complexity case with more technical pressure on both sides.',
      template: 'Opening statement focused on the strongest grounded theory of negligence.',
    },
  ],
  4: [
    {
      difficulty: 'Easy',
      challenge: 'A high-pressure case with major ambiguity around intent and public interest.',
      template: 'Opening statement focused on the strongest grounded theory of disclosure or misconduct.',
    },
  ],
  5: [
    {
      difficulty: 'Easy',
      challenge: 'An aspirational challenge case with layered reasoning demands.',
      template: 'Opening statement focused on the strongest grounded theory available.',
    },
  ],
}

function mapCase(caseFile: ApiCaseLevel): ApiCaseCard {
  return {
    id: caseFile.id,
    level: caseFile.level,
    title: caseFile.title,
    category: caseFile.category,
    thumbnailSrc: caseFile.id === 'warehouse-fire' ? '/lawyer_1.png' : '/witness_1_chronicle.png',
    summary: caseFile.preview.summary,
    charge: caseFile.preview.charge,
    evidence: caseFile.preview.evidence,
    complication: caseFile.preview.complication,
    ranges: difficultyRangesByLevel[caseFile.level] ?? difficultyRangesByLevel[1],
  }
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    const errorMessage = typeof errorBody.error === 'string'
      ? errorBody.error
      : `Request failed with status ${response.status}.`
    throw new Error(errorMessage)
  }

  return response.json() as Promise<T>
}

export async function listBackendCases(): Promise<ApiCaseCard[]> {
  const response = await fetch(`${API_BASE_URL}/api/session/cases`)
  const payload = await readJson<{ cases: ApiCaseLevel[] }>(response)
  return payload.cases.map(mapCase)
}

export async function createBackendSession(caseId: string, role: ApiRole): Promise<ApiSession> {
  const response = await fetch(`${API_BASE_URL}/api/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ caseId, role }),
  })

  return readJson<ApiSession>(response)
}

export async function submitPlayerTurn(sessionId: string, content: string): Promise<ApiSession> {
  const response = await fetch(`${API_BASE_URL}/api/session/${sessionId}/player-turn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  })

  return readJson<ApiSession>(response)
}

export async function requestFinalVerdict(sessionId: string): Promise<ApiSession> {
  const response = await fetch(`${API_BASE_URL}/api/agent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId, action: 'final_verdict' }),
  })

  const payload = await readJson<{ session: ApiSession }>(response)
  return payload.session
}

export async function streamLawyerTurn(
  sessionId: string,
  onToken: (partialContent: string) => void,
): Promise<ApiSession> {
  const response = await fetch(`${API_BASE_URL}/api/agent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId, action: 'lawyer_turn' }),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    const errorMessage = typeof errorBody.error === 'string'
      ? errorBody.error
      : `Request failed with status ${response.status}.`
    throw new Error(errorMessage)
  }

  let streamed = ''
  let finalSession: ApiSession | null = null

  for await (const event of readSSEStream(response)) {
    if (event.token) {
      streamed += event.token
      onToken(streamed)
    }

    if (event.done) {
      if (event.error) {
        throw new Error(event.error)
      }

      const payload = event as typeof event & { session?: ApiSession }
      finalSession = payload.session ?? null
      break
    }
  }

  if (!finalSession) {
    throw new Error('Lawyer stream completed without a final session payload.')
  }

  return finalSession
}
