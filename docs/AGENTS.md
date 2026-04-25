# Verdict — AI Coding Context

This file provides implementation guidance for AI coding assistants working on Verdict after the gameplay pivot.

## What This Project Is

Verdict is no longer a passive multi-agent courtroom show. It is a turn-based courtroom game where a human player studies a case file, chooses `Prosecution` or `Defense`, argues against an AI lawyer, and receives a scored verdict from an AI judge.

The repo uses a React frontend with a server-side API layer for LLM calls. The critical runtime change is that the orchestrator must now manage human turns instead of generating every turn itself.

## Critical Rules

**Never expose API keys to the client.** All model calls stay in the server layer.

**The orchestrator must wait for player input on every player turn.** Do not auto-generate player arguments.

**Case files are the source of truth.** Agent calls must be grounded in the selected case file, not in arbitrary free-form user prompts.

**Inject only relevant case context.** Every agent call receives the relevant case file sections.

**Voice input is transcription first.** Audio must resolve into transcript text before it becomes part of the courtroom record.

**Lawyer and judge are audio-first.** Their responses should be delivered as speech plus transcript text using `gpt-realtime-1.5`.

**Use separate realtime voice configurations for lawyer and judge.** Realtime voice cannot be changed after audio has started in a session.

**The Clerk is still not an LLM call.** Clerk copy should remain deterministic and procedural.

**Streaming stays SSE unless there is a strong reason to change it.** The control flow changes; the transport does not need to.

**The judge must not coach the player during the live session.** Rulings are allowed. Mid-game guidance is not.

## Runtime Model

The target runtime entities are:

- one human player
- one opposing AI lawyer
- one AI judge
- one clerk layer for procedural announcements

Witnesses are off-screen case-file records, not live courtroom speakers.

The old five always-on AI entities are no longer the product target.

## Core Data Expectations

### Case Files

Case files should live in a dedicated `casefiles/` directory as structured JSON or TS data. They contain:

- metadata
- summary
- charges
- police or incident report
- witness statements
- evidence
- objectives for both sides
- difficulty config

### Levels

Difficulty settings should live in structured config, for example `config/levels.ts`, and map a level to:

- model string
- temperature
- reasoning notes
- objection aggressiveness
- retrieval usage when applicable
- preferred lawyer voice profile
- preferred judge voice profile

### Scoring

Scoring should live in `src/lib/scoring/` and support:

- rubric definition
- transcript evaluation helpers
- evidence-use checks
- verdict formatting

## Turn Orchestration Rules

- The client can only advance the court by submitting player text or a reviewed voice transcript on player turns.
- The server can advance AI lawyer and judge turns.
- The orchestrator must know whether the session is currently waiting for user input.
- Objections should be routed to the judge as a separate ruling path.
- Witness material should be cited from the case file rather than rendered as a live speaking turn.

## Agent Context Rules

### AI Lawyer

Receives:

- player role
- full case file
- transcript so far
- phase
- relevant witness statements
- difficulty config

### Judge

Receives:

- full case file
- full transcript
- objection log
- scoring rubric

## What To Avoid

- Do not rebuild the product around open-ended moral prompts.
- Do not let witnesses improvise facts outside their authored statements.
- Do not make the judge chatty during normal play.
- Do not bypass the player-turn wait state.
- Do not hardcode difficulty behavior only inside prompt prose if it belongs in config.
- Do not render witnesses as active courtroom speakers if the current product direction keeps them off-screen.

## Design Direction

The UI should still feel like a courtroom, but the interaction model is now much closer to a competitive strategy game. That means the interface needs clear preparation, action, and outcome states:

- case study before court opens
- clear input affordance during player turns
- visible transcript pressure during AI turns
- explicit score breakdown after verdict
- clear audio playback state for lawyer and judge responses
