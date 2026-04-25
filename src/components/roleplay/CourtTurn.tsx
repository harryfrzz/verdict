interface CourtTurnProps {
  name: string
  title: string
  imageSrc: string
  side: 'left' | 'right'
  text: string
  accentClass: string
  isUserTurn?: boolean
  userInput?: string
  onUserInputChange?: (value: string) => void
  onUserSubmit?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  isBusy?: boolean
}

function CourtTurn({
  name,
  title,
  imageSrc,
  side,
  text,
  accentClass,
  isUserTurn = false,
  userInput = '',
  onUserInputChange,
  onUserSubmit,
  secondaryActionLabel,
  onSecondaryAction,
  isBusy = false,
}: CourtTurnProps) {
  const wrapperPosition = side === 'left' ? 'justify-start' : 'justify-end'
  const textAlign = side === 'left' ? 'text-left items-start' : 'text-right items-end'
  const slideAnimation =
    side === 'left' ? 'animate-verdict-slide-in-left' : 'animate-verdict-slide-in-right'

  return (
    <div className={`flex min-h-[calc(100vh-8rem)] w-full items-center ${wrapperPosition}`}>
      <div className={`flex w-full max-w-[34rem] flex-col ${textAlign} ${slideAnimation}`}>
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

        <div
          className={`relative z-20 -mt-8 flex w-full flex-col gap-3 ${textAlign} animate-verdict-float-in`}
          style={{ animationDelay: '120ms' }}
        >
          <div className="rounded-md border border-white/12 bg-black/70 px-4 py-3 backdrop-blur-sm">
            <div className={`flex items-center gap-3 ${side === 'right' ? 'justify-end' : ''}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${accentClass}`} />
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-stone-400">{title}</p>
                <p className="text-base font-semibold text-stone-100">{name}</p>
              </div>
            </div>
          </div>
          {isUserTurn ? (
            <form
              className="rounded-xl w-120 border border-amber-200/45 bg-stone-50 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.42)]"
              onSubmit={(event) => {
                event.preventDefault()
                onUserSubmit?.()
              }}
            >
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Your argument
                </span>
                <div className="mt-2 flex gap-2">
                  <textarea
                    value={userInput}
                    onChange={(event) => onUserInputChange?.(event.target.value)}
                    rows={6}
                    placeholder={text}
                    className="block h-32 w-full overflow-y-auto resize-none rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm leading-6 text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-stone-950"
                  />
                  <button
                    type="button"
                    aria-label="Voice input placeholder"
                    title="Voice input"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-700 transition hover:border-stone-950 hover:text-stone-950"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <path d="M12 19v3" />
                    </svg>
                  </button>
                </div>
              </label>
              <button
                type="submit"
                disabled={isBusy || userInput.trim().length === 0}
                className="mt-3 w-full rounded-lg bg-stone-950 px-4 py-3 text-sm font-semibold text-stone-50 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
              >
                {isBusy ? 'Submitting...' : 'Submit Argument'}
              </button>
              {secondaryActionLabel && onSecondaryAction ? (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={onSecondaryAction}
                  className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-950 hover:text-stone-950 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400"
                >
                  {secondaryActionLabel}
                </button>
              ) : null}
            </form>
          ) : (
            <div className="w-full">
              <div className="rounded-md border border-white/12 bg-stone-50 px-5 py-4 text-base font-medium leading-7 text-stone-950 shadow-[0_22px_70px_rgba(0,0,0,0.36)]">
                <div className="max-h-[24rem] overflow-y-auto pr-1">
                  {text}
                </div>
              </div>
              {secondaryActionLabel && onSecondaryAction ? (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={onSecondaryAction}
                  className="mt-3 w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-950 hover:text-stone-950 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400"
                >
                  {secondaryActionLabel}
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CourtTurn
