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
    className: 'left-10 top-[260px] w-64',
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

        return (
          <article
            key={character.id}
            className={`group absolute flex flex-col items-center animate-verdict-float-in ${position.className}`}
            style={{ animationDelay: `${index * 55}ms` }}
          >
            <div className="relative flex w-full items-end justify-center">
              <img
                className={`relative z-10 w-full object-contain object-bottom drop-shadow-[0_24px_28px_rgba(0,0,0,0.56)] transition duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-[1.045] ${position.imageClassName}`}
                src={character.imageSrc}
                alt={character.name}
              />
            </div>

            <div className="relative z-20 -mt-2 w-full rounded-md border border-stone-700/90 bg-stone-950/96 px-3 py-2 shadow-[0_18px_38px_rgba(0,0,0,0.42)] transition duration-200 group-hover:border-stone-500">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_14px_currentColor] ${character.accentClass}`}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-100">{character.name}</p>
                  <p className="truncate text-[10px] uppercase tracking-[0.14em] text-stone-400">
                    {character.title}
                  </p>
                </div>
              </div>
              {character.id === 'accuse' || character.id === 'advocate' ? (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => onUserSideChange(character.id as 'accuse' | 'advocate')}
                    className={`w-full rounded-md border px-2 py-1.5 text-xs font-medium transition ${
                      userSide === character.id
                        ? 'border-amber-200 bg-amber-200 text-stone-950'
                        : 'border-stone-700 bg-stone-900 text-stone-300 hover:border-stone-500'
                    }`}
                  >
                    {userSide === character.id ? 'User controlled' : 'Play this side'}
                  </button>
                </div>
              ) : null}
            </div>
          </article>
        )
      })}
    </section>
  )
}

export default CharacterSetup
