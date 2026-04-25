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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {levels.map((level, index) => (
            <button
              key={level.id}
              type="button"
              onClick={() => {
                setActiveLevel(level)
                setSelectedDifficulty('Easy')
              }}
              className="group animate-verdict-float-in overflow-hidden rounded-2xl border border-stone-700/90 bg-stone-950/95 text-left shadow-[0_22px_54px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.03] transition duration-300 hover:-translate-y-1 hover:border-amber-100/45 hover:shadow-[0_28px_70px_rgba(0,0,0,0.46)] active:scale-[0.99]"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className="relative h-40 overflow-hidden bg-stone-900">
                <img
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  src={level.thumbnailSrc}
                  alt=""
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent" />
                <span className="absolute bottom-3 left-3 rounded-full border border-stone-600 bg-stone-950/80 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-stone-200">
                  Level {level.level}
                </span>
              </div>
              <div className="p-5">
                <h2 className="text-lg font-semibold leading-6 text-stone-100">{level.title}</h2>
                <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-stone-500">
                  {level.category}
                </p>
                <p className="mt-4 min-h-24 text-sm leading-6 text-stone-300">{level.summary}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {activeLevel && activeRange ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 px-4">
          <div className="w-full max-w-3xl animate-verdict-float-in overflow-hidden rounded-2xl border border-stone-700/90 bg-stone-950 shadow-[0_32px_90px_rgba(0,0,0,0.62)] ring-1 ring-white/[0.04]">
            <div className="relative h-44 overflow-hidden bg-stone-900">
              <img className="h-full w-full object-cover" src={activeLevel.thumbnailSrc} alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/45 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-stone-300">
                    Level {activeLevel.level} · {activeLevel.category}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-stone-100">
                    {activeLevel.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveLevel(null)}
                  className="rounded-lg border border-stone-600 bg-stone-950/78 px-3 py-2 text-sm text-stone-200 transition hover:border-stone-400 hover:text-stone-50"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="p-5">
            <div className="grid grid-cols-3 gap-2">
              {activeLevel.ranges.map((range) => (
                <button
                  key={range.difficulty}
                  type="button"
                  onClick={() => setSelectedDifficulty(range.difficulty)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    selectedDifficulty === range.difficulty
                      ? 'border-amber-200 bg-amber-200 text-stone-950'
                      : 'border-stone-700 bg-stone-900 text-stone-300 hover:border-stone-500'
                  }`}
                >
                  {range.difficulty}
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-3 rounded-xl border border-stone-800 bg-stone-900 p-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-stone-500">Charge</p>
                <p className="mt-1 text-sm leading-6 text-stone-200">{activeLevel.charge}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-stone-500">Evidence</p>
                <p className="mt-1 text-sm leading-6 text-stone-300">{activeLevel.evidence}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-stone-500">Complication</p>
                <p className="mt-1 text-sm leading-6 text-stone-300">{activeLevel.complication}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-stone-500">Difficulty</p>
                <p className="mt-1 text-sm leading-6 text-stone-300">{activeRange.challenge}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onPlay(activeLevel, activeRange)}
              className="mt-5 w-full rounded-xl bg-amber-200 px-4 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-100 active:scale-[0.99]"
            >
              Play
            </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default LandingPage
