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
    difficulty: 'Easy' | 'Medium' | 'Hard'
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

const thumbnailByCaseId: Record<string, string> = {
  'missing-ledger': '/missing_ledger.png',
  'warehouse-fire': '/warehouse_fire.png',
  'algorithmic-crash': '/algorithmic_crash.png',
  'state-secret': '/state_secret.png',
}

const difficultyRangesByLevel: Record<number, ApiCaseCard['ranges']> = {
  1: [
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
      difficulty: 'Hard',
      challenge: 'Introduces audit-log disputes, shared credentials, and a harder causation trail to argue through.',
      template:
        'A courthouse clerk is accused of destroying financial records to conceal larger fraud. Audit logs point to their terminal, but login sharing was common in the office.',
    },
  ],
  2: [
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
      difficulty: 'Hard',
      challenge: 'This version relies on ambiguous messages and competing inferences from circumstantial evidence.',
      template:
        'A business owner is accused of conspiring to burn a warehouse and falsify insurance claims. Messages mention removing inventory, but may refer to a planned renovation.',
    },
  ],
  3: [
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
      difficulty: 'Hard',
      challenge: 'This version forces both sides to argue around third-party dependencies and diluted accountability.',
      template:
        'A transport AI caused a fatal crash after a risk report predicted the same crash pattern under rare conditions. The defense argues third-party sensor data caused the failure.',
    },
  ],
  4: [
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
      difficulty: 'Hard',
      challenge: 'This version adds ambiguous encrypted coordination evidence and a sharper dispute over intent.',
      template:
        'A scientist is accused of intentionally compromising national-security research. Encrypted messages suggest coordination before the leak, but may be privileged strategy notes.',
    },
  ],
}

function mapCase(caseFile: ApiCaseLevel): ApiCaseCard {
  return {
    id: caseFile.id,
    level: caseFile.level,
    title: caseFile.title,
    category: caseFile.category,
    thumbnailSrc: thumbnailByCaseId[caseFile.id] ?? '/missing_ledger.png',
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

export async function streamFinalVerdict(
  sessionId: string,
  onToken?: (partialContent: string) => void,
  onAudioChunk?: (base64Chunk: string) => void,
): Promise<ApiSession> {
  const response = await fetch(`${API_BASE_URL}/api/agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, action: 'final_verdict' }),
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
      onToken?.(streamed)
    }
    if (event.audio) {
      onAudioChunk?.(event.audio)
    }
    if (event.done) {
      if (event.error) throw new Error(event.error)
      const payload = event as typeof event & { session?: ApiSession }
      finalSession = payload.session ?? null
      break
    }
  }

  if (!finalSession) {
    throw new Error('Verdict stream completed without a final session payload.')
  }

  return finalSession
}

export async function transcribeAudio(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  const base64 = btoa(binary)

  const response = await fetch(`${API_BASE_URL}/api/speech/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio: base64, mimeType: blob.type }),
  })

  const data = await readJson<{ text: string }>(response)
  return data.text
}

export async function streamLawyerTurn(
  sessionId: string,
  onToken: (partialContent: string) => void,
  onAudioChunk?: (base64Chunk: string) => void,
): Promise<ApiSession> {
  const response = await fetch(`${API_BASE_URL}/api/agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    if (event.audio) {
      onAudioChunk?.(event.audio)
    }
    if (event.done) {
      if (event.error) throw new Error(event.error)
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
