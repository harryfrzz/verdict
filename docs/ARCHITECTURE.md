# Architecture Document — Verdict

**Version:** 2.0
**Status:** Draft
**Last Updated:** 2026-04-25

## 1. System Overview

Verdict is a single-page web application with a server-side orchestration layer for AI turns, scoring, and voice transcription. The core architectural change is that the orchestrator no longer auto-generates every turn. It must manage an alternating human/AI session loop and pause for player submissions.

```text
Browser (React SPA via Vite)
    ↕ HTTP / SSE streaming / audio upload
API Service (server-side orchestration)
    ↕ HTTP
LLM Provider(s)
```

## 2. Core Architectural Shift

### Old Direction

- one user prompt
- five AI agents
- orchestrator auto-advanced the full courtroom

### New Direction

- authored case files instead of open-ended prompts
- one human player, one AI lawyer, one AI judge
- AI witnesses generated from case data when called
- orchestrator streams AI turns but waits for player input every other turn

This is the key product architecture change. The runtime is no longer a self-playing simulation. It is a turn-based game loop with explicit player action.

## 3. Recommended Repo Structure

```text
verdict/
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── AGENT_PROMPTS.md
│   ├── AGENTS.md
│   └── IMPLEMENTATION_PLAN.md
├── casefiles/
│   ├── level-1/
│   ├── level-2/
│   ├── level-3/
│   ├── level-4/
│   └── level-5/
├── config/
│   └── levels.ts
├── src/
│   ├── components/
│   ├── lib/
│   │   ├── agents/
│   │   ├── casefiles/
│   │   ├── scoring/
│   │   └── session/
│   └── ...
└── server/
    ├── routes/
    │   ├── session.ts
    │   ├── agent.ts
    │   └── voice.ts
    └── llm/
```

## 4. Core Domain Models

### 4.1 Case File Schema

```typescript
interface CaseFile {
  id: string
  title: string
  level: 1 | 2 | 3 | 4 | 5
  category: string
  summary: string
  date: string
  location: string
  charges: string[]
  policeReport: string
  witnesses: Witness[]
  evidence: Evidence[]
  prosecutionObjective: string
  defenseObjective: string
  priorRulings?: PriorRuling[]
  difficulty: DifficultyConfig
}
```

Supporting types:

```typescript
interface Witness {
  id: string
  name: string
  relationToCase: string
  statement: string
  reliabilityNotes?: string
}

interface Evidence {
  id: string
  item: string
  description: string
  whereFound: string
  relevance: string
}

interface PriorRuling {
  title: string
  citation?: string
  relevance: string
}

interface DifficultyConfig {
  level: 1 | 2 | 3 | 4 | 5
  model: string
  temperature: number
  reasoningNotes: string
}
```

### 4.2 Session State

```typescript
type Role = 'prosecution' | 'defense'

type Phase =
  | 'case_selection'
  | 'case_study'
  | 'role_selection'
  | 'opening'
  | 'witness_examination'
  | 'objection'
  | 'closing'
  | 'deliberation'
  | 'verdict'

interface Turn {
  speaker: 'player' | 'lawyer' | 'judge' | 'witness' | 'clerk'
  speakerId?: string
  role?: Role
  phase: Phase
  content: string
  timestamp: number
  metadata?: Record<string, unknown>
}

interface SessionState {
  sessionId: string
  caseFile: CaseFile
  playerRole: Role
  aiRole: Role
  phase: Phase
  transcript: Turn[]
  awaitingPlayerInput: boolean
  activeWitnessId: string | null
  objections: ObjectionRecord[]
}
```

## 5. Orchestration Model

### 5.1 Responsibilities

The orchestrator should:

- load the selected case file
- apply the chosen role pairing
- determine who speaks next
- stream AI turns
- pause for player input
- route witness questions to the correct witness prompt
- route objections to the judge
- assemble the final deliberation package for scoring

### 5.2 Important Change

The orchestrator must not auto-play the player side. It must wait for a submitted text argument or a voice transcript before advancing the session.

### 5.3 Trigger Model

- AI turn: server-triggered and streamed
- Player turn: client-submitted and then committed to transcript
- Witness turn: AI-generated only when a witness is being questioned
- Judge ruling: AI-generated on objection or final verdict

## 6. Case File Injection Rules

Every AI call should receive only the context needed for that role.

### 6.1 AI Lawyer Receives

- full case summary
- date, location, charges
- prosecution and defense objectives
- evidence list
- relevant witness statements
- transcript so far
- player role
- current phase
- level difficulty config

### 6.2 Witness Receives

- witness identity
- witness statement
- directly relevant evidence
- narrow transcript slice if needed
- current question
- instruction to remain consistent with the authored statement

### 6.3 Judge Receives

- full case file
- full transcript
- all objections and rulings
- scoring rubric
- player role and AI role

## 7. Levels Configuration

Difficulty should live in a structured config file, for example `config/levels.ts`.

Suggested fields:

- level
- label
- model
- provider
- temperature
- reasoning mode notes
- output budget
- objection aggressiveness
- witness consistency strictness
- retrieval enabled flag

This avoids baking difficulty logic directly into prompts.

## 8. API Surface

### POST `/api/session`

Creates a session from:

- selected case ID
- selected role

Returns:

- session ID
- resolved case file
- role mapping
- initial session state

### POST `/api/agent`

Triggers:

- AI lawyer turns
- witness turns
- judge rulings
- final verdict generation

Streaming remains appropriate for live courtroom turns. Final deliberation may be non-streamed or streamed depending on UX.

### POST `/api/voice`

Accepts player audio and returns:

- transcript text
- optional confidence data
- optional segment timing metadata

The client should let the player review or edit this text before submission into the court transcript.

## 9. Scoring Engine

Add `src/lib/scoring/` for verdict evaluation support.

Responsibilities:

- rubric definition
- transcript parsing
- evidence-usage matching
- objection handling assessment
- category scoring for player and AI lawyer
- aggregate score calculation
- post-verdict feedback formatting

The scoring engine can be hybrid:

- deterministic helpers for transcript and evidence checks
- model-assisted judgment for rhetorical quality and logical consistency

## 10. Streaming And Input Model

The streaming architecture stays. What changes is the trigger pattern.

Old:

- orchestrator advanced automatically after every AI turn

New:

- orchestrator streams AI turns
- UI waits for player submission on player turns
- player submission can originate from text input or voice transcript

This preserves the existing server streaming approach while changing the courtroom control flow.

## 11. Safety And Consistency Constraints

- Do not send irrelevant witness context to a witness prompt.
- Do not let witnesses invent facts outside their authored statements unless explicitly allowed by case design.
- Do not let the judge coach the player mid-session.
- Do not let the AI lawyer ignore the selected difficulty profile.
- Do not store API keys or provider secrets in client code.
