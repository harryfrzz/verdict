interface CourtTurnProps {
  name: string
  title: string
  imageSrc: string
  side: 'left' | 'right'
  text: string
  accentClass: string
}

function CourtTurn({ name, title, imageSrc, side, text, accentClass }: CourtTurnProps) {
  const wrapperPosition = side === 'left' ? 'justify-start' : 'justify-end'
  const textAlign = side === 'left' ? 'text-left items-start' : 'text-right items-end'

  return (
    <div className={`flex min-h-[calc(100vh-8rem)] w-full items-center ${wrapperPosition}`}>
      <div className={`flex w-full max-w-[34rem] flex-col ${textAlign}`}>
        <div className="relative flex w-full justify-center">
          <div
            className={`absolute bottom-8 h-44 w-44 rounded-full blur-3xl ${
              side === 'left' ? 'left-10 bg-violet-500/28' : 'right-10 bg-red-500/28'
            }`}
          />
          <img
            className="relative z-10 h-[min(50vh,34rem)] w-full object-contain object-bottom drop-shadow-[0_28px_32px_rgba(0,0,0,0.55)]"
            src={imageSrc}
            alt={name}
          />
        </div>

        <div className={`relative z-20 -mt-8 flex w-full flex-col gap-3 ${textAlign}`}>
          <div className="rounded-md border border-white/12 bg-black/70 px-4 py-3 backdrop-blur-sm">
            <div className={`flex items-center gap-3 ${side === 'right' ? 'justify-end' : ''}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${accentClass}`} />
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-stone-400">{title}</p>
                <p className="text-base font-semibold text-stone-100">{name}</p>
              </div>
            </div>
          </div>
          <div className="rounded-md border border-white/12 bg-stone-50 px-5 py-4 text-base font-medium leading-7 text-stone-950 shadow-[0_22px_70px_rgba(0,0,0,0.36)]">
            {text}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CourtTurn
