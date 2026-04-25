# Architecture Document — Verdict

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** 2025-04-25

---

## 1. System Overview

Verdict is a single-page web application with no persistent database. The frontend is built with Vite + React, and all AI agent calls are made through a lightweight server-side API service (to protect API keys). Session state lives entirely in memory on the client for the duration of a session.

```
Browser (React SPA via Vite)
    ↕ HTTP / SSE streaming
API Service (server-side, thin)
    ↕ HTTP
LLM Provider (OpenAI / Anthropic / configurable)
```

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Vite + React | Fast SPA development, simple client bundle, framework-light |
| Styling | Tailwind CSS | Utility-first, fast iteration |
| Animations | Framer Motion | Character pose transitions, verdict reveal |
| State | Zustand | Lightweight, no boilerplate |
| Backend API | Node.js + Express | Thin server for session init and SSE agent streaming |
| LLM calls | Provider-agnostic fetch | Swap between OpenAI / Anthropic via env var |
| Streaming | Server-Sent Events (SSE) | Native browser support, no websocket overhead |
| Deployment | Static frontend + Node host | Deploy client and API separately or behind one domain |

---

## 3. Directory Structure

```
verdict/
├── src/
│   ├── main.tsx                  # Vite entrypoint
│   ├── App.tsx                   # App shell + route mounting
│   ├── pages/
│   │   ├── DocketPage.tsx        # Docket screen (case entry)
│   │   ├── PleaPage.tsx          # Plea selection before court opens
│   │   ├── SessionPage.tsx       # Courtroom live session screen
│   │   └── VerdictPage.tsx       # Verdict reveal + scoring screen
│   ├── components/
│   │   ├── courtroom/
│   │   │   ├── Scene.tsx         # Full courtroom background + character layout
│   │   │   ├── CharacterFigure.tsx
│   │   │   ├── Nameplate.tsx
│   │   │   └── GlowHalo.tsx
│   │   ├── transcript/
│   │   │   ├── TranscriptFeed.tsx
│   │   │   ├── TranscriptEntry.tsx
│   │   │   ├── ClerkAnnouncement.tsx
│   │   │   └── StreamingText.tsx
│   │   ├── ui/
│   │   │   ├── TensionMeter.tsx
│   │   │   ├── CaseFileDrawer.tsx
│   │   │   ├── PhaseIndicator.tsx
│   │   │   └── ScalesOfJustice.tsx
│   │   └── verdict/
│   │       ├── VerdictCard.tsx
│   │       └── ScoringPanel.tsx
│   └── lib/
│       ├── agents/
│       │   ├── prompts.ts        # All 5 agent system prompts
│       │   ├── orchestrator.ts   # Turn sequencing logic
│       │   └── types.ts          # Agent, Turn, Phase, Plea, Score types
│       ├── session/
│       │   ├── store.ts          # Zustand session state
│       │   └── caseFile.ts       # Shared context object builder
│       └── llm/
│           └── stream.ts         # SSE stream parser
├── server/
│   ├── index.ts                  # Express server bootstrap
│   ├── routes/
│   │   ├── session.ts            # Session initialisation
│   │   └── agent.ts              # Single agent turn — streams response
│   └── llm/
│       └── client.ts             # Provider-agnostic LLM caller
├── assets/
│   └── characters/               # SVG/PNG character illustrations per pose
│       ├── arbiter-idle.svg
│       ├── arbiter-speaking.svg
│       ├── accuse-idle.svg
│       ├── accuse-speaking.svg
│       └── ...
└── public/
    └── courtroom-bg.svg          # Courtroom scene illustration
```

---

## 4. Agent System

### 4.1 Agent Definition

Each agent is defined as a static object in `src/lib/agents/prompts.ts`:

```typescript
interface Agent {
  id: AgentId               // 'arbiter' | 'accuse' | 'advocate' | 'chronicle' | 'ethos'
  role: string              // Display role label
  systemPrompt: string      // Full locked system prompt
  color: string             // Role color hex for UI
  speakingPhases: Phase[]   // Which phases this agent may speak in
}
```

### 4.2 Shared Context — The Case File

Every agent call receives the same case file object appended to their context:

```typescript
interface CaseFile {
  question: string          // Original user question
  category: string          // Auto-detected topic category
  plea: Plea               // User-selected plea for accused posture
  transcript: Turn[]        // All prior turns in order
  phase: Phase              // Current courtroom phase
  round: number             // Turn number within phase
}
```

The transcript is the agent memory. Every agent sees every prior statement before generating their own. This is what makes cross-examination coherent — ADVOCATE can reference what CHRONICLE said because it's in the transcript they receive.

### 4.3 Turn Object

```typescript
interface Turn {
  agentId: AgentId
  phase: Phase
  turnNumber: number
  content: string           // Full text of the statement
  timestamp: number
  type: 'statement' | 'clerk'
}
```

### 4.4 Phase Sequence

```typescript
type Phase =
  | 'plea'              // User selects guilty / not guilty before court opens
  | 'opening'           // ACCUSE → ADVOCATE
  | 'examination'       // Direct examination of witnesses (2 turns each)
  | 'cross'             // Cross-examination by opposing counsel (2 turns each)
  | 'closing'           // ACCUSE → ADVOCATE closing arguments
  | 'deliberation'      // ARBITER only
  | 'verdict'           // ARBITER delivers ruling
```

The orchestrator in `src/lib/agents/orchestrator.ts` holds the turn queue and advances the phase automatically after each turn completes.

---

## 5. API Endpoints

### POST /api/session

Initialises a new session. Validates the question, assigns a session ID, returns initial case file.

**Request:**
```json
{ "question": "Was Oppenheimer morally responsible for Hiroshima?" }
```

**Response:**
```json
{
  "sessionId": "uuid",
  "category": "Ethics · History",
  "plea": "not_guilty",
  "caseFile": { ... }
}
```

### POST /api/agent

Triggers a single agent turn. Live courtroom turns stream token-by-token via SSE. ARBITER deliberation uses the same route in non-streaming mode and returns the full deliberation payload at once.

**Request:**
```json
{
  "sessionId": "uuid",
  "agentId": "accuse",
  "phase": "opening",
  "caseFile": { ... }
}
```

**Streaming response:** `text/event-stream`  
Each event: `data: {"token": "The", "done": false}`  
Final event: `data: {"token": "", "done": true, "fullContent": "..."}`

**Deliberation response:** standard JSON with the full content returned in one payload

## 6. State Management

All session state lives in a single Zustand store (`src/lib/session/store.ts`):

```typescript
interface SessionStore {
  // Session identity
  sessionId: string | null
  question: string
  category: string
  plea: Plea | null

  // Courtroom state
  phase: Phase
  turnNumber: number
  activeSpeaker: AgentId | null
  accusedPosture: 'guilty' | 'not_guilty'
  transcript: Turn[]
  caseFile: CaseFile

  // UI state
  isStreaming: boolean
  streamingAgentId: AgentId | null
  streamingBuffer: string
  tensionLevel: number      // 0-100, drives TensionMeter

  // Verdict
  verdict: VerdictResult | null
  scores: AgentScore[]

  // Actions
  addTurn: (turn: Turn) => void
  setActiveSpeaker: (id: AgentId | null) => void
  setPlea: (plea: Plea) => void
  appendStreamToken: (token: string) => void
  advancePhase: () => void
  setVerdict: (result: VerdictResult) => void
}
```

---

## 7. Streaming Implementation

The frontend calls the backend `/api/agent` endpoint and reads the SSE stream using the native `EventSource` API or `fetch` with `ReadableStream` for all live courtroom turns. Tokens are appended to `streamingBuffer` in the store on each event. `StreamingText.tsx` renders the buffer with a word-by-word fade-in animation (80ms per word).

On stream completion (`done: true`), the full turn is committed to `transcript`, `streamingBuffer` is cleared, and the orchestrator advances to the next speaker.

ARBITER deliberation is the exception: it runs as a single non-streamed server call and is shown in the UI as a short "thinking" state before the verdict reveal begins.

---

## 8. LLM Provider Abstraction

`server/llm/client.ts` exposes a single function:

```typescript
async function* streamAgentTurn(
  systemPrompt: string,
  messages: Message[],
  config: LLMConfig
): AsyncGenerator<string>
```

`LLMConfig` is populated from environment variables:

```
LLM_PROVIDER=openai         # or 'anthropic'
LLM_MODEL=gpt-4o            # or 'claude-opus-4-6'
LLM_API_KEY=sk-...
LLM_MAX_TOKENS=600
LLM_TEMPERATURE=0.8
```

Switching providers requires only changing env vars — no code changes. Both OpenAI and Anthropic streaming formats are handled inside the client.

---

## 9. Character Figure System

Character figures are SVG assets with two states per speaking character: `idle` and `speaking`. `CharacterFigure.tsx` switches between them based on `activeSpeaker` from the store. Framer Motion handles the cross-fade between poses (200ms ease-out). The glow halo is a separate absolutely-positioned element animated with a pulsing opacity loop while the character is speaking.

The accused is a non-speaking figure with at least two posture variants tied to the plea screen selection: `guilty` and `not_guilty`. That posture persists through the courtroom session and is used again during the verdict reveal.

---

## 10. Environment Variables

```
LLM_PROVIDER=               # 'openai' | 'anthropic'
LLM_MODEL=                  # Model string for chosen provider
LLM_API_KEY=                # API key — never exposed to client
LLM_MAX_TOKENS=600          # Max tokens per agent turn
LLM_TEMPERATURE=0.8         # Controls argument creativity

VITE_API_BASE_URL=          # Backend base URL for client requests
VITE_APP_URL=               # For share card URL generation
```

---

## 11. Deployment

```bash
# Install
npm install

# Development
npm run dev

# Build
npm run build

# Start API server
npm run server
```

Deploy the Vite frontend as static assets and the Node API as a lightweight server process. They can live on separate hosts or behind a single reverse proxy so the client can call `/api/*` on the same origin.
