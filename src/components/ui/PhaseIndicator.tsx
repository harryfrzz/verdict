import type { Phase } from '../../lib/agents/types'

interface PhaseIndicatorProps {
  currentPhase: Phase
}

const phases: Phase[] = ['opening', 'examination', 'cross', 'closing', 'deliberation', 'verdict']

function PhaseIndicator({ currentPhase }: PhaseIndicatorProps) {
  return (
    <section className="rounded-md border border-white/10 bg-black/50 p-4 backdrop-blur-md">
      <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">Phase</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {phases.map((phase) => {
          const isActive = phase === currentPhase

          return (
            <div
              key={phase}
              className={`rounded-md border px-3 py-3 text-sm font-medium capitalize ${
                isActive
                  ? 'border-amber-200/35 bg-amber-100/12 text-amber-50'
                  : 'border-white/8 bg-white/[0.04] text-stone-300'
              }`}
            >
              {phase}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default PhaseIndicator
