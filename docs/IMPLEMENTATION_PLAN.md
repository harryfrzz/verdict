# Implementation Plan — Verdict

**Version:** 1.0  
**Last Updated:** 2025-04-25  
**Target:** 6-hour hackathon build

This document describes the exact build order, what to scaffold first, and what to defer. Follow this sequence — it is ordered so that you always have a working demo at each checkpoint.

---

## Hour 0 — Project Bootstrap (15 min)

```bash
npm create vite@latest verdict -- --template react-ts
cd verdict
npm install
npm install zustand framer-motion express cors
```

Create `.env` files for both client and server with all required env vars.

Create the full directory structure from `ARCHITECTURE.md` as empty files (touch). This lets the AI coding assistant understand the intended structure from the start.

Create `src/lib/agents/types.ts` first — every other file imports from it.

---

## Hour 1 — Core Types + Agent Prompts + LLM Client

**Priority: get one agent turn working end-to-end before building any UI.**

Order:
1. `src/lib/agents/types.ts` — all types defined
2. `src/lib/agents/prompts.ts` — all 5 system prompts + Clerk function
3. `server/llm/client.ts` — provider-agnostic streaming caller
4. `src/lib/llm/stream.ts` — SSE token parser
5. `server/routes/agent.ts` — single agent turn API endpoint with SSE

Test checkpoint: `curl` the `/api/agent` endpoint with a hardcoded ACCUSE turn. Verify tokens stream back correctly before touching the frontend.

---

## Hour 2 — Session Logic + State

Order:
1. `src/lib/session/store.ts` — full Zustand store
2. `src/lib/session/caseFile.ts` — CaseFile builder
3. `src/lib/agents/orchestrator.ts` — turn queue + phase advancement
4. `server/routes/session.ts` — session init endpoint

Test checkpoint: call `/api/session`, then manually trigger 2 sequential `/api/agent` calls using the returned sessionId. Verify the second agent receives the first agent's turn in its transcript.

## Hour 3 — Docket Screen + Plea Screen + Session Screen (no character figures)

Build the UI in functional-first order — get the courtroom working with placeholder boxes for characters.

Order:
1. `src/pages/DocketPage.tsx` — Docket screen: input, preloaded cases, CTA button
2. `src/pages/PleaPage.tsx` — plea selection screen with guilty / not guilty choice
3. `src/components/transcript/TranscriptFeed.tsx` + `TranscriptEntry.tsx` + `ClerkAnnouncement.tsx`
4. `src/components/transcript/StreamingText.tsx` — word-by-word fade render
5. `src/pages/SessionPage.tsx` — session screen with transcript panel wired to store
6. Wire the session page to call the backend `/api/session`, then run the orchestrator loop

Test checkpoint: submit a question from the Docket, choose a plea, then watch the transcript fill with streaming agent turns through all phases. Characters are just colored placeholder boxes at this point — that is fine.

---

## Hour 4 — Verdict Screen + Deliberation Handoff

Order:
1. `src/pages/VerdictPage.tsx` — verdict reveal screen
2. `src/components/verdict/VerdictCard.tsx` — ruling + reasoning + dissent render
3. `src/components/verdict/ScoringPanel.tsx` — slide-up stats panel
4. `src/components/ui/ScalesOfJustice.tsx` — tipping animation
5. Add non-streamed ARBITER deliberation state before verdict reveal

Test checkpoint: run a full session end-to-end from Docket → Session → Verdict. Verify the verdict parses correctly into ruling / reasoning / dissent.

---

## Hour 5 — Character Figures + Scene Polish

This hour is where the visual identity comes together. Drop in the character SVG assets from the design output.

Order:
1. Add character SVG assets to `assets/characters/`
2. `src/components/courtroom/CharacterFigure.tsx` — pose switching with Framer Motion
3. `src/components/courtroom/GlowHalo.tsx` — speaking indicator
4. `src/components/courtroom/Nameplate.tsx` — name tag below figure
5. Add accused posture variants for `guilty` and `not_guilty`
6. `src/components/courtroom/Scene.tsx` — full courtroom layout with background + all 5 characters plus accused in the dock
7. Wire `activeSpeaker` from store to Scene — speaking character animates on turn change
8. `src/components/ui/TensionMeter.tsx` + `src/components/ui/CaseFileDrawer.tsx`
9. `src/components/ui/PhaseIndicator.tsx` in the top bar

Test checkpoint: watch a full session. Characters should switch pose in sync with the streaming transcript. Tension meter should rise across turns.

---

## Hour 6 — Demo Prep + Polish

Order:
1. Pre-load 2 demo cases and verify they produce compelling verdicts
2. Add the "Share verdict" card — static preview is fine, shareable URL is a bonus
3. Fix any streaming edge cases (empty turns, stuck states)
4. Add the mock mode toggle (hardcoded replay) as a safety net
5. Test on a projected screen at 1440px — verify font sizes read at distance
6. Deploy the Vite frontend and Node API, or proxy both behind one domain

---

## Deferred to Post-Hackathon

- Mobile layout
- Session history / user accounts
- Audio — gavel sound, ambient courtroom noise
- Jury mechanic — audience voting on verdict
- Custom agent configuration by user
- Export transcript as PDF
- Shareable URL (vs static card image)

---

## Demo Script (3 minutes)

**0:00 — Setup (30s)**  
"Verdict is an AI courtroom that argues both sides of any moral question. Here's how it works."  
Open the Docket. Point at the three pre-loaded cases. "I'll use the Oppenheimer question."

**0:30 — Session start (90s)**  
Click "Open the court." On the plea screen, choose guilty or not guilty. Then point at the courtroom lighting up and character figures appearing. Let ACCUSE and ADVOCATE deliver their opening statements while explaining what's happening: "Prosecution argues guilt, defense argues mitigating context — both powered by separate AI agents with locked roles."

When a witness is called: "Now the prosecution calls Chronicle — the factual witness. Watch ADVOCATE cross-examine."

**2:00 — Verdict (60s)**  
"Now ARBITER — the judge — deliberates." Let the verdict reveal happen without talking over it. Let the text render.

Point at the dissenting opinion: "This is the strongest counter-argument to the verdict, written by the same judge."

Show the scoring panel tipping the scales. "This is Verdict."

**2:45 — Close**  
"Built in 6 hours. Every agent sees every prior statement — that's why cross-examination actually works."
