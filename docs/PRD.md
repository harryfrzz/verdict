# Product Requirements Document — Verdict

**Version:** 2.0
**Status:** Draft
**Last Updated:** 2026-04-25

## 1. Overview

### 1.1 Product Summary

Verdict is a courtroom strategy and speaking game. The player studies a structured case file, chooses to play `Prosecution` or `Defense`, argues against an AI lawyer in a turn-based courtroom, and receives a win/loss verdict from an AI judge based on the quality of their performance.

### 1.2 Product Pivot

The original concept centered on multiple AI agents arguing while the user watched. That model is deprecated.

The new product is built around player agency:

| Before | After |
| --- | --- |
| 5 AI agents, user watches | 1 AI lawyer + 1 AI judge + human player |
| Open-ended moral questions | Preset case files with structured evidence |
| No real stakes | Win/loss outcome based on player performance |
| Passive AI influence | Player must argue and earn the result |
| Low replay value | Levels, difficulty tiers, stronger opponents |

### 1.3 Product Promise

Verdict should feel like:

- an entertainment product with real tension and replayability
- a skill-building tool for argumentation, rebuttal, and evidence use
- a performance experience when used with voice input

### 1.4 Target Users

- Students practicing structured argument and reasoning
- Debate, mock trial, and law-adjacent learners
- Players who enjoy adversarial strategy games
- Demo audiences who need a clear, interactive loop

### 1.5 Success Metrics

- Time-to-first-playable-court session under 2 minutes from launch
- Session completion rate above 70%
- Retry or replay rate above 35%
- Voice usage in a meaningful share of completed sessions
- Clear perceived fairness of win/loss outcomes in user feedback

## 2. Core Product Loop

1. Player selects a difficulty level.
2. Player browses available cases in that tier.
3. Player reads the full case file.
4. Player selects `Prosecution` or `Defense`.
5. Court opens and charges are read.
6. The courtroom alternates between AI lawyer turns and player turns.
7. Witnesses are examined and cross-examined.
8. Either side may object; the judge rules.
9. Both sides deliver closing arguments.
10. The judge evaluates the transcript against the case file and rubric.
11. Player receives a verdict, score breakdown, and targeted feedback.
12. Player retries, advances, or selects another case.

## 3. Primary Entities

### 3.1 Human Player

- Chooses role: `Prosecution` or `Defense`
- Studies the case file before play
- Responds by typed text or voice
- Wins or loses based on transcript quality, not on passive observation

### 3.2 AI Lawyer

- Plays the side opposite the player
- Uses the full case file and transcript
- Adapts aggression and reasoning quality to the level configuration
- Pressures weak logic and exploits missed evidence

### 3.3 AI Judge

- Mostly silent during active play except for rulings
- Evaluates the full session at the end
- Produces verdict, score breakdown, and feedback

### 3.4 AI Witnesses

- Instantiated from the case file
- Must remain consistent with their written statements
- Respond only within the scope of their identity and the questions asked

### 3.5 Clerk

- Presentation layer only
- Announces charges, phase transitions, and procedural moments
- Not a reasoning agent

## 4. Core Features

### 4.1 Role Selection

Role selection is a gameplay commitment, not cosmetic framing.

It changes:

- which burden the player must satisfy
- which objective they must argue toward
- which witnesses they question directly
- which attacks the AI lawyer makes
- how the judge evaluates omissions and weak spots

### 4.2 Case File System

Verdict no longer starts from arbitrary user-submitted moral prompts. It starts from authored case files.

Every case file includes:

- title and metadata
- summary
- date and location
- charges
- police or incident report
- 2-3 witness statements
- physical evidence list
- relevant prior rulings or precedents when applicable
- prosecution objective
- defense objective
- difficulty configuration

### 4.3 Levels And Difficulty

| Level | Case Style | AI Opponent Model | AI Behaviour |
| --- | --- | --- | --- |
| 1 — Rookie | Open-and-shut cases, clear evidence | weaker model / low temperature | obvious arguments, easy to counter |
| 2 — Junior | Ambiguous evidence, one strong counter | mid-tier model | finds gaps in weak arguments |
| 3 — Senior | Conflicting witness statements | strong model | anticipates and attacks weak logic |
| 4 — Partner | Minimal evidence, very hard inference | best available model | dismantles weak arguments quickly |
| 5 — Legend | Landmark cases with historical context | best model + retrieval | near-unbeatable aspirational opponent |

Difficulty affects both:

- case complexity
- model selection
- reasoning profile
- objection behavior
- how aggressively the AI punishes unsupported claims

### 4.4 Court Session Flow

The target interaction flow is:

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

The transcript alternates between:

- AI lawyer turn
- player turn
- witness turn when relevant
- judge ruling when needed

### 4.5 Voice Input

The player should be able to argue by:

- typed text
- microphone capture transcribed into text

Voice is a first-class feature because it turns the product into a courtroom performance rather than a text-only tactics screen.

### 4.6 Win/Loss Scoring

The judge evaluates both sides on:

- argument strength
- use of evidence from the case file
- logical consistency
- handling of objections
- responsiveness to the opponent's attacks

The player wins if their aggregate score exceeds the AI lawyer's score.

The result screen should include:

- win/loss outcome
- category scores
- strongest player arguments
- where the player lost ground
- what evidence the player missed
- what the AI lawyer exploited successfully

## 5. Scope

### In Scope (Current Direction)

- Case-file-driven sessions
- Level and difficulty tiers
- Human turn-taking via text input
- Human turn-taking via voice transcription
- AI lawyer, judge, and witness prompts
- Win/loss scoring with structured feedback
- Replayability through cases and levels

### Out Of Scope (For Now)

- Open-ended user-created cases as the core mode
- Fully autonomous AI-vs-AI sessions as the primary experience
- Multiplayer or live PvP
- Persistent progression systems beyond local session results
- Jury voting mechanics

## 6. Non-Functional Requirements

- First AI turn should begin quickly after role selection and court open
- The orchestrator must pause for player input on every player turn
- Witness replies must remain consistent with case file statements
- Scoring must feel explainable and grounded in the transcript
- Voice transcription must resolve into editable transcript text before submission
- API keys remain server-side only

## 7. Open Questions

- Should opening statements always start with the AI lawyer, or vary by role and case?
- Should retries preserve the same case facts but vary witness tone at higher levels?
- Should Level 5 retrieval be limited to curated precedent packs instead of broad search?
