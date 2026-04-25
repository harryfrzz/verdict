export interface SetupCharacter {
  id: string
  name: string
  title: string
  imageSrc: string
  accentClass: string
}

interface CharacterSetupProps {
  characters: SetupCharacter[]
  userSide: 'accuse' | 'advocate'
  onUserSideChange: (characterId: 'accuse' | 'advocate') => void
}

const characterPositions: Record<
  string,
  {
    className: string
    imageClassName: string
  }
> = {
  arbiter: {
    className: 'left-[528px] top-5 w-56',
    imageClassName: 'h-56',
  },
  accused: {
    className: 'left-[544px] top-[320px] w-52',
    imageClassName: 'h-64',
  },
  accuse: {
    className: 'left-[984px] top-[260px] w-64',
    imageClassName: 'h-96',
  },
  advocate: {
    className: 'left-10 top-[260px] w-82',
    imageClassName: 'h-96',
  },
}

function CharacterSetup({
  characters,
  userSide,
  onUserSideChange,
}: CharacterSetupProps) {
  return (
    <section className="relative mx-auto h-[720px] w-[1280px] max-w-none shrink-0">
      {characters.map((character, index) => {
        const position = characterPositions[character.id]
        const isSelectable = character.id === 'accuse' || character.id === 'advocate'
        const isSelected = userSide === character.id

        return (
          <article
            key={character.id}
            className={`group absolute flex flex-col items-center animate-verdict-float-in ${position.className}`}
            style={{ animationDelay: `${index * 55}ms` }}
          >
            <div className="relative flex w-full items-end justify-center">
              <div
                className={`absolute bottom-3 h-24 w-4/5 rounded-full blur-2xl transition duration-300 group-hover:opacity-80 ${
                  isSelected ? 'bg-amber-200/28 opacity-100' : 'bg-black/45 opacity-70'
                }`}
              />
              <div className="absolute bottom-0 h-7 w-4/5 rounded-[100%] border border-stone-600/45 bg-stone-950/42 shadow-[0_18px_34px_rgba(0,0,0,0.42)]" />
              <img
                className={`relative z-10 w-full object-contain object-bottom drop-shadow-[0_26px_32px_rgba(0,0,0,0.62)] transition duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-[1.045] ${position.imageClassName}`}
                src={character.imageSrc}
                alt={character.name}
              />
            </div>

            <div
              className={`relative z-20 -mt-2 w-70 overflow-hidden rounded-2xl border px-3 py-3 shadow-[0_20px_46px_rgba(0,0,0,0.46)] backdrop-blur-sm transition duration-200 ${
                isSelected
                  ? 'border-amber-100/70 bg-amber-100/12 ring-1 ring-amber-100/35'
                  : 'border-stone-700/90 bg-stone-950/92 group-hover:border-stone-500'
              }`}
            >
              <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-amber-100/40 to-transparent" />
              <div className="flex items-center gap-3">
                <span
                  className={`h-3 w-3 shrink-0 rounded-full shadow-[0_0_16px_currentColor] ${character.accentClass}`}
                />
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold tracking-wide text-stone-50">
                    {character.name}
                  </p>
                  <p className="truncate text-[10px] uppercase tracking-[0.14em] text-stone-400">
                    {character.title}
                  </p>
                </div>
                {isSelected ? (
                  <span className="ml-auto rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-950">
                    Active
                  </span>
                ) : null}
              </div>
              {isSelectable ? (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => onUserSideChange(character.id as 'accuse' | 'advocate')}
                    className={`w-full rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] transition ${
                      isSelected
                        ? 'border-amber-100 bg-amber-100 text-stone-950 shadow-[0_12px_28px_rgba(251,191,36,0.18)]'
                        : 'border-stone-700 bg-stone-900 text-stone-300 hover:border-stone-500'
                    }`}
                  >
                    {isSelected ? 'User controlled' : 'Play this side'}
                  </button>
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-stone-800 bg-stone-900/70 px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                  Court role
                </div>
              )}
            </div>
          </article>
        )
      })}
    </section>
  )
}

export default CharacterSetup
