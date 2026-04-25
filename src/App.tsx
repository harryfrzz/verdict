import heroImg from './assets/hero.png'
const preloadedCases = [
  {
    title: 'Oppenheimer',
    category: 'Ethics · History',
    question: 'Was Oppenheimer morally responsible for Hiroshima?',
  },
  {
    title: 'Algorithmic Justice',
    category: 'Technology · Policy',
    question: 'Should governments ban predictive policing systems?',
  },
  {
    title: 'Civil Resistance',
    category: 'Law · Ethics',
    question: 'Is it ever justified to break the law to prevent a greater harm?',
  },
]

const flow = [
  'Docket intake',
  'Plea selection',
  'Openings and witness examination',
  'Arbiter deliberation',
  'Shareable verdict',
]

function App() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(201,169,110,0.16),_transparent_34%),linear-gradient(180deg,_#151217_0%,_#0b0b0d_48%,_#070709_100%)] text-stone-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 sm:px-10 lg:px-12">
        <header className="mb-10 flex items-center justify-between border-b border-white/10 pb-5">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-amber-200/70">
              Verdict
            </p>
            <p className="mt-2 max-w-md text-sm text-stone-400">
              An adversarial AI courtroom for moral dilemmas, policy disputes, and
              contested historical judgments.
            </p>
          </div>
          <div className="hidden rounded-full border border-amber-200/20 bg-amber-200/10 px-4 py-2 font-mono text-xs uppercase tracking-[0.25em] text-amber-100 md:block">
            Vite + React + Tailwind
          </div>
        </header>

        <section className="grid flex-1 items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8">
            <div className="space-y-5">
              <p className="font-mono text-sm uppercase tracking-[0.35em] text-stone-500">
                Courtroom Simulation
              </p>
              <h1 className="max-w-3xl text-5xl font-semibold leading-none tracking-[-0.04em] text-stone-50 sm:text-6xl">
                Put any hard question on trial.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-stone-300">
                Verdict stages prosecution, defense, witnesses, and judicial
                deliberation in a single cinematic flow. Users enter the case,
                choose the plea, and watch both sides fight toward a final ruling.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                className="inline-flex items-center justify-center border border-amber-300/40 bg-amber-200 px-6 py-3 font-mono text-sm uppercase tracking-[0.2em] text-stone-950 transition hover:bg-amber-100"
              >
                Open the Court
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center border border-white/15 bg-white/5 px-6 py-3 font-mono text-sm uppercase tracking-[0.2em] text-stone-100 transition hover:border-white/30 hover:bg-white/10"
              >
                Review Cases
              </button>
            </div>

            <dl className="grid gap-4 sm:grid-cols-3">
              <div className="border border-white/10 bg-white/5 p-4">
                <dt className="font-mono text-xs uppercase tracking-[0.25em] text-stone-500">
                  Agents
                </dt>
                <dd className="mt-3 text-3xl font-semibold text-stone-50">5</dd>
              </div>
              <div className="border border-white/10 bg-white/5 p-4">
                <dt className="font-mono text-xs uppercase tracking-[0.25em] text-stone-500">
                  Witness Rounds
                </dt>
                <dd className="mt-3 text-3xl font-semibold text-stone-50">2x2</dd>
              </div>
              <div className="border border-white/10 bg-white/5 p-4">
                <dt className="font-mono text-xs uppercase tracking-[0.25em] text-stone-500">
                  Verdict Target
                </dt>
                <dd className="mt-3 text-3xl font-semibold text-stone-50">&lt; 4m</dd>
              </div>
            </dl>
          </div>

          <div className="relative overflow-hidden border border-white/10 bg-black/20 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,_rgba(139,26,47,0.18),_transparent_35%,_transparent_65%,_rgba(26,58,92,0.22))]" />
            <div className="relative">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber-200/70">
                    Live Flow
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-stone-50">
                    The court opens in ten beats
                  </h2>
                </div>
                <img
                  src={heroImg}
                  alt="Verdict courtroom concept art"
                  className="h-24 w-24 border border-white/10 object-cover shadow-lg shadow-black/30"
                />
              </div>

              <ol className="space-y-3 border-l border-white/10 pl-4">
                {flow.map((step, index) => (
                  <li key={step} className="relative pl-4">
                    <span className="absolute -left-[1.35rem] top-1.5 h-3 w-3 border border-amber-200/50 bg-stone-950" />
                    <span className="font-mono text-xs uppercase tracking-[0.25em] text-stone-500">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <p className="mt-1 text-base text-stone-200">{step}</p>
                  </li>
                ))}
              </ol>

              <div className="mt-8 grid gap-3">
                {preloadedCases.map((item) => (
                  <article
                    key={item.title}
                    className="border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.05]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-stone-500">
                          {item.category}
                        </p>
                        <h3 className="mt-2 text-lg font-medium text-stone-50">
                          {item.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-stone-300">
                          {item.question}
                        </p>
                      </div>
                      <span className="mt-1 border border-amber-200/20 bg-amber-200/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-amber-100">
                        Ready
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

export default App
