interface TensionMeterProps {
  value: number
}

function TensionMeter({ value }: TensionMeterProps) {
  return (
    <section className="rounded-md border border-white/10 bg-black/50 p-4 backdrop-blur-md">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">Tension Meter</p>
          <p className="mt-1 text-lg font-semibold text-stone-100">{value}%</p>
        </div>
        <p className="max-w-36 text-right text-xs leading-5 text-stone-400">
          Cross-examination pressure rises as claims collide.
        </p>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-red-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </section>
  )
}

export default TensionMeter
