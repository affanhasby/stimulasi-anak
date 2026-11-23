import { useEffect, useMemo, useState } from 'react'
import { DISCLAIMER } from '../components/DangerSheet'
import { BrandPlate } from '../components/Plate'
import { PushCta } from '../components/PushCta'
import { CallButtons } from '../components/CallButtons'
import { InstallBanner } from '../components/Install'
import { isStandalone } from '../lib/install'
import { GrowthChart } from '../components/GrowthChart'
import { ageMonthsExact } from '../lib/growth'
import { latestStatus, seriesOf, weighDue } from './Pertumbuhan'
import { DomainMark, MiniPlate, Plate, type SectorState } from '../components/Plate'
import { IconAlert, IconBell, IconSettings, IconCheck, IconChevron, IconSyringe } from '../components/icons'
import { Button, Screen, Sheet } from '../components/ui'
import { activeAlerts } from '../lib/alerts'
import { sourceLabel } from '../lib/content'
import { clockTime, formatAgoShort, formatTileDuration, isTimer, shortLabel, todayStats, visibleCounters, type CounterDef } from '../lib/counters'
import { addDays, ageInMonths, daysBetween, developmentalBirth, todayIso, type IsoDate } from '../lib/date'
import type { Child, EventRow } from '../lib/db'
import { ageText, shortDate, weekday } from '../lib/format'
import { useLongPress, useNow } from '../lib/hooks'
import { go } from '../lib/nav'
import { useActions, useChildRows, useSettings, useUnreadCount } from '../lib/store'
import { ACTIVITIES, dailyPlan, dayAchieved, DOMAIN_ORDER, DOMAINS, todaysPicks, type ActivityCheck, type Domain, type PlannedActivity } from '../lib/stimulation'
import { doseName, vaccineSchedule, type ScheduledDose } from '../lib/vaccines'
import { missed, nextVisit } from '../lib/visit'

export const STATUS: Record<string, { text: string; tone: string }> = {
  late: { text: 'Lewat jadwal', tone: 'border border-warn text-warn' },
  ending_soon: { text: 'Mendekati batas', tone: 'bg-warn text-panel' },
  due: { text: 'Bisa sekarang', tone: 'bg-ok text-panel' },
  upcoming: { text: 'Akan datang', tone: 'bg-off text-ink' },
  done: { text: 'Sudah', tone: 'bg-ink text-ground' },
  waiting: { text: 'Menunggu', tone: 'bg-off text-ink' },
  school: { text: 'Di sekolah', tone: 'bg-off text-ink' },
  conditional: { text: 'Bila berlaku', tone: 'bg-off text-ink' },
  skipped: { text: 'Tidak diberikan', tone: 'bg-off text-ink' },
}
const CHECK_TONE = { aman: 'var(--ok)', perhatian: 'var(--warn)', bahaya: 'var(--color-danger)' }
const CHECK_TEXT = { aman: 'Kondisi hari ini aman', perhatian: 'Perlu perhatian', bahaya: 'Ada tanda bahaya' }

/** Late but still within the source's maximum age reads as catch-up, never as failure. */
export const chipFor = (d: ScheduledDose, today: IsoDate) =>
  d.status === 'late' && d.maxUntil && today <= d.maxUntil ? { text: 'Bisa dikejar', tone: STATUS.late.tone } : STATUS[d.status]

export function plateStates(checks: ActivityCheck[], day: IsoDate, shown?: PlannedActivity[]) {
  const done = new Set(checks.filter((c) => c.day === day).map((c) => ACTIVITIES.find((a) => a.id === c.activity_id)?.domain))
  const planned = new Set(shown?.map((a) => a.domain))
  return Object.fromEntries(DOMAIN_ORDER.map((d) => [d, done.has(d) ? 'done' : planned.has(d) ? 'todo' : 'off'])) as Record<Domain, SectorState>
}

/** Today's list for a child: core + rotating picks (minus swapped-out ones) + challenge. */
export function useTodayList(child: Child, today: IsoDate, checks: ActivityCheck[]) {
  const [replaced, setReplaced] = useState<string[]>([])
  const devBirth = developmentalBirth(child.birth_date, today, child.gestational_weeks)
  const plan = useMemo(() => dailyPlan(devBirth, today, child.id, checks), [devBirth, today, child.id, checks])
  const picks = todaysPicks({ ...plan, rotating: plan.rotating.filter((a) => !replaced.includes(a.id)) })
  const list: PlannedActivity[] = [...plan.core, ...picks, ...(plan.challenge ? [plan.challenge] : [])]
  return { devBirth, plan, list, swap: (id: string) => setReplaced((r) => [...r, id]) }
}

/**
 * A running total on a narrow tile, always on one line: big numbers with small units ("2j 15m"),
 * and from 10 hours on just the hours, so five tiles side by side never wrap.
 */
function TileDuration({ ms }: { ms: number }) {
  const m = Math.floor(ms / 60_000)
  const h = Math.floor(m / 60)
  const unit = 'text-xs font-bold'
  if (h === 0)
    return (
      <span className="text-2xl leading-none font-extrabold whitespace-nowrap">
        {m}
        <span className={unit}>m</span>
      </span>
    )
  return (
    <span className="text-base leading-none font-extrabold whitespace-nowrap">
      {h}
      <span className={unit}>j</span>
      {h < 10 && (
        <span className="ml-[3px]">
          {m % 60}
          <span className={unit}>m</span>
        </span>
      )}
    </span>
  )
}

function CounterTile({ c, events, dayStart, now, onTap }: { c: CounterDef; events: EventRow[]; dayStart: number; now: number; onTap: () => void }) {
  const timer = isTimer(c)
  const s = todayStats(events, c.id, dayStart, now)
  const value = timer ? formatTileDuration(s.durationMs) : String(s.count)
  const label = shortLabel(c)
  const long = useLongPress(() => go(`catatan/${c.id}`))
  return (
    <button
      type="button"
      {...long.handlers}
      onClick={() => !long.fired && onTap()}
      aria-label={`${label}: ${value} hari ini. ${
        s.running ? `Berjalan sejak ${clockTime(new Date(s.running.start_at))}, ketuk untuk berhenti.` : timer ? 'Ketuk untuk mulai.' : 'Ketuk untuk mencatat.'
      } Tekan lama untuk riwayat.`}
      className={`flex h-[88px] flex-col justify-between rounded-2xl px-[7px] py-2.5 text-left transition-transform duration-150 active:scale-[.96] ${
        s.running ? 'bg-tile-active text-on-tile ring-2 ring-on-tile ring-inset' : 'bg-tile text-on-tile'
      }`}
    >
      <span className="truncate text-[11.5px] font-semibold">{label}</span>
      {timer ? <TileDuration ms={s.durationMs} /> : <span className="text-2xl leading-none font-extrabold">{value}</span>}
      <span className="truncate text-xs opacity-75">
        {s.running ? clockTime(new Date(s.running.start_at)) : s.lastAgoMs === null ? (timer ? 'mulai' : 'belum') : formatAgoShort(s.lastAgoMs)}
      </span>
    </button>
  )
}

export function Beranda({ child }: { child: Child }) {
  const [now, refreshNow] = useNow()
  const today = todayIso(now)
  const rows = useChildRows(child.id)
  const settings = useSettings()
  const act = useActions()
  const [open, setOpen] = useState<string | null>(null)
  const [snack, setSnack] = useState<{ id: string; text: string; resume?: boolean; counter?: CounterDef } | null>(null)
  const [showList, setShowList] = useState(false)
  const [tempOpen, setTempOpen] = useState(false)
  const [celsius, setCelsius] = useState('36.8')

  const checks = useMemo(() => rows?.checks ?? [], [rows])
  const events = rows?.events ?? []
  const { devBirth, plan, list, swap } = useTodayList(child, today, checks)
  const doneToday = new Set(checks.filter((c) => c.day === today).map((c) => c.activity_id))
  const doneCount = list.filter((a) => doneToday.has(a.id)).length
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))

  const achieved = dayAchieved(today, checks)
  const allDone = list.length > 0 && doneCount === list.length
  const tomorrowPlan = dailyPlan(devBirth, addDays(today, 1), child.id, checks)
  const tomorrow = [...tomorrowPlan.core, ...todaysPicks(tomorrowPlan)]
  const check = rows?.health.find((h) => h.day === today)
  // The moment the last activity is ticked, bring the celebration into view.
  useEffect(() => {
    if (allDone) document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [allDone])
  const unread = useUnreadCount(child.id)
  const measurements = rows?.measurements ?? []
  const growth = latestStatus(child, measurements)
  const ageNow = Math.floor(ageMonthsExact(child.birth_date, today))
  const coreDone = plan.core.some((a) => doneToday.has(a.id))
  const rotDone = list.some((a) => a.kind !== 'core' && doneToday.has(a.id))
  const hint = achieved ? 'Target hari ini tercapai' : !coreDone && !rotDone ? 'Target: 1 utama + 1 lainnya' : !coreDone ? 'Tinggal 1 kegiatan utama' : 'Tinggal 1 kegiatan lain'

  const doses = vaccineSchedule(child, rows?.vaccines ?? [], today)
  const visit = nextVisit(doses, today)
  // Overdue doses a health worker must advise on live apart from the visit, but must stay visible from home.
  const overdue = doses.filter((d) => d.status === 'late' && missed(d, today)).length
  const counters = visibleCounters(ageInMonths(child.birth_date, today), settings?.enabled_counters).slice(0, 5)
  const dayStart = new Date(now).setHours(0, 0, 0, 0)

  const enabled = new Set(visibleCounters(ageInMonths(child.birth_date, today), settings?.enabled_counters).map((c) => c.id))
  const dismissed = new Set((rows?.alertLogs ?? []).filter((l) => l.day === today).map((l) => l.alert_id))
  // Evening catch-up: from the chosen recap time until it is filled in (or dismissed) for today.
  const clock = `${String(new Date(now).getHours()).padStart(2, '0')}:${String(new Date(now).getMinutes()).padStart(2, '0')}`
  const catchUp = !!settings?.log_nudges && counters.length > 0 && clock >= (settings.recap_time ?? '20:00') && !(rows?.alertLogs ?? []).some((l) => l.alert_id === 'RECAP' && l.day === today)
  const alerts = activeAlerts(events, child.birth_date, now, dayStart, enabled).filter((a) => !dismissed.has(a.id))
  // A long gap in the feeding log is usually a forgotten tap: ask, don't alarm (the medical alert needs active logging).
  const nurse = counters.find((c) => c.id === 'NURSE')
  const lastFeed = events.filter((e) => (e.counter_id === 'NURSE' || e.counter_id === 'BOTTLE') && !e.value?.susulan).at(-1)
  const feedGap = lastFeed ? now - Date.parse(lastFeed.start_at) : null
  const staleFeed =
    !!nurse && daysBetween(child.birth_date, today) <= 182 && feedGap !== null && feedGap >= 4 * 3_600_000 && !catchUp && !alerts.some((a) => a.id === 'NURSE-A1') && !dismissed.has('STALE-FEED')

  useEffect(() => {
    if (!snack) return
    // Longer when the snackbar offers optional detail chips (colour, ml...).
    const t = setTimeout(() => setSnack(null), snack.counter?.choice?.options ? 8000 : 5000)
    return () => clearTimeout(t)
  }, [snack])

  const tapCounter = async (c: CounterDef) => {
    const at = new Date()
    refreshNow()
    if (c.choice?.key === 'celsius') {
      setTempOpen(true)
      return
    }
    const timer = isTimer(c)
    const running = events.find((e) => e.counter_id === c.id && e.end_at === null)
    if (timer && running) {
      await act.patchEvent(running.id, { end_at: at.toISOString() })
      setSnack({ id: running.id, text: `${shortLabel(c)} selesai ${clockTime(at)}`, resume: true })
      return
    }
    const id = crypto.randomUUID()
    await act.addEvent({ id, child_id: child.id, counter_id: c.id, start_at: at.toISOString(), end_at: timer ? null : at.toISOString(), value: null })
    setSnack({ id, counter: c, text: timer ? `${shortLabel(c)} mulai ${clockTime(at)}` : `${shortLabel(c)} dicatat ${clockTime(at)}` })
  }

  const saveTemp = async () => {
    const v = Number(celsius.replace(',', '.'))
    if (!(v >= 35 && v <= 41)) return
    const at = new Date().toISOString()
    const id = crypto.randomUUID()
    await act.addEvent({ id, child_id: child.id, counter_id: 'TEMP', start_at: at, end_at: at, value: { celsius: Math.round(v * 10) / 10 } })
    setTempOpen(false)
    setSnack({ id, text: `Suhu ${v.toFixed(1)} °C dicatat` })
  }

  // Undo a stop by resuming the timer; undo anything else by removing the entry.
  const undo = async () => {
    if (!snack) return
    if (snack.resume) await act.patchEvent(snack.id, { end_at: null })
    else await act.removeEvent(snack.id)
    setSnack(null)
  }

  return (
    <Screen bottom={counters.length ? 'dock' : 'tabs'}>
      <header className="flex items-center justify-between gap-3 px-[18px] pt-[max(14px,var(--top-guard))] pb-1">
        <button type="button" onClick={() => go('lainnya/profil')} aria-label={`Profil ${child.nickname}`} className="min-w-0 text-left active:opacity-70">
          <h1 className="truncate text-xl leading-tight font-extrabold">{child.nickname}</h1>
          <p className="text-sm text-ink-2">
            {ageText(child.birth_date, today)}
            {devBirth !== child.birth_date && <> · usia koreksi {ageText(devBirth, today)}</>}
          </p>
        </button>
        <div className="-mr-2 flex shrink-0 items-center">
          <button type="button" onClick={() => go('notifikasi')} aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ''}`} className="relative grid size-11 place-items-center rounded-full active:bg-off">
            <IconBell />
            {unread > 0 && (
              <span className="absolute top-0 -right-0.5 grid min-w-5 animate-[pop_300ms_ease-out] place-items-center rounded-full bg-ink px-1 text-xs leading-5 font-extrabold text-ground ring-2 ring-ground">{unread}</span>
            )}
          </button>
          <button type="button" onClick={() => go('lainnya')} aria-label="Pengaturan" className="grid size-11 place-items-center rounded-full active:bg-off">
            <IconSettings />
          </button>
        </div>
      </header>

      {/* Daily check and the emergency path side by side: the red tile is the only red on a calm day. */}
      {check?.result !== 'bahaya' && (
      <div className="mx-3 mt-2 flex gap-2">
      <button
        type="button"
        onClick={() => go('cek-kondisi')}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-panel px-3.5 py-3 text-left active:scale-[.99] active:bg-ground"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full text-ground" style={{ background: check ? CHECK_TONE[check.result] : 'var(--ink)' }}>
          {check?.result === 'aman' ? <IconCheck size={20} /> : <IconAlert />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold">{check ? CHECK_TEXT[check.result] : 'Cek kondisi hari ini'}</span>
          <span className="block text-[13px] text-ink-2">{check ? `Dicek ${clockTime(new Date(check.checked_at))}` : 'Sekitar 30 detik'}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => go('tanda-bahaya')}
        className="flex w-[92px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl bg-danger px-2 py-2.5 text-center text-[13px] leading-tight font-bold text-white active:scale-[.97]"
      >
        <IconAlert />
        Tanda bahaya
      </button>
      </div>
      )}
      {check?.result === 'bahaya' && (
        <div role="alert" className="mx-3 mt-2 rounded-2xl border-2 border-danger bg-panel p-3.5">
          <p className="text-[15px] leading-snug font-bold">Segera bawa {child.nickname} ke fasilitas kesehatan terdekat.</p>
          <p className="mt-0.5 text-[13px] text-ink-2">
            Satu tanda bahaya saja sudah cukup (Buku KIA 2021).{' '}
            <button type="button" onClick={() => go('cek-kondisi')} className="font-semibold text-ink underline underline-offset-4">
              Lihat hasil cek
            </button>
          </p>
          <div className="mt-2.5">
            <CallButtons compact />
          </div>
        </div>
      )}

      {catchUp && (
        <button
          type="button"
          onClick={() => go('isi')}
          className="mx-3 mt-2 flex w-[calc(100%-24px)] animate-[rise_420ms_cubic-bezier(.22,1,.36,1)] items-center gap-3 rounded-2xl bg-panel px-3.5 py-3 text-left active:scale-[.99] active:bg-ground"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-lg font-extrabold text-ground">+</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold">Ada yang lupa dicatat hari ini?</span>
            <span className="block text-[13px] text-ink-2">Tambahkan BAB, pipis, atau menyusu yang terlewat</span>
          </span>
          <IconChevron size={16} />
        </button>
      )}

      {isStandalone() ? <PushCta card /> : <InstallBanner />}

      {staleFeed && (
        <section className="mx-3 mt-2 animate-[rise_420ms_cubic-bezier(.22,1,.36,1)] rounded-2xl bg-panel p-3.5">
          <p className="text-[15px] leading-snug font-bold">Catatan menyusu terakhir {formatAgoShort(feedGap!)}. Sudah menyusu?</p>
          <p className="mt-0.5 text-[13px] text-ink-2">Kalau lupa dicatat, tambahkan sekarang supaya rekapnya tepat.</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button type="button" onClick={() => tapCounter(nurse!)} className="min-h-11 rounded-full bg-ink px-4 text-sm font-bold text-ground active:scale-[.97]">
              Catat menyusu sekarang
            </button>
            <button type="button" onClick={() => go('isi')} className="min-h-11 rounded-full border border-line px-4 text-sm font-semibold active:scale-[.97]">
              Isi yang terlewat
            </button>
            <button type="button" onClick={() => act.dismissAlert(child.id, 'STALE-FEED', today)} className="min-h-11 px-2 text-sm font-semibold text-ink-2">
              Nanti
            </button>
          </div>
        </section>
      )}

      {alerts.slice(0, 2).map((a) => (
        <section key={a.id} role="alert" className="mx-3 mt-2 rounded-2xl border-2 border-current bg-panel p-3.5" style={{ color: a.level === 'segera' ? 'var(--late)' : a.level === 'periksa' ? 'var(--warn)' : 'var(--ink-2)' }}>
          <p className="flex items-start gap-2 text-[15px] leading-snug font-bold">
            <IconAlert />
            <span className="text-ink">{a.text}</span>
          </p>
          <p className="mt-1.5 pl-8 text-[13px] text-ink-2">
            Sumber: {sourceLabel(a.source, a.page)}. Bukan diagnosis; bila ragu, hubungi bidan atau dokter.
          </p>
          <div className="mt-2.5 flex gap-2 pl-8">
            {a.level === 'segera' && (
              <button type="button" onClick={() => go('cek-kondisi')} className="min-h-11 rounded-full bg-danger px-4 text-sm font-bold text-white">
                Cek tanda bahaya
              </button>
            )}
            <button type="button" onClick={() => act.dismissAlert(child.id, a.id, today)} className="min-h-11 rounded-full border border-line px-4 text-sm font-semibold text-ink">
              Mengerti
            </button>
          </div>
        </section>
      ))}

      {allDone ? (
        <section aria-labelledby="stim-h" className="mx-3 mt-2.5 animate-[rise_420ms_cubic-bezier(.22,1,.36,1)] rounded-3xl bg-panel p-5 text-center">
          <div className="mx-auto w-fit animate-[pop_520ms_cubic-bezier(.22,1,.36,1)]">
            <BrandPlate size={112} />
          </div>
          <h2 id="stim-h" className="mt-3 text-2xl leading-tight font-extrabold text-balance">
            {check?.result === 'bahaya' ? 'Stimulasi hari ini selesai' : 'Hebat! Semua stimulasi hari ini selesai'}
          </h2>
          <p className="mt-1.5 text-[15px] text-ink-2">
            {list.length} kegiatan untuk {child.nickname} sudah dilakukan. Sampai jumpa besok.
          </p>
          <div className="mt-4 rounded-2xl bg-ground p-3.5 text-left">
            <p className="text-[13px] font-bold text-ink-2">Besok</p>
            <ul className="mt-1.5 space-y-1.5">
              {tomorrow.map((a) => (
                <li key={a.id} className="flex items-center gap-2.5 text-[15px]">
                  <DomainMark domain={a.domain} />
                  <span className="flex-1">{a.title}</span>
                  {!list.some((t) => t.id === a.id) && <span className="rounded bg-ink px-1.5 py-0.5 text-xs font-bold text-ground">Baru</span>}
                </li>
              ))}
            </ul>
          </div>
          <button type="button" aria-expanded={showList} onClick={() => setShowList(!showList)} className="mt-3 min-h-11 text-[15px] font-semibold text-ink-2 underline underline-offset-4">
            {showList ? 'Sembunyikan daftar hari ini' : 'Lihat daftar hari ini'}
          </button>
        </section>
      ) : (
        <section aria-labelledby="stim-h" className="flex items-center gap-4 px-[18px] pt-2 pb-3">
        <Plate states={plateStates(checks, today, list)} achieved={achieved} />
        <div className="min-w-0">
          <h2 id="stim-h" className="text-[15px] font-semibold text-ink-2">
            Stimulasi hari ini
          </h2>
          <p className="text-[40px] leading-[1.05] font-extrabold">
            {doneCount} <span className="text-lg font-semibold text-ink-2">dari {list.length}</span>
          </p>
          <p className="mt-0.5 text-[13px] leading-snug text-ink-2">{hint}</p>
          {/* Seven days share the width: on a 360 px phone the plates shrink a little instead of spilling out. */}
          <ol className="mt-2.5 flex gap-0.5" aria-label="Tujuh hari terakhir">
            {week.map((d) => (
              <li key={d} className={`flex min-w-0 flex-1 flex-col items-center text-[11px] [&>svg]:h-auto [&>svg]:w-full [&>svg]:max-w-6 ${d === today ? 'font-extrabold text-ink' : 'text-ink-2'}`}>
                <MiniPlate states={plateStates(checks, d)} achieved={dayAchieved(d, checks)} />
                <span>{d === today ? 'Ini' : weekday(d)}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
      )}

      {(!allDone || showList) && (
      <ul className="mx-3 mt-2.5 overflow-hidden rounded-2xl bg-panel">
        {list.map((a) => {
          const done = doneToday.has(a.id)
          const expanded = open === a.id
          return (
            <li key={a.id} className="border-t border-line first:border-t-0">
              <div className="flex min-h-[58px] items-center gap-2.5 py-1.5 pr-1 pl-3.5">
                <DomainMark domain={a.domain} />
                <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : a.id)} className="flex min-w-0 flex-1 items-center gap-0.5 py-1 text-left">
                  <span className="min-w-0 flex-1">
                    <span className={`block text-base leading-snug font-semibold ${done ? 'text-ink-2' : ''}`}>{a.title}</span>
                    <span className="block text-[13px] text-ink-2">
                      {a.kind === 'core' ? 'Utama · ' : a.kind === 'challenge' ? 'Tantangan · ' : ''}
                      {DOMAINS[a.domain]} · {a.minutes} mnt
                    </span>
                  </span>
                  <span className={`shrink-0 text-ink-2 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>
                    <IconChevron size={16} />
                  </span>
                </button>
                <button
                  type="button"
                  aria-pressed={done}
                  aria-label={`${done ? 'Batalkan' : 'Tandai selesai'}: ${a.title}`}
                  onClick={() => act.toggleCheck(child.id, today, a.id)}
                  className="grid size-12 shrink-0 place-items-center"
                >
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
                  {a.kind === 'rotating' && (
                    <button
                      type="button"
                      onClick={() => {
                        swap(a.id)
                        setOpen(null)
                      }}
                      className="mt-2.5 min-h-11 rounded-full border border-line px-4 text-sm font-semibold active:bg-ground"
                    >
                      Ganti kegiatan lain
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      )}

      <button type="button" onClick={() => go('pertumbuhan')} className="mx-3 mt-2.5 block w-[calc(100%-24px)] rounded-2xl bg-panel p-3.5 text-left active:bg-ground">
        <span className="flex items-center justify-between">
          <span className="text-[15px] font-bold">Pertumbuhan</span>
          <IconChevron size={16} />
        </span>
        {growth.weight || growth.length ? (
          <>
            {!child.sex ? (
              <span className="mt-1 block text-[13px] font-semibold text-warn">Pilih jenis kelamin {child.nickname} untuk status yang tepat ›</span>
            ) : (
            <span className="mt-2 flex flex-wrap gap-1.5">
              {[growth.weight, growth.length].map(
                (g) =>
                  g && (
                    <span key={g.status.label} className={`rounded-md px-2 py-1 text-xs font-bold ${g.status.level === 'ok' ? 'bg-ok text-panel' : g.status.level === 'watch' ? 'border border-warn text-warn' : 'bg-warn text-panel'}`}>
                      {g.status.label}
                    </span>
                  ),
              )}
            </span>
            )}
            <GrowthChart ind="wfa" sex={child.sex ?? 'M'} points={seriesOf(child, measurements, 'wfa')} fromMonth={Math.max(0, ageNow - 6)} toMonth={Math.min(60, ageNow + 2)} height={110} compact />
          </>
        ) : (
          <span className="mt-1 block text-[13px] text-ink-2">Catat berat dan panjang badan untuk melihat apakah pertumbuhan {child.nickname} sesuai standar WHO.</span>
        )}
        {weighDue(measurements, today) && (
          <span className="mt-2.5 flex items-center justify-between rounded-xl bg-ground px-3 py-2 text-[13px] font-semibold">
            Waktunya menimbang bulan ini
            <span className="rounded-lg bg-ink px-2.5 py-1 text-ground" onClick={(e) => (e.stopPropagation(), go('ukur'))}>Catat</span>
          </span>
        )}
      </button>

      {visit && (
        <button type="button" onClick={() => go('imunisasi')} className="mx-3 mt-2.5 flex w-[calc(100%-24px)] items-center gap-3 rounded-2xl bg-panel px-3.5 py-3 text-left active:bg-ground">
          <IconSyringe />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] leading-snug font-semibold">{visit.doses.map((d) => doseName(d.dose).replaceAll(' ', ' ')).join(' · ')}</span>
            <span className="block text-[13px] text-ink-2">
              {visit.lead.status === 'upcoming'
                ? `Mulai bisa ${shortDate(visit.lead.earliest)} · ${daysBetween(today, visit.lead.earliest)} hari lagi`
                : visit.lead.status === 'late'
                  ? visit.lead.maxUntil && today <= visit.lead.maxUntil
                    ? `Sampai ${shortDate(visit.lead.maxUntil).replaceAll(' ', '\u00a0')}`
                    : 'Tanyakan ke petugas kesehatan'
                  : visit.lead.onTimeUntil
                    ? `Paling lambat ${shortDate(visit.lead.onTimeUntil)} · ${daysBetween(today, visit.lead.onTimeUntil)} hari lagi`
                    : 'Bisa diberikan sekarang'}
            </span>
            {overdue > 0 && <span className="mt-0.5 block text-[13px] font-semibold text-warn">{overdue} lewat jadwal · tanyakan ke petugas</span>}
          </span>
          <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-bold ${chipFor(visit.lead, today).tone}`}>{chipFor(visit.lead, today).text}</span>
        </button>
      )}

      {counters.length > 0 && (
        <section
          aria-label="Catat hari ini"
          className="fixed inset-x-0 bottom-[calc(70px+env(safe-area-inset-bottom))] mx-auto max-w-[430px] bg-ground px-2 pt-1 pb-2"
        >
          {/* The history used to hide behind a long press; it now has a visible way in. */}
          <div className="flex items-center justify-between pl-1.5">
            <span className="text-xs font-semibold text-ink-2">Ketuk untuk mencatat</span>
            <button type="button" onClick={() => go('rekap/catatan')} className="flex min-h-9 items-center gap-0.5 px-1.5 text-xs font-bold text-ink active:opacity-60">
              Riwayat & yang terlewat <IconChevron size={14} />
            </button>
          </div>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${counters.length}, minmax(0, 1fr))` }}>
            {counters.map((c) => (
              <CounterTile key={c.id} c={c} events={events} dayStart={dayStart} now={now} onTap={() => tapCounter(c)} />
            ))}
          </div>
        </section>
      )}

      {snack && (
        <div role="status" className="fixed inset-x-3 bottom-[calc(214px+env(safe-area-inset-bottom))] mx-auto max-w-[406px] animate-[fade-in_160ms_ease-out] rounded-xl bg-tile py-1.5 pr-1.5 pl-4 text-sm font-semibold text-on-tile">
          <div className="flex items-center justify-between">
            {snack.text}
            <button type="button" onClick={undo} className="min-h-11 rounded-lg px-3 font-bold underline underline-offset-4">
              Urungkan
            </button>
          </div>
          {snack.counter?.choice?.options && (
            <div className="scroller -ml-1 flex gap-1.5 overflow-x-auto pr-2 pb-1.5" style={{ touchAction: 'pan-x' }}>
              {snack.counter.choice.options.map((o) => {
                const key = snack.counter!.choice!.key
                const picked = events.find((e) => e.id === snack.id)?.value?.[key] === o
                return (
                  <button
                    key={String(o)}
                    type="button"
                    aria-pressed={picked}
                    onClick={() => act.patchEvent(snack.id, { value: { [key]: o } })}
                    className={`min-h-9 shrink-0 rounded-full px-3 text-[13px] font-semibold ${picked ? 'bg-on-tile text-tile' : 'bg-tile-active'}`}
                  >
                    {typeof o === 'number' ? `${o} ml` : o}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      <Sheet open={tempOpen} onClose={() => setTempOpen(false)} title="Suhu tubuh">
        <label className="block text-[15px] font-semibold" htmlFor="celsius">
          Suhu (°C)
        </label>
        <input
          id="celsius"
          type="number"
          inputMode="decimal"
          step="0.1"
          min="35"
          max="41"
          value={celsius}
          onChange={(e) => setCelsius(e.target.value)}
          className="mt-1.5 min-h-14 w-full rounded-xl border border-line bg-panel px-4 text-2xl font-extrabold"
        />
        <p className="mt-2 text-[13px] text-ink-2">Normal 36,5–37,5 °C (Buku KIA 2021 hal. 36). {DISCLAIMER.split('. ')[1]}.</p>
        <div className="mt-4">
          <Button onClick={saveTemp} disabled={!(Number(celsius.replace(',', '.')) >= 35 && Number(celsius.replace(',', '.')) <= 41)}>
            Simpan
          </Button>
        </div>
      </Sheet>
    </Screen>
  )
}
