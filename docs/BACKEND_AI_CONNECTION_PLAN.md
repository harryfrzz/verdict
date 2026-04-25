# Backend AI Connection Plan

**Last Updated:** 2026-04-25
**Purpose:** reference plan for building the backend AI agent connection after the product pivot

## Context

The current backend still reflects the deprecated five-agent, open-ended prompt model. The updated product docs define a different target:

- one human player
- one AI lawyer
- one AI judge
- case-file grounded gameplay
- server-side orchestration that pauses for player turns

This plan translates that updated direction into a concrete backend build sequence.

## Current Gap

The existing backend shape is still centered around:

- free-text question submission
- plea selection
- old agent IDs such as `arbiter`, `accuse`, `advocate`, `chronicle`, and `ethos`
- server routes that assume the older courtroom simulation

The new backend must instead support:

- authored case files
- structured level config
- turn-based session control
- player wait states
- lawyer and judge specific model calls
- verdict scoring and feedback
- later voice transcription and realtime audio bootstrap

## Plan

### 1. Replace The Backend Domain Model

Create or refactor shared types for:

- `CaseFile`
- `SessionState`
- `Turn`
- `Role`
- `Phase`
- `ObjectionRecord`
- `VerdictResult`
- level config types

Retire the old `question`, `plea`, and five-agent assumptions from the shared model.

### 2. Add Authored Case-File Loading

Create a `casefiles/` directory and a loader/validator layer under `src/lib/casefiles/`.

The backend should resolve `caseId` to a validated case file before any session starts.

### 3. Add Structured Difficulty Config

Create `config/levels.ts` with per-level settings such as:

- model
- provider
- temperature
- reasoning notes
- output budget
- objection aggressiveness
- retrieval flag
- lawyer voice profile
- judge voice profile

Difficulty logic should live in config, not be buried inside prompt text.

### 4. Rebuild Session Creation

Change `POST /api/session` to accept:

- `caseId`
- `role`

It should return:

- `sessionId`
- resolved case file
- role mapping
- initial transcript seed
- current phase
- `awaitingPlayerInput`

This replaces the current free-text question and plea contract.

### 5. Split AI Responsibilities By Action

Refactor `POST /api/agent` to use action-based handling instead of old `agentId` routing.

Suggested actions:

- `lawyer_turn`
- `judge_ruling`
- `final_verdict`
- optionally `session_advance`

The request payload should be based on session state and requested action.

### 6. Build A Real Server-Side Orchestrator

Add `src/lib/session/` to own:

- next-speaker resolution
- phase transitions
- player wait state
- objection routing
- transcript updates
- verdict package assembly

The orchestrator should be the only layer that decides whether the court can advance.

### 7. Redesign Prompts For Two Reasoning Roles

Replace the old five-prompt system with:

- `lawyerSystemPrompt`
- `judgeSystemPrompt`
- deterministic clerk text

Prompts should accept injected case-file context and transcript state.

### 8. Tighten Context Injection

For lawyer calls, send only:

- role mapping
- case summary
- charges
- objectives
- evidence
- relevant witness statements
- transcript so far
- current phase
- level config

For judge calls, send only:

- full case file
- full transcript
- objection log
- scoring rubric

Neither role should improvise facts outside the case file.

### 9. Keep SSE For Text Streaming

Retain the current SSE-style streaming approach for lawyer and judge text responses.

The transport is still valid. The required change is the orchestration contract and request shape.

### 10. Add Voice Endpoints After Text Orchestration Works

Implement:

- `POST /api/voice` for player audio transcription
- `POST /api/realtime` for lawyer and judge realtime session bootstrap

Voice should plug into the same session state rather than introducing a second control flow.

### 11. Add Scoring And Verdict Generation

Create `src/lib/scoring/` for:

- rubric definition
- evidence-use checks
- transcript evaluation helpers
- score aggregation
- verdict formatting

The judge call should produce both:

- structured category scores
- narrative verdict feedback

### 12. Add A Persistence Boundary

Start with in-memory session storage for speed, but wrap it behind a `SessionStore` interface so it can later move to Redis or Postgres without rewriting orchestration logic.

## Recommended Build Order

1. Shared types and level config
2. Case-file schema, sample cases, loader, and validation
3. New `POST /api/session`
4. Session orchestrator in `src/lib/session/`
5. Lawyer and judge prompts
6. Refactored `POST /api/agent` with SSE
7. Scoring and final verdict path
8. Voice transcription route
9. Realtime session bootstrap

## Target Backend API

### `POST /api/session`

Input:

- `caseId`
- `role`

Output:

- initial `SessionState`

### `POST /api/session/:id/player-turn`

Input:

- player text or approved transcript

Output:

- updated session state
- trigger point for the next AI turn

### `POST /api/agent`

Input:

- `sessionId`
- `action`

Output:

- streamed lawyer or judge turn
- or non-streamed verdict payload

### `POST /api/voice`

Input:

- audio payload

Output:

- transcript text

### `POST /api/realtime`

Input:

- `sessionId`
- `speaker` as `lawyer` or `judge`

Output:

- realtime bootstrap config

## Main Risks

- Keeping the old agent-centric schema too long will slow every downstream change.
- Embedding difficulty behavior only in prompts will make tuning fragile.
- Mixing voice transport work into orchestration too early will duplicate state logic.
- Failing to enforce case-file grounding will break the game design.

## Practical Next Step

Phase 1 should replace the shared types and rebuild the session contract first. That gives the rest of the backend a stable shape before prompt, scoring, and voice work begin.
