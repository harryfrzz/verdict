# Verdict — AI Coding Context

This file provides context for AI coding assistants working on this codebase. Read it fully before making any changes.

---

## What This Project Is

Verdict is a multi-agent courtroom simulation web app. A user submits a moral dilemma or policy question, chooses a plea on behalf of the accused, and then five AI agents — a judge, prosecution, defense, and two witnesses — argue the question in a structured courtroom session with real-time streaming output. The session ends with a formal verdict and dissenting opinion.

The project uses Vite + React on the frontend. All AI agent calls go through a lightweight server-side API layer. The frontend is a React SPA with Zustand state management and Framer Motion animations.

---

## Critical Rules — Read Before Touching Anything

**Never expose API keys to the client.** All LLM calls happen in the server API only. The client never calls the LLM provider directly.

**Never break agent character.** The system prompts in `src/lib/agents/prompts.ts` are carefully tuned. Do not modify them without understanding the downstream effect on argument quality and cross-examination coherence.

**The transcript is agent memory.** Every agent call receives the full transcript of all prior turns. Do not truncate or filter the transcript — this breaks cross-examination.

**The Clerk is not an LLM call.** `src/lib/agents/orchestrator.ts` generates Clerk announcements as static strings. Do not convert the Clerk into an agent call — it adds latency and is unnecessary.

**Streaming is SSE, not WebSockets.** The streaming architecture uses Server-Sent Events via `text/event-stream`. Do not refactor to WebSockets without a compelling reason.

**LLM provider is abstracted.** All LLM calls go through `server/llm/client.ts`. Never import an SDK (openai, @anthropic-ai/sdk) directly in a client component or outside of the server LLM layer. Provider is controlled by `LLM_PROVIDER` env var.

---

## Project Structure

```
src/
  main.tsx                  → Vite entrypoint
  App.tsx                   → App shell + route mounting
  pages/
    DocketPage.tsx          → Docket screen (case entry)
    PleaPage.tsx            → Plea selection before court opens
    SessionPage.tsx         → Live courtroom session
    VerdictPage.tsx         → Verdict reveal + scoring
  components/
    courtroom/              → Scene, CharacterFigure, Nameplate, GlowHalo
    transcript/             → TranscriptFeed, TranscriptEntry, ClerkAnnouncement, StreamingText
    ui/                     → TensionMeter, CaseFileDrawer, PhaseIndicator, ScalesOfJustice
    verdict/                → VerdictCard, ScoringPanel
  lib/
    agents/
      prompts.ts            → All 5 system prompts + Clerk announcement function
      orchestrator.ts       → Turn sequencing, phase advancement, queue management
      types.ts              → AgentId, Phase, Plea, Turn, CaseFile, VerdictResult, AgentScore
    session/
      store.ts              → Zustand store — single source of truth for session state
      caseFile.ts           → Builds the CaseFile object injected into every agent call
    llm/
      stream.ts             → SSE stream parser utilities

server/
  index.ts                  → API server bootstrap
  routes/
    session.ts              → Session init endpoint
    agent.ts                → Agent turn — SSE streaming
  llm/
    client.ts               → Provider-agnostic streaming LLM caller

assets/characters/          → SVG character illustrations (idle + speaking per agent)
public/courtroom-bg.svg     → Courtroom scene background illustration
```

---

## Key Types

```typescript
type AgentId = 'arbiter' | 'accuse' | 'advocate' | 'chronicle' | 'ethos'

type Phase =
  | 'plea'
  | 'opening'
  | 'examination'
  | 'cross'
  | 'closing'
  | 'deliberation'
  | 'verdict'

type Plea = 'guilty' | 'not_guilty'

interface Turn {
  agentId: AgentId
  phase: Phase
  turnNumber: number
  content: string
  timestamp: number
  type: 'statement' | 'clerk'
}

interface CaseFile {
  question: string
  category: string
  plea: Plea
  transcript: Turn[]
  phase: Phase
  round: number
}

interface VerdictResult {
  ruling: string
  reasoning: string
  dissent: string
  winningSide: 'prosecution' | 'defense' | 'split'
}
```

---

## Session Flow

```
1. User submits question on the Docket, then selects a plea on `PleaPage.tsx`
2. POST /api/session returns sessionId + caseFile
3. Orchestrator builds turn queue for 'opening' phase
4. For each streamed turn in queue:
   a. Set activeSpeaker in store
   b. POST /api/agent with {sessionId, agentId, phase, caseFile}
   c. Stream SSE tokens → append to streamingBuffer in store
   d. On stream complete → commit Turn to transcript, clear buffer
   e. Advance orchestrator to next turn
5. Opening statements stream normally
6. Witness examination and cross-examination run in fixed two-turn exchanges per side
7. After closing phase → trigger ARBITER deliberation turn as a non-streamed thinking step
8. Parse verdict response into VerdictResult
9. Navigate to /verdict screen
10. Reveal scoring panel
```

---

## Environment Variables

```bash
LLM_PROVIDER=openai           # 'openai' or 'anthropic'
LLM_MODEL=gpt-4o              # Model string for chosen provider
LLM_API_KEY=sk-...            # Server-side only — never NEXT_PUBLIC_
LLM_MAX_TOKENS=600            # Per agent turn
LLM_TEMPERATURE=0.8

VITE_API_BASE_URL=http://localhost:8787
VITE_APP_URL=http://localhost:5173
```

---

## Common Tasks

**Adding a new pre-loaded case:**
Add an entry to the `PRELOADED_CASES` array in `src/pages/DocketPage.tsx`. Fields: `id`, `question`, `category`.

**Changing plea behavior or accused posture:**
Edit the `Plea` type in `src/lib/agents/types.ts`, the plea screen in `src/pages/PleaPage.tsx`, and the accused pose mapping in `src/components/courtroom/CharacterFigure.tsx`.

**Changing agent turn length:**
Adjust `LLM_MAX_TOKENS` in env. Also update the "3–6 sentences" instruction in the relevant prompt in `src/lib/agents/prompts.ts`.

**Changing the turn order:**
Edit the `buildTurnQueue(phase)` function in `src/lib/agents/orchestrator.ts`. Each phase returns an ordered array of `AgentId`.

**Adding a new Clerk announcement:**
Add a key to the `ClerkEvent` union type in `src/lib/agents/types.ts`, then add the string in the `clerkAnnouncement()` function in `src/lib/agents/prompts.ts`.

**Swapping LLM provider:**
Change `LLM_PROVIDER` and `LLM_MODEL` env vars. Both OpenAI and Anthropic streaming are handled in `server/llm/client.ts` — no code changes needed.

**Adding a new character pose:**
Add `{agentId}-{pose}.svg` to `assets/characters/`. Update the pose map in `src/components/courtroom/CharacterFigure.tsx`.

---

## What Not To Do

- Do not add useEffect chains for streaming — use the store's `appendStreamToken` action
- Do not call LLM APIs from any file outside `server/` or the dedicated server LLM layer
- Do not store session data in a database for v1 — memory only
- Do not add a loading spinner between normal agent turns — the streaming itself is the loading state
- Do not add rounded corners to buttons in the main UI — the design system uses sharp corners throughout
- Do not modify the verdict response parsing without updating the `VerdictResult` type

---

## Design System Notes

The visual identity is dark courtroom drama with 2D illustrated character figures. Key decisions:

- Background: near-black `#0D0D0F`
- Prosecution accent: burgundy `#8B1A2F`
- Defense accent: steel blue `#1A3A5C`
- Judge accent: amber `#C9A96E`
- Text on dark: parchment `#F5F0E8` (primary), warm off-white `#D4CEBF` (transcript body)
- Serif font (Playfair Display or Cormorant Garamond) for verdict text and case titles
- Mono font for agent names in transcript
- No rounded pill buttons — this is not a consumer app
- No bright colors or gamified elements outside the post-verdict scoring panel

Character figures live in `assets/characters/` as SVGs. Each speaking agent has an `idle` and `speaking` variant. The accused should also have at least `guilty` and `not_guilty` posture variants selected from the plea screen. `CharacterFigure.tsx` handles the Framer Motion crossfade between poses.
