import Nameplate from './Nameplate'

interface CharacterFigureProps {
  name: string
  title: string
  imageSrc: string
  accentClass: string
  alignment: 'left' | 'right'
  line?: string
}

function CharacterFigure({
  name,
  title,
  imageSrc,
  accentClass,
  alignment,
  line,
}: CharacterFigureProps) {
  const bubbleAlignment =
    alignment === 'left'
      ? 'items-start text-left before:left-8'
      : 'items-end text-right before:right-8'

  return (
    <div className="flex w-full max-w-[15rem] flex-col gap-3">
      {line ? (
        <div
          className={`relative flex min-h-24 rounded-md border border-white/12 bg-black/65 px-4 py-3 text-sm leading-6 text-stone-100 shadow-[0_18px_40px_rgba(0,0,0,0.28)] before:absolute before:top-full before:h-3 before:w-3 before:rotate-45 before:border-b before:border-r before:border-white/12 before:bg-black/65 ${bubbleAlignment}`}
        >
          {line}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-md border border-white/10 bg-black/20 shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
        <img className="h-[19rem] w-full object-contain object-bottom" src={imageSrc} alt={name} />
      </div>
      <Nameplate name={name} title={title} accentClass={accentClass} />
    </div>
  )
}

export default CharacterFigure
