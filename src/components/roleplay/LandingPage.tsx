import { useState } from 'react'

export type CaseDifficulty = 'Easy' | 'Medium' | 'Difficult'

export interface CaseDifficultyRange {
  difficulty: CaseDifficulty
  challenge: string
  template: string
}

export interface CaseLevel {
  id: string
  level: number
  title: string
  category: string
  thumbnailSrc: string
  summary: string
  charge: string
  evidence: string
  complication: string
  ranges: CaseDifficultyRange[]
}

interface LandingPageProps {
  levels: CaseLevel[]
  onPlay: (level: CaseLevel, range: CaseDifficultyRange) => void
}

function LandingPage({ levels, onPlay }: LandingPageProps) {
  const [activeLevel, setActiveLevel] = useState<CaseLevel | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<CaseDifficulty>('Easy')

  const activeRange =
    activeLevel?.ranges.find((range) => range.difficulty === selectedDifficulty) ??
    activeLevel?.ranges[0]

  return (
    <>
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 py-10">
        <div className="max-w-3xl animate-verdict-float-in">
          <p className="text-[11px] uppercase tracking-[0.2em] text-amber-100/80">Verdict</p>
          <h1 className="mt-2 text-4xl font-semibold text-stone-100">Choose a case level</h1>
          <p className="mt-3 text-sm leading-6 text-stone-300">
            Each level contains Easy, Medium, and Difficult versions. Open a case, inspect the
            details, then play.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {levels.map((level, index) => (
            <button
              key={level.id}
              type="button"
              onClick={() => {
                setActiveLevel(level)
                setSelectedDifficulty('Easy')
              }}
              className="group relative animate-verdict-float-in overflow-hidden rounded-3xl border border-stone-700/80 bg-[linear-gradient(145deg,rgba(28,25,23,0.98),rgba(12,10,9,0.98)_62%,rgba(41,18,18,0.94))] text-left shadow-[0_24px_64px_rgba(0,0,0,0.42)] ring-1 ring-white/[0.04] transition duration-300 hover:-translate-y-1.5 hover:border-amber-100/45 hover:shadow-[0_34px_86px_rgba(0,0,0,0.56)] active:scale-[0.99]"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-amber-100/45 to-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="relative h-48 overflow-hidden bg-stone-900">
                <img
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                  src={level.thumbnailSrc}
                  alt=""
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(251,191,36,0.2),transparent_28%),linear-gradient(180deg,rgba(12,10,9,0.05)_0%,rgba(12,10,9,0.25)_40%,rgba(12,10,9,0.96)_100%)]" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-red-200/80">
                    Mission description
                  </p>
                  <h2 className="mt-1 text-xl font-semibold leading-6 tracking-tight text-stone-50">
                    {level.title}
                  </h2>
                </div>
              </div>
              <div className="p-5">
                <p className="min-h-24 text-sm leading-6 text-stone-300">{level.summary}</p>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-stone-800 pt-4">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Easy · Medium · Difficult
                  </span>
                  <span className="rounded-full bg-stone-800 px-3 py-1 text-xs font-semibold text-amber-100 transition group-hover:bg-amber-100 group-hover:text-stone-950">
                    Open
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {activeLevel && activeRange ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-950/82 px-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl animate-verdict-float-in overflow-hidden rounded-3xl border border-amber-100/15 bg-[linear-gradient(145deg,rgba(28,25,23,0.98),rgba(12,10,9,0.98)_58%,rgba(41,18,18,0.96))] shadow-[0_34px_110px_rgba(0,0,0,0.7)] ring-1 ring-white/[0.06]">
            <div className="relative min-h-64 overflow-hidden bg-stone-900">
              <img
                className="absolute inset-0 h-full w-full object-cover transition duration-500"
                src={activeLevel.thumbnailSrc}
                alt=""
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(251,191,36,0.22),transparent_28%),linear-gradient(90deg,rgba(12,10,9,0.96)_0%,rgba(12,10,9,0.72)_42%,rgba(12,10,9,0.28)_100%),linear-gradient(180deg,transparent_0%,rgba(12,10,9,0.95)_100%)]" />
              <div className="relative z-10 flex min-h-64 flex-col justify-between p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <span className="rounded-full border border-amber-200/30 bg-amber-200/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100">
                    Mission briefing
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveLevel(null)}
                    className="rounded-full border border-stone-500/60 bg-stone-950/70 px-4 py-2 text-sm font-medium text-stone-200 transition hover:border-amber-100/60 hover:bg-stone-900 hover:text-stone-50"
                  >
                    Close
                  </button>
                </div>
                <div className="max-w-2xl">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-red-200/80">
                    Mission Briefing
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-50 sm:text-4xl">
                    {activeLevel.title}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-stone-300">{activeLevel.summary}</p>
                </div>
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <div className="grid grid-cols-3 gap-2 rounded-2xl border border-stone-700/70 bg-stone-950/55 p-1.5">
                {activeLevel.ranges.map((range) => (
                  <button
                    key={range.difficulty}
                    type="button"
                    onClick={() => setSelectedDifficulty(range.difficulty)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                      selectedDifficulty === range.difficulty
                        ? 'border-amber-100 bg-amber-100 text-stone-950 shadow-[0_10px_28px_rgba(251,191,36,0.18)]'
                        : 'border-transparent bg-transparent text-stone-400 hover:bg-stone-800/80 hover:text-stone-100'
                    }`}
                  >
                    {range.difficulty}
                  </button>
                ))}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-red-300/15 bg-red-950/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-red-200/70">Charge</p>
                  <p className="mt-2 text-sm leading-6 text-stone-100">{activeLevel.charge}</p>
                </div>
                <div className="rounded-2xl border border-amber-200/15 bg-amber-950/15 p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-amber-100/70">
                    Evidence
                  </p>
                  <p className="mt-2 text-sm leading-6 text-stone-200">{activeLevel.evidence}</p>
                </div>
                <div className="rounded-2xl border border-violet-200/15 bg-violet-950/15 p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-violet-100/70">
                    Complication
                  </p>
                  <p className="mt-2 text-sm leading-6 text-stone-200">
                    {activeLevel.complication}
                  </p>
                </div>
                <div className="rounded-2xl border border-stone-600/60 bg-stone-900/70 p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-stone-400">
                    Difficulty
                  </p>
                  <p className="mt-2 text-sm leading-6 text-stone-200">{activeRange.challenge}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onPlay(activeLevel, activeRange)}
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-amber-100 to-orange-200 px-4 py-3.5 text-sm font-bold text-stone-950 shadow-[0_16px_42px_rgba(251,191,36,0.2)] transition hover:from-amber-50 hover:to-orange-100 active:scale-[0.99]"
              >
                Begin Mission
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default LandingPage
