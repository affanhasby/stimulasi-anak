import { useMemo, useState } from 'react'
import { DomainMark } from '../components/Plate'
import { IconBack, IconCheck, IconChevron } from '../components/icons'
import { Screen, Section } from '../components/ui'
import { sourceLabel } from '../lib/content'
import { addDays, addMonths, ageInMonths, developmentalBirth, editableFrom, type IsoDate } from '../lib/date'
import type { Child } from '../lib/db'
import { longDate, MONTHS } from '../lib/format'

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const weekdayLong = (iso: IsoDate) => DAY_NAMES[new Date(`${iso}T00:00:00Z`).getUTCDay()]
import { useToday } from '../lib/hooks'
import { useActions, useChildRows } from '../lib/store'
import { ACTIVITIES, dayAchieved, DOMAIN_ORDER, DOMAINS, GENERAL_RULES, gridMonth } from '../lib/stimulation'

const DOW = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

function Calendar({ month, checks, today, onMonth, selected, from, onPick }: { month: IsoDate; checks: { day: IsoDate }[]; today: IsoDate; onMonth: (m: IsoDate) => void; selected: IsoDate; from: IsoDate; onPick: (d: IsoDate) => void }) {
  const [y, m] = month.split('-').map(Number)
  const first = `${y}-${String(m).padStart(2, '0')}-01`
  const lead = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const anyDay = new Set(checks.map((c) => c.day))
  return (
    <div className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" aria-label="Bulan sebelumnya" onClick={() => onMonth(addMonths(first, -1))} className="grid size-11 place-items-center rounded-full active:bg-ground">
          <IconBack />
        </button>
        <p className="text-base font-bold">
          {MONTHS[m - 1]} {y}
        </p>
        <button
          type="button"
          aria-label="Bulan berikutnya"
          disabled={addMonths(first, 1) > today}
          onClick={() => onMonth(addMonths(first, 1))}
          className="grid size-11 place-items-center rounded-full active:bg-ground disabled:opacity-30"
        >
          <IconChevron />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {DOW.map((d) => (
          <span key={d} className="pb-1 text-xs font-semibold text-ink-2">
            {d}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const day = addDays(first, i)
          const achieved = dayAchieved(day, checks as never)
          const some = anyDay.has(day)
          const pickable = day >= from && day <= today
          return (
            <button
              key={day}
              type="button"
              disabled={!pickable}
              onClick={() => onPick(day)}
              aria-pressed={day === selected}
              className="grid h-10 place-items-center disabled:cursor-default"
              aria-label={`${i + 1}${achieved ? ', tercapai' : some ? ', ada kegiatan' : ''}${pickable ? ', ketuk untuk melihat atau mengubah' : ''}`}
            >
              <span
                className={`grid size-8 place-items-center rounded-full text-[13px] font-semibold transition-shadow ${
                  achieved ? 'bg-ok text-panel' : some ? 'bg-ok/20 text-ink' : !pickable ? 'text-ink-2/50' : 'text-ink'
                } ${day === selected ? 'ring-2 ring-ink ring-offset-2 ring-offset-panel' : day === today ? 'ring-1 ring-ink/40' : ''}`}
              >
                {i + 1}
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[13px] text-ink-2">
        <span className="flex items-center gap-1.5"><i className="size-3 rounded-full bg-ok" /> Tercapai (1 utama + 1 lainnya)</span>
        <span className="flex items-center gap-1.5"><i className="size-3 rounded-full bg-ok/20" /> Ada kegiatan</span>
      </p>
    </div>
  )
}

export function Stimulasi({ child }: { child: Child }) {
  const today = useToday()
  const rows = useChildRows(child.id)
  const act = useActions()
  const [month, setMonth] = useState(today.slice(0, 8) + '01')
  const [open, setOpen] = useState<string | null>(null)
  // Ticks can be added or undone for any day since the child was added to the app.
  const from = editableFrom(child)
  const [sel, setSel] = useState<IsoDate>(today)
  const checks = useMemo(() => rows?.checks ?? [], [rows])
  const devBirth = developmentalBirth(child.birth_date, sel, child.gestational_weeks)
  const months = Math.min(ageInMonths(devBirth, sel), 71)
  const band = ACTIVITIES.filter((a) => a.start <= months && months < a.end)
  const bandLabel = `${gridMonth(months)} bulan`
  const doneToday = new Set(checks.filter((c) => c.day === sel).map((c) => c.activity_id))
  const isToday = sel === today

  const weekAgo = addDays(today, -6)
  const perDomain = DOMAIN_ORDER.map((d) => ({ d, n: checks.filter((c) => c.day >= weekAgo && ACTIVITIES.find((a) => a.id === c.activity_id)?.domain === d).length }))
  const max = Math.max(1, ...perDomain.map((x) => x.n))
  const rules = GENERAL_RULES.filter((r) => !r.applies_months || (months >= r.applies_months[0] && months < r.applies_months[1]))

  return (
    <Screen title="Stimulasi">
      <Section
        id="kegiatan"
        title={isToday ? `Semua kegiatan usia ${bandLabel}` : `Kegiatan ${weekdayLong(sel)}, ${longDate(sel)}`}
        note={
          isToday ? (
            'Centang kegiatan yang dilakukan hari ini, termasuk yang tidak ada di daftar Beranda. Hari sebelumnya bisa diisi lewat kalender di bawah.'
          ) : (
            <>
              Centang yang sudah dilakukan pada hari itu.{' '}
              <button type="button" onClick={() => setSel(today)} className="font-semibold text-ink underline underline-offset-4">
                Kembali ke hari ini
              </button>
            </>
          )
        }
      >
        {band.map((a) => {
          const done = doneToday.has(a.id)
          const expanded = open === a.id
          return (
            <div key={a.id} className="border-t border-line first:border-t-0">
              <div className="flex min-h-[58px] items-center gap-2.5 py-1.5 pr-1 pl-3.5">
                <DomainMark domain={a.domain} />
                <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : a.id)} className="flex min-w-0 flex-1 items-center gap-0.5 py-1 text-left">
                  <span className="min-w-0 flex-1">
                    <span className="block text-base leading-snug font-semibold">{a.title}</span>
                    <span className="block text-[13px] text-ink-2">
                      {a.frequency === 'daily_core' ? 'Utama · ' : ''}
                      {DOMAINS[a.domain]} · {a.minutes} mnt
                    </span>
                  </span>
                  <span className={`shrink-0 text-ink-2 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>
                    <IconChevron size={16} />
                  </span>
                </button>
                <button type="button" aria-pressed={done} aria-label={`${done ? 'Batalkan' : isToday ? 'Tandai selesai hari ini' : `Tandai selesai ${longDate(sel)}`}: ${a.title}`} onClick={() => act.toggleCheck(child.id, sel, a.id)} className="grid size-12 shrink-0 place-items-center">
                  <span className={`grid size-[34px] place-items-center rounded-full border-[2.5px] transition-colors duration-200 ${done ? 'border-ink bg-ink text-panel' : 'border-ink-2/80 text-transparent'}`}>
                    <IconCheck />
                  </span>
                </button>
              </div>
              {expanded && (
                <div className="px-3.5 pb-3.5 pl-9 text-[15px] leading-relaxed">
                  <p>{a.how}</p>
                  {a.note && <p className="mt-1.5 text-[13px] text-ink-2">{a.note}</p>}
                  <p className="mt-1.5 text-[13px] text-ink-2">Sumber: {sourceLabel(a.source, a.page)}</p>
                </div>
              )}
            </div>
          )
        })}
      </Section>

      <Section title="Kalender" note="Ketuk tanggal untuk melihat atau mengisi kegiatan hari itu.">
        <Calendar month={month} checks={checks} today={today} onMonth={setMonth} selected={sel} from={from} onPick={(d) => (setSel(d), setOpen(null), document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }))} />
      </Section>

      <Section title="7 hari terakhir per domain" note="Domain yang jarang dicentang akan didahulukan di daftar harian.">
        <ul className="p-4">
          {perDomain.map(({ d, n }) => (
            <li key={d} className="flex items-center gap-2.5 py-1.5">
              <DomainMark domain={d} />
              <span className="w-[120px] shrink-0 text-[15px]">{DOMAINS[d]}</span>
              <span className="h-3 flex-1 overflow-hidden rounded-full bg-off">
                <span className="block h-full rounded-full" style={{ width: `${(n / max) * 100}%`, background: `var(--color-${d})` }} />
              </span>
              <span className="w-6 text-right text-[15px] font-bold">{n}</span>
            </li>
          ))}
        </ul>
      </Section>

      {rules.length > 0 && (
        <Section title="Tips">
          <ul className="space-y-2.5 p-4 text-[15px] leading-relaxed">
            {rules.map((r) => (
              <li key={r.id}>
                {r.text} <span className="text-[13px] text-ink-2">({sourceLabel(r.source, r.page)})</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </Screen>
  )
}
