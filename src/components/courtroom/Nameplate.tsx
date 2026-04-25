interface NameplateProps {
  name: string
  title: string
  accentClass: string
}

function Nameplate({ name, title, accentClass }: NameplateProps) {
  return (
    <div className="flex w-full items-center justify-between gap-3 rounded-md border border-white/12 bg-black/55 px-3 py-2 backdrop-blur-sm">
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium uppercase tracking-[0.12em] text-stone-300/85">
          {title}
        </p>
        <p className="truncate text-sm font-semibold text-stone-100">{name}</p>
      </div>
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${accentClass}`} />
    </div>
  )
}

export default Nameplate
