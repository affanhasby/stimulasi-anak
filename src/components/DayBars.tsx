import { weekday } from '../lib/format'
import { formatValue, type DayValue } from '../lib/recap'

/**
 * One bar per day. Green = within the norm, amber = below it, grey = no norm or today (still running).
 * A thin tick marks the day's minimum; days with nothing logged in the app show a dot, not a zero.
 */
export function DayBars({ days, timer, today, height = 96 }: { days: DayValue[]; timer: boolean; today: string; height?: number }) {
  const top = Math.max(1, ...days.map((d) => Math.max(d.value, d.target?.min ?? 0)))
  const dense = days.length > 10
  return (
    <div>
      <div className="flex items-end gap-[3px]" style={{ height }} role="img" aria-label={days.map((d) => `${d.day}: ${d.logged ? formatValue(d.value, timer) : 'tidak tercatat'}`).join(', ')}>
        {days.map((d) => {
          const t = d.target
          const judged = d.logged && d.day < today && t
          const below = judged && t.min !== undefined && d.value < t.min
          const within = judged && !below && (t.max === undefined || d.value <= t.max)
          const color = below ? 'var(--warn)' : within ? 'var(--ok)' : 'var(--ink-2)'
          return (
            <div key={d.day} className="relative flex h-full flex-1 flex-col justify-end">
              {d.logged || d.value ? (
                <div className="rounded-t-[4px] transition-[height] duration-300 ease-out" style={{ height: `${Math.max(3, (d.value / top) * 100)}%`, background: color, opacity: d.day === today ? 0.55 : 1 }} />
              ) : (
                <div className="mx-auto mb-0.5 size-1 rounded-full bg-off" />
              )}
              {t?.min !== undefined && <div className="absolute inset-x-0 h-[2px] bg-ink/60" style={{ bottom: `${(t.min / top) * 100}%` }} />}
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex gap-[3px] text-center text-[11px] text-ink-2">
        {days.map((d, i) => (
          <span key={d.day} className={`flex-1 ${d.day === today ? 'font-bold text-ink' : ''}`}>
            {dense ? (i % 5 === 4 || d.day === today ? Number(d.day.slice(8)) : '') : weekday(d.day)}
          </span>
        ))}
      </div>
      {!dense && (
        <div aria-hidden className="flex gap-[3px] text-center text-[11px] font-semibold">
          {days.map((d) => (
            <span key={d.day} className="flex-1 tabular-nums">
              {d.logged ? (timer ? (d.value / 3_600_000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) : d.value) : '–'}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
