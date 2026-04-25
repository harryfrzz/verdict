# Implementation Plan — Verdict

**Version:** 2.0
**Last Updated:** 2026-04-25
**Target:** pivot plan, docs-only baseline

This plan reflects the new human-vs-AI courtroom structure. The major implementation change is in Hour 3: the product now needs a turn-based player input system, not an auto-running AI-only session loop.

## Hour 0 — Realign The Data Model

Priority: stop designing around open-ended questions and move to structured case files.

Order:

1. Define the `CaseFile` schema and supporting `Witness`, `Evidence`, and `DifficultyConfig` types.
2. Create a `casefiles/` directory and add a few authored sample cases.
3. Create a levels config file mapping difficulty tiers to model strings and reasoning presets.
4. Remove the plea-screen assumption from planning and replace it with role selection.

Checkpoint:

- One sample case file validates against the new schema.
- Levels are represented in structured config.

## Hour 1 — Prompt Layer And LLM Routing

Priority: reduce the prompt system to the actual runtime entities.

Order:

1. Replace the five-agent mental model with prompts for:
   - opposing lawyer
   - judge
2. Update server LLM routing assumptions so calls can target those roles.
3. Keep the Clerk as a deterministic formatting layer.
4. Make sure prompts accept injected case-file sections rather than a generic question.

Checkpoint:

- A single lawyer turn can be generated from a case file and player role.

## Hour 2 — Session State And Orchestrator

Priority: build the new control flow before polishing UI.

Order:

1. Redefine session state around:
   - selected case
   - selected role
   - transcript
   - current phase
   - awaiting player input
2. Update the orchestrator to alternate between AI turns and player turns.
3. Add objection handling and judge ruling hooks.
4. Add a verdict assembly path that packages transcript, case file, and rubric for scoring.
5. Add separate realtime session handling for lawyer and judge voice output.

Checkpoint:

- The orchestrator can pause and resume based on player submissions.
- The session no longer assumes an auto-advancing full AI loop.

## Hour 3 — Case Study Screen + Turn-Based Input System

This hour changes completely from the previous plan.

Priority: build the actual player interaction surface.

Order:

1. Build level selection.
2. Build case browser for the chosen level.
3. Build case study screen showing:
   - summary
   - report
   - witnesses
   - evidence
   - objectives
4. Build role selection for `Prosecution` or `Defense`.
5. Build the courtroom session screen with:
   - transcript
   - text input box for player turns
   - mic button for voice capture
   - submit flow that advances the court only after player action
6. Keep streaming architecture for AI turns exactly where it already makes sense.
7. Do not build live witness speaking UI; witness material belongs in the case-study experience.

Checkpoint:

- A player can read a case, choose a role, submit an opening statement, and see the AI respond.

## Hour 4 — Voice Transcription And Audio Court Output

Order:

1. Add `/api/voice` transcription route.
2. Add client-side mic capture and audio upload.
3. Show transcribed text for player review before submission.
4. Add lawyer audio output with live transcript using `gpt-realtime-1.5`.
5. Add judge audio output with live transcript using `gpt-realtime-1.5`.
6. Use separate voice configuration for lawyer and judge.
7. Add objection UI and judge ruling path.

Checkpoint:

- Player can speak an argument and submit the transcript as their turn.
- Lawyer and judge both respond with speech plus transcript text.

## Hour 5 — Scoring Engine And Verdict

Order:

1. Add `lib/scoring/` for rubric logic.
2. Define judge scoring categories.
3. Generate verdict, win/loss, and score breakdown.
4. Add targeted player feedback:
   - what worked
   - where ground was lost
   - what evidence was missed
   - what the AI exploited

Checkpoint:

- End-to-end session returns a defensible win/loss outcome with useful feedback.

## Hour 6 — Replayability And Demo Polish

Order:

1. Add multiple cases across at least two levels.
2. Tune difficulty so level differences are obvious.
3. Improve post-verdict retry and level-up flows.
4. Prepare one easy demo case and one difficult demo case.
5. Verify both text and voice play paths.
6. Verify judge and lawyer voices are clearly distinct in demos.

Checkpoint:

- The product clearly reads as a game with replay value, not a passive simulation.

## Deferred

- Persistent progression systems
- Multiplayer or spectator modes
- Broad retrieval for all levels
- User-authored case creation
- Mobile-first polish
