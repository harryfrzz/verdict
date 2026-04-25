import TranscriptEntry from './TranscriptEntry'
import type { AgentRole, TranscriptTurn } from '../../lib/agents/types'

interface TranscriptFeedProps {
  roles: AgentRole[]
  turns: TranscriptTurn[]
}

function TranscriptFeed({ roles, turns }: TranscriptFeedProps) {
  const roleById = Object.fromEntries(roles.map((role) => [role.id, role]))

  return (
    <section className="rounded-md border border-white/10 bg-black/50 p-4 backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">Transcript</p>
          <h2 className="mt-1 text-lg font-semibold text-stone-100">Live Courtroom Exchange</h2>
        </div>
        <span className="rounded-full border border-amber-300/18 bg-amber-200/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-amber-100">
          Streaming
        </span>
      </div>
      <div className="space-y-3">
        {turns.map((turn, index) => {
          const role = roleById[turn.agentId]
          const speaker = turn.agentId === 'arbiter' ? 'ARBITER' : role?.name ?? 'CLERK'
          const accentClass =
            turn.agentId === 'arbiter' ? 'bg-amber-200' : role?.accentClass ?? 'bg-amber-300'

          return (
            <TranscriptEntry
              key={`${turn.agentId}-${index}`}
              speaker={speaker}
              title={turn.phase}
              content={turn.content}
              accentClass={accentClass}
            />
          )
        })}
      </div>
    </section>
  )
}

export default TranscriptFeed
