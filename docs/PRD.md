# Product Requirements Document — Verdict

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** 2025-04-25

---

## 1. Overview

### 1.1 Product Summary

Verdict is an adversarial multi-agent courtroom simulation platform. Users submit a moral dilemma, ethical question, or policy topic. A full AI-powered courtroom is instantiated — prosecution, defense, two witnesses, and a judge — and the agents argue the question in real time, with cross-examination, deliberation, and a final verdict with dissenting opinion.

### 1.2 Problem Statement

Complex moral and policy questions are typically explored through static essays, op-eds, or one-sided AI responses. There is no tool that surfaces the full adversarial tension of a contested idea — showing the strongest case for both sides simultaneously, tested under cross-examination, and resolved by structured deliberation.

### 1.3 Target Users

- Students and educators exploring ethics and critical thinking
- Researchers and policy analysts stress-testing arguments
- General users curious about both sides of a complex question
- Hackathon / conference demo audiences

### 1.4 Success Metrics

- Time-to-first-verdict: under 3 minutes from question submission
- User session completion rate: >80% reach the verdict screen
- Share rate: >30% of completed sessions trigger the share action
- Demo engagement: audience can follow the argument without prior context

---

## 2. Core Features

### 2.1 Case Entry (The Docket)

- Single text input for user-submitted question or dilemma
- 3–5 pre-loaded example cases covering ethics, technology, and policy
- Case category auto-detection (Ethics / Technology / Law / History)
- "Open the court" CTA that initialises the session

### 2.2 Plea Screen

- Intermediate pre-court screen shown after the Docket
- The accused appears alone in a spotlight with the case question
- User chooses `PLEAD GUILTY` or `PLEAD NOT GUILTY`
- The plea sets the accused's visual posture for the rest of the session
- Court has not started yet during this screen

### 2.3 The Courtroom Session (Live)

- Five AI agents instantiated with strict role-locked system prompts
- One non-speaking accused figure remains present in the dock throughout the session
- Turn-based orchestration: Opening → Examination → Cross-examination → Closing → Deliberation → Verdict
- Streaming transcript: each agent's output renders word-by-word in real time
- Character figures with idle / speaking pose states
- Phase announcements via Clerk layer between turns
- Case file panel: argument counts, key claims, tension meter
- Witness direct examinations and cross-examinations run for exactly two turns each

### 2.4 The Verdict

- Judge agent delivers structured ruling: verdict line + full reasoning + dissenting opinion
- Deliberation is shown as ARBITER thinking and is not streamed token-by-token
- Dramatic reveal sequence: dimming scene, character focus, line-by-line text render
- Full session transcript available post-verdict

### 2.5 Post-Verdict Scoring

- Argument stats per attorney: points argued and witnesses examined
- Scales of justice visual tipping toward winning side
- Shareable case card: case name, verdict, character figures, ruling text

---

## 3. The Five Agents

| Agent | Role | Stance |
|---|---|---|
| ARBITER | Judge | Neutral — delivers verdict and dissent |
| ACCUSE | Prosecution | Against / guilty |
| ADVOCATE | Defense | For / mitigating |
| CHRONICLE | Witness I | Factual — cites events, data, timelines |
| ETHOS | Witness II | Moral — ethical frameworks, intent, values |

Each agent operates with a strict system prompt. Agents receive the shared case file and full transcript history as context on every turn. No agent can break character or address the user directly.

---

## 4. Session Flow

```
User submits question
        ↓
Plea screen — user selects GUILTY or NOT GUILTY
        ↓
Clerk initialises case file and court opens
        ↓
ACCUSE delivers opening statement
        ↓
ADVOCATE delivers opening statement
        ↓
ACCUSE calls CHRONICLE → direct examination (2 turns)
        ↓
ADVOCATE cross-examines CHRONICLE (2 turns)
        ↓
ADVOCATE calls ETHOS → direct examination (2 turns)
        ↓
ACCUSE cross-examines ETHOS (2 turns)
        ↓
ACCUSE closing argument
        ↓
ADVOCATE closing argument
        ↓
ARBITER deliberation (not streamed) → verdict + dissent
        ↓
Post-verdict scoring reveal
```

Each phase is announced by the Clerk (a formatting layer, not an LLM call).

---

## 5. Constraints and Scope

### In scope (v1)
- Web application, desktop-first
- 5 AI agents, 1 user question, 1 session at a time
- 4 fixed stages: Plea, Opening, Examination, Closing/Verdict
- Shareable verdict card

### Out of scope (v1)
- User accounts or session history
- Mobile layout
- Multiple simultaneous sessions
- Custom agent configuration by user
- Voice / audio output
- Jury mechanic (audience voting)

---

## 6. Non-Functional Requirements

- First agent response begins streaming within 3 seconds of session start
- Full session completes in under 4 minutes at default settings
- No session state stored server-side beyond the active session
- API keys never exposed to the client
- Works in Chrome, Firefox, Safari (latest two versions each)

---

## 7. Open Questions

- Should users be able to pause/resume a session mid-argument?
- Should the post-verdict card be an image export or a shareable URL?
- Should CHRONICLE and ETHOS always both appear, or be selectively called per topic?
