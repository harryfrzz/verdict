export interface SetupCharacter {
  id: string
  name: string
  title: string
  imageSrc: string
  accentClass: string
}

interface CharacterSetupProps {
  characters: SetupCharacter[]
  modelAssignments: Record<string, string>
  modelOptions: string[]
  onModelChange: (characterId: string, model: string) => void
}

const characterPositions: Record<
  string,
  {
    className: string
    imageClassName: string
  }
> = {
  arbiter: {
    className: 'left-1/2 top-[7%] w-[min(21vw,15rem)] -translate-x-1/2',
    imageClassName: 'h-[min(24vh,15rem)]',
  },
  accused: {
    className: 'left-1/2 top-[43%] w-[min(20vw,14rem)] -translate-x-1/2',
    imageClassName: 'h-[min(27vh,17rem)]',
  },
  accuse: {
    className: 'right-[6%] top-[34%] w-[min(16vw,18rem)]',
    imageClassName: 'h-[min(39vh,25rem)]',
  },
  advocate: {
    className: 'left-[5%] top-[34%] w-[min(19vw,18rem)]',
    imageClassName: 'h-[min(39vh,25rem)]',
  },
  chronicle: {
    className: 'right-[24%] top-[12%] w-[min(19vw,14rem)]',
    imageClassName: 'h-[min(30vh,19rem)]',
  },
  ethos: {
    className: 'left-[24%] top-[14%] w-[min(19vw,14rem)]',
    imageClassName: 'h-[min(30vh,19rem)]',
  },
}

function CharacterSetup({
  characters,
  modelAssignments,
  modelOptions,
  onModelChange,
}: CharacterSetupProps) {
  return (
    <section className="relative h-[calc(100vh-8rem)] w-full">
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
              {character.id === 'accused' ? (
                <div className="mt-2 hidden rounded-md border border-stone-800 bg-stone-900 px-2 py-1.5 text-xs text-stone-500">
                  No LLM 
                </div>
              ) : (
                <select
                  aria-label={`${character.name} LLM`}
                  value={modelAssignments[character.id]}
                  onChange={(event) => onModelChange(character.id, event.target.value)}
                  className="mt-2 w-full cursor-pointer rounded-md border border-stone-700 bg-stone-900 px-2 py-1.5 text-xs text-stone-100 outline-none transition hover:border-stone-500 focus:border-amber-200"
                >
                  {modelOptions.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </article>
        )
      })}
    </section>
  )
}

export default CharacterSetup
