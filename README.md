# Verdict

A turn-based courtroom game where you argue a real case against an AI lawyer and receive a verdict from an AI judge.

You are not a spectator. You choose a side, study the evidence, and earn your outcome.

![Verdict demo](public/demo-image.png)

---

## What It Is

Verdict puts you in the role of either prosecutor or defense attorney. An AI lawyer opposes you, an AI judge listens silently, and at the end both sides are evaluated on the strength of their arguments, use of evidence, and logical consistency.

Every case is structured: charges, witness statements, physical evidence, police reports, and role-specific objectives. The judge evaluates the full transcript against the case file. You win by out-arguing the AI.

---

## Features

- **Turn-based court sessions** — alternating arguments between you and an AI lawyer
- **Two roles** — Prosecution or Defense, each with different objectives and strategies
- **Structured case files** — curated evidence, witnesses, charges, and prior rulings
- **Five difficulty tiers** — Rookie through Legend, with stronger AI models at higher levels
- **Streamed audio** — AI lawyer and judge both speak with distinct voice profiles
- **Voice input** — submit arguments by typing or microphone
- **Win/loss verdict** — judge scores argument strength, evidence use, and logical consistency
- **Detailed feedback** — what you did well, what you missed, what the opponent exploited

---

## Tech Stack

**Frontend** — React 19, TypeScript, Vite, Tailwind CSS 4, Zustand, Framer Motion

**Backend** — Express 5, Node.js, TypeScript

**AI** — OpenAI (GPT-5, GPT-4o-mini for lawyer and judge), Groq (DeepSeek-R1, Llama 3.1)

**Audio** — OpenAI TTS streaming, Web Audio API (PCM16 playback)

---

## Getting Started

### Prerequisites

- Node.js 18+
- OpenAI API key (required)
- Groq API key (optional)

### Install

```bash
npm install
```

### Configure

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

```env
OPENAI_API_KEY=your_key_here
GROQ_API_KEY=your_key_here        # optional

LLM_MAX_TOKENS=600
LLM_TEMPERATURE=0.8

PORT=8787
VITE_API_BASE_URL=http://localhost:8787
VITE_APP_URL=http://localhost:5173
```

### Run

Start the backend and frontend in two terminals:

```bash
# Terminal 1 — API server
npm run server

# Terminal 2 — Frontend
npm run dev
```

Open `http://localhost:5173`.

### Build

```bash
npm run build
```

---

## How to Play

1. **Pick a level** — start at Rookie if it's your first time
2. **Choose a case** — read the preview to get a feel for the charges
3. **Study the case file** — evidence, witness statements, and role objectives are all there
4. **Select your role** — Prosecution or Defense
5. **Argue your case** — respond to the AI lawyer's arguments, cite evidence, and rebut
6. **Receive the verdict** — the judge scores both sides and declares a winner

