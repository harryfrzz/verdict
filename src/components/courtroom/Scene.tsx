import CharacterFigure from './CharacterFigure'
import type { AgentRole } from '../../lib/agents/types'

interface SceneProps {
  roles: AgentRole[]
  activeAgentId: AgentRole['id'] | null
  activeLine?: string
  benchLine?: string
}

function Scene({ roles, activeAgentId, activeLine, benchLine }: SceneProps) {
  return (
    <section className="relative flex min-h-[62vh] items-end px-6 pb-8 pt-20">
      <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/55 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/70 to-transparent" />

      <div className="absolute left-1/2 top-6 z-10 w-full max-w-md -translate-x-1/2 px-6">
        <div className="rounded-md border border-amber-200/18 bg-black/55 px-5 py-4 text-center backdrop-blur-sm">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-amber-200/78">
            Arbiter Bench
          </p>
          <p className="mt-1 text-lg font-semibold text-stone-100">The Court Is In Session</p>
          <p className="mt-2 text-sm leading-6 text-stone-300">
            {benchLine ?? 'Live role-play layout built from the courtroom architecture in the repo docs.'}
          </p>
        </div>
      </div>

      <div className="relative z-10 grid w-full grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
        {roles.map((role) => (
          <div
            key={role.id}
            className={`flex ${role.alignment === 'left' ? 'justify-start' : 'justify-end'} ${
              role.id === activeAgentId ? 'lg:-translate-y-4' : 'opacity-92'
            } transition-transform duration-300`}
          >
            <CharacterFigure
              name={role.name}
              title={role.title}
              imageSrc={role.imageSrc}
              accentClass={role.accentClass}
              alignment={role.alignment}
              line={role.id === activeAgentId ? activeLine : undefined}
            />
          </div>
        ))}
      </div>
    </section>
  )
}

export default Scene
