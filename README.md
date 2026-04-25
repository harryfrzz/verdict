# Verdict

Verdict is a courtroom debate game. The player is not a spectator anymore. They choose a side, study a structured case file, argue in court against an AI lawyer, and receive a win/loss verdict from an AI judge based on how well they used the evidence.

This document now serves as the repo's product brief, architecture note, agent guide, and implementation plan.

## Product Direction

The old concept was a multi-agent courtroom simulation where the user mostly watched AI agents argue. The new concept is a competitive courtroom roleplay loop with real stakes and replay value.

### Core Shift

| Before | After |
| --- | --- |
| 5 AI agents, user watches | 1 AI lawyer + 1 AI judge + human player |
| Open-ended moral questions | Preset case files with structured evidence |
| Low agency | Win/loss outcome based on user performance |
| AI delivers arguments as passive influence | User must argue, rebut, and earn the result |
| Low replay value | Level system, difficulty tiers, stronger opponents |

### Product Promise

Verdict should feel like a courtroom strategy game and speaking exercise:

- entertainment through adversarial courtroom play
- skill-building through argumentation, evidence use, and rebuttal
- high replayability through levels, cases, roles, and post-verdict feedback

## PRD

### Main Loop

1. Player selects a level.
2. Player browses available cases at that difficulty.
3. Player studies the case file before court opens.
4. Player chooses a role: `Prosecution` or `Defense`.
5. Court opens and the clerk reads the charges.
6. Court proceeds as alternating turns between the player and the AI lawyer.
7. Witnesses are examined and cross-examined.
8. Objections may be raised and ruled on by the judge.
9. Both sides deliver closing arguments.
10. The judge evaluates the transcript against the case file.
11. Player receives verdict, score breakdown, and feedback.
12. Player retries, advances, or switches cases.

### Primary Entities

The old 5-agent model is deprecated for product design purposes. The target interaction model is:

- `Human Player`
  Role selected by the player. Must argue either prosecution or defense.
- `AI Lawyer`
  Opposing counsel. Aggressive, adversarial, evidence-aware.
- `AI Judge`
  Silent through most of the session except rulings and final verdict.

Optional supporting runtime entities:

- `AI Witness`
  Generated from the case file. Must remain consistent with the written statement and known evidence.
- `Clerk`
  System narration only, not a reasoning entity.

### Features

#### Role Selection

The player chooses `Prosecution` or `Defense`. This changes:

- which objective they must prove
- which witnesses they question directly
- what the AI lawyer argues against them
- which weaknesses the judge expects them to address

This is not cosmetic. It changes the game state and evaluation criteria.

#### Case File System

Verdict no longer starts from arbitrary user prompts. It starts from curated case files containing structured evidence and courtroom context.

Each case should include:

- case summary
- date and location
- charges
- police or incident report
- 2-3 witness statements
- physical evidence list
- relevant prior rulings or precedents
- prosecution objective
- defense objective
- difficulty configuration

#### Levels And Difficulty

| Level | Case Style | Opponent Model | Opponent Behaviour |
| --- | --- | --- | --- |
| 1 - Rookie | Clear evidence, open-and-shut | weaker model | obvious attacks, easy counters |
| 2 - Junior | Some ambiguity, one strong weakness | mid-tier model | finds gaps in weak arguments |
| 3 - Senior | Conflicting statements, higher complexity | strong model | anticipates and pressures weak logic |
| 4 - Partner | Minimal evidence, high ambiguity | best available model | punishes weak reasoning quickly |
| 5 - Legend | Landmark or historically layered cases | best model + retrieval | near-unbeatable aspirational challenge |

Difficulty should affect both:

- case complexity
- model quality and reasoning strategy

#### Voice Input

The player should be able to respond by:

- typed text
- microphone input, transcribed to text

Voice is important because it makes the experience feel performative rather than purely mechanical.

#### Win/Loss And Feedback

The judge should evaluate both sides on:

- argument strength
- use of case-file evidence
- logical consistency
- response quality under pressure
- handling of objections

The player wins if their aggregate score beats the AI lawyer's score.

The verdict should return:

- win/loss outcome
- score breakdown by category
- strongest successful arguments
- missed evidence or weak reasoning
- what the opponent exploited

## Target Session Structure

The target court flow is:

1. Level select
2. Case browser
3. Case study screen
4. Role select
5. Charges read by clerk
6. Opening statements
7. Witness examination and cross-examination
8. Objection handling
9. Closing arguments
10. Deliberation
11. Verdict
12. Post-verdict actions

The transcript should alternate between:

- AI lawyer turn
- player turn
- witness turn when relevant
- judge ruling when needed

The orchestrator should no longer auto-play the entire court without waiting for the user.

## Architecture

### Repo Direction

The repo should evolve toward these additions:

- `casefiles/`
  JSON case files grouped by level and category
- `config/levels.ts` or `levels/`
  Difficulty-to-model mapping and reasoning presets
- `server/routes/voice.ts`
  Audio upload or transcription endpoint
- `src/lib/scoring/`
  Score calculation, rubric helpers, verdict formatting
- `src/lib/casefiles/`
  Case file loaders, validation, and selection helpers
- `src/lib/session/`
  Turn orchestration and player-turn state management

### Case File Injection

Every AI call must receive the relevant case context.

- AI lawyer receives:
  full case summary, charges, objectives, evidence, relevant witness statements, transcript so far, and player role
- AI witness receives:
  only the relevant witness statement, witness identity, directly relevant evidence, transcript slice if needed, and current question
- AI judge receives:
  full case file, full transcript, objections, and scoring rubric

### Levels Configuration

Difficulty should not be embedded ad hoc inside prompts. It should live in structured configuration:

- model string
- provider
- temperature
- reasoning mode notes
- max output budget
- objection aggressiveness
- witness consistency strictness

### Scoring Engine

Add `lib/scoring/` for deterministic and model-assisted scoring support.

Target responsibilities:

- rubric definition
- per-category scoring
- transcript evidence matching
- final aggregate score computation
- feedback generation for player and AI

## Agent Prompts

The old five-prompt system is no longer the product target. The target prompt set is:

### 1. Opposing Lawyer

Input:

- player role
- full case file
- relevant objectives
- transcript so far
- current phase

Prompt goals:

- argue the opposite side forcefully
- exploit weaknesses in the player's reasoning
- cite evidence directly from the case file
- avoid generic moralizing
- adapt difficulty to level config

### 2. Judge

Input:

- full case file
- full transcript
- objections and rulings
- scoring rubric

Prompt goals:

- rule impartially
- avoid coaching during play
- score both sides at the end
- produce verdict, score breakdown, and feedback

### 3. Witness

Input:

- witness identity
- written statement
- relevant evidence
- current question

Prompt goals:

- remain consistent with the case file
- answer only what was asked
- do not invent unrelated facts
- preserve witness personality and reliability profile if defined

## Orchestrator Rules

This section replaces what would otherwise live in `AGENTS.md`.

### Critical Rules

- The orchestrator must wait for player input on every player turn.
- The orchestrator must not auto-generate player arguments.
- Every agent call must receive the relevant case file sections.
- Witness responses must stay consistent with the written statement.
- Judge rulings must be brief during play and detailed only at verdict time.
- Difficulty config must affect both the AI lawyer behaviour and the case complexity.
- The transcript is the source of truth for turn order and scoring.

### Player Turn Handling

Player turns should support:

- text submission
- voice submission
- transcript insertion before the next AI response

The system should not advance to the next AI turn until the player submission is stored.

### Voice Handling Rules

- audio is transcribed server-side through `/api/voice`
- transcript text is shown to the player before being finalized when possible
- corrected transcript becomes the committed turn
- committed transcript is what gets passed into the next AI call

## Implementation Plan

### Hour 3 And Beyond

The old "auto-running session loop" plan is no longer the right milestone. The new implementation plan should prioritize:

1. Introduce structured case files and loaders.
2. Add level configuration and difficulty mapping.
3. Replace free-form prompt intake with case-browser and case-study flows.
4. Replace full auto-play orchestration with turn-based player input orchestration.
5. Add text player turns.
6. Add voice transcription route and mic-driven turn submission.
7. Add witness consistency prompt and witness turn handling.
8. Add judge scoring and verdict feedback.
9. Add progression, retry, and replay flows.

### Streaming Strategy

Streaming remains useful, but the trigger changes.

Before:

- orchestrator advanced automatically after every AI turn

After:

- orchestrator streams AI turns
- pauses for human input
- resumes only on player submission

### Latency Strategy

The system should reduce dead time between turns where possible:

- stream AI responses token-by-token
- warm the next AI turn when the previous response is sufficiently complete
- keep case file slices small and relevant
- use model selection by level instead of always calling the strongest model
- avoid sending irrelevant witness or evidence context

## Data Model

### Target Case File Schema

```ts
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
  foundAt: string
  relevance: string
}

interface DifficultyConfig {
  level: 1 | 2 | 3 | 4 | 5
  opponentModel: string
  temperature: number
  reasoningNotes: string
}

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
  difficulty: DifficultyConfig
}
```

This schema is what should be injected into agent calls. The lawyer and judge receive the broader context. Witnesses receive only the parts relevant to them.

## Current Codebase Status

The current repo still contains remnants of the older multi-agent simulation architecture:

- `arbiter`
- `accuse`
- `advocate`
- `chronicle`
- `ethos`

These should be treated as transitional implementation details, not the final product model.

The target direction is:

- one opposing lawyer
- one judge
- human player turns
- structured case files
- win/loss scoring

## Local Development

Install dependencies:

```bash
npm install
```

Run the frontend:

```bash
npm run dev
```

Run the API server:

```bash
npm run server
```

Build:

```bash
npm run build
```
