interface TranscriptEntryProps {
  speaker: string
  title: string
  content: string
  accentClass: string
}

function TranscriptEntry({ speaker, title, content, accentClass }: TranscriptEntryProps) {
  return (
    <article className="rounded-md border border-white/10 bg-black/58 px-4 py-3 backdrop-blur-sm">
      <div className="mb-2 flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${accentClass}`} />
        <p className="text-sm font-semibold text-stone-100">{speaker}</p>
        <p className="text-[11px] uppercase tracking-[0.16em] text-stone-400">{title}</p>
      </div>
      <p className="text-sm leading-6 text-stone-300">{content}</p>
    </article>
  )
}

export default TranscriptEntry
