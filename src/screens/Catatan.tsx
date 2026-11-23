import { useState } from 'react'
import { DayBars } from '../components/DayBars'
import { IconChevron } from '../components/icons'
import { Button, Chip, Screen, Section, Sheet, PickerInput } from '../components/ui'
import { sourceLabel } from '../lib/content'
import { clockTime, COUNTERS, formatTileDuration, isTimer, shortLabel } from '../lib/counters'
import { ageInMonths, daysBetween, editableFrom, todayIso } from '../lib/date'
import { longDate, weekday } from '../lib/format'
import { counterRecap, eventDay, type Tone } from '../lib/recap'
import type { Child, EventRow } from '../lib/db'
import { useNow } from '../lib/hooks'
import { go } from '../lib/nav'
import { useActions, useChildRows } from '../lib/store'

const H = 3_600_000
const toLocalInput = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const withTime = (iso: string, hhmm: string) => {
  const d = new Date(iso)
  const [h, m] = hhmm.split(':').map(Number)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}
const valueText = (e: EventRow) =>
  e.value?.susulan
    ? 'diisi susulan'
    : e.value
      ? Object.values(e.value).map((v) => (typeof v === 'number' ? (v > 30 && v < 45 ? `${v} °C` : `${v} ml`) : String(v))).join(', ')
      : ''

export const TONE_DOT: Record<Tone, string> = { ok: 'var(--ok)', watch: 'var(--warn)', info: 'var(--ink-2)', none: 'var(--off)' }

/**
 * History for one counter (long-press a tile, or from Rekap): today, the last 7 or 30 days with a plain
 * conclusion against the norm; edit a time, delete, or add a missed entry.
 */
export function Catatan({ child, counterId }: { child: Child; counterId: string }) {
  const def = COUNTERS.find((c) => c.id === counterId)
  const [now, refreshNow] = useNow()
  const rows = useChildRows(child.id)
  const act = useActions()
  const [range, setRange] = useState<'today' | '24h' | 7 | 30>('today')
  const [edit, setEdit] = useState<EventRow | null>(null)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  if (!def) return <Screen title="Catatan" onBack>{null}</Screen>

  const timer = isTimer(def)
  const dayStart = new Date(now).setHours(0, 0, 0, 0)
  const days = typeof range === 'number' ? range : 1
  const from = range === 'today' ? dayStart : range === '24h' ? now - 24 * H : new Date(dayStart).setDate(new Date(dayStart).getDate() - days + 1)
  const list = (rows?.events ?? []).filter((e) => e.counter_id === counterId && Date.parse(e.start_at) >= from).reverse()
  const total = timer ? formatTileDuration(list.reduce((s, e) => s + Math.max(0, (e.end_at ? Date.parse(e.end_at) : now) - Date.parse(e.start_at)), 0)) : `${list.length}×`

  const today = todayIso(now)
  const ageDays = daysBetween(child.birth_date, today)
  const ageM = ageInMonths(child.birth_date, today)
  const recap = typeof range === 'number' && rows ? counterRecap(def, rows.events, child.birth_date, today, range, now) : null
  const byDay = typeof range === 'number' ? [...new Set(list.map(eventDay))].map((d) => ({ day: d, items: list.filter((e) => eventDay(e) === d) })) : [{ day: '', items: list }]
  const norm = def.norms?.find((n) => (n.age_days ? ageDays >= n.age_days[0] && ageDays <= n.age_days[1] : n.age_months ? ageM >= n.age_months[0] && ageM < n.age_months[1] : false))

  const open = (e: EventRow | null) => {
    const base = e?.start_at ?? new Date().toISOString()
    setEdit(e ?? { id: '', child_id: child.id, counter_id: counterId, start_at: base, end_at: timer ? null : base, value: null, deleted: false, updated_at: base })
    setStart(toLocalInput(base))
    setEnd(e?.end_at ? toLocalInput(e.end_at) : toLocalInput(base))
  }
  const save = async () => {
    if (!edit) return
    const s = withTime(edit.start_at, start)
    let en = timer ? (edit.end_at || !edit.id ? withTime(edit.end_at ?? edit.start_at, end) : null) : s
    if (en && en < s) en = new Date(Date.parse(en) + 24 * H).toISOString() // slept past midnight
    if (edit.id) await act.patchEvent(edit.id, { start_at: s, end_at: en })
    else await act.addEvent({ id: crypto.randomUUID(), child_id: child.id, counter_id: counterId, start_at: s, end_at: en, value: null })
    refreshNow()
    setEdit(null)
  }

  return (
    <Screen title={def.label} onBack>
      <div className="mx-3 mt-1 flex gap-2">
        <Chip selected={range === 'today'} onClick={() => setRange('today')}>Hari ini</Chip>
        <Chip selected={range === '24h'} onClick={() => setRange('24h')}>24 jam</Chip>
        <Chip selected={range === 7} onClick={() => setRange(7)}>7 hari</Chip>
        <Chip selected={range === 30} onClick={() => setRange(30)}>30 hari</Chip>
      </div>
      {recap ? (
        <div className="mx-3 mt-2.5 rounded-2xl bg-panel p-4">
          <p className="flex items-center gap-2 text-[15px] font-bold">
            <i className="size-2.5 rounded-full" style={{ background: TONE_DOT[recap.tone] }} />
            Kesimpulan {range} hari
          </p>
          <p className="mt-1 text-[15px] leading-snug">{recap.text}</p>
          {recap.extra && <p className="mt-1 text-[13px] text-ink-2">{recap.extra}</p>}
          <div className="mt-3">
            <DayBars days={recap.days} timer={recap.timer} today={today} />
          </div>
          <p className="mt-2 text-[12px] leading-snug text-ink-2">
            {recap.timer ? 'Angka dalam jam. ' : ''}Hijau sesuai anjuran, kuning di bawah anjuran, garis tipis = batas minimal. Hari tanpa catatan {shortLabel(def).toLowerCase()} tidak dihitung (biasanya lupa mencatat); hari ini belum dinilai.
          </p>
        </div>
      ) : (
        <div className="mx-3 mt-2.5 rounded-2xl bg-tile p-4 text-on-tile">
          <p className="text-[13px] font-semibold opacity-80">{shortLabel(def)}</p>
          <p className="text-[40px] leading-none font-extrabold">{total}</p>
        </div>
      )}
      {norm && (
        <p className="mx-4 mt-2.5 text-[15px] leading-snug">
          {norm.text}
          <span className="mt-0.5 block text-[13px] text-ink-2">Sumber: {sourceLabel(norm.source, norm.page)}</span>
        </p>
      )}
      <Section title="Riwayat" note={list.length ? 'Ketuk catatan untuk mengubah jam atau menghapus.' : undefined}>
        {list.length === 0 && <p className="px-4 py-5 text-center text-[15px] text-ink-2">Belum ada catatan {range === 'today' ? 'hari ini' : range === '24h' ? 'dalam 24 jam' : `dalam ${range} hari`}.</p>}
        {byDay.map(({ day, items }) => [
          day && (
            <p key={day} className="flex justify-between border-t border-line bg-ground/60 px-4 py-1.5 text-[13px] font-bold text-ink-2 first:border-t-0">
              <span>{weekday(day)}, {longDate(day)}</span>
              <span>{timer ? formatTileDuration(items.reduce((s, e) => s + Math.max(0, (e.end_at ? Date.parse(e.end_at) : now) - Date.parse(e.start_at)), 0)) : `${items.length}×`}</span>
            </p>
          ),
          ...items.map((e) => (
          <button key={e.id} type="button" onClick={() => open(e)} className="flex min-h-[52px] w-full items-center gap-3 border-t border-line px-4 text-left first:border-t-0 active:bg-ground">
            <span className="text-lg font-extrabold">{clockTime(new Date(e.start_at))}</span>
            <span className="min-w-0 flex-1 truncate text-[15px] text-ink-2">
              {timer ? (e.end_at ? `sampai ${clockTime(new Date(e.end_at))} · ${formatTileDuration(Date.parse(e.end_at) - Date.parse(e.start_at))}` : 'sedang berjalan') : valueText(e)}
            </span>
          </button>
        )),
        ])}
      </Section>
      <div className="mx-3 mt-4">
        <Button kind="secondary" onClick={() => open(null)}>
          Tambah yang terlewat
        </Button>
      </div>

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? `Ubah ${shortLabel(def)}` : `Tambah ${shortLabel(def)}`}>
        {edit && !edit.id && (
          <>
            <label className="block text-[15px] font-semibold" htmlFor="t-day">
              Tanggal
            </label>
            <div className="mt-1.5 mb-4">
              <PickerInput
                id="t-day"
                type="date"
                value={todayIso(Date.parse(edit.start_at))}
                min={editableFrom(child)}
                max={today}
                onChange={(v) => {
                  if (!v) return
                  // Keep the chosen clock time; only the day moves (back to the day the child was added).
                  const [y, m, d] = v.split('-').map(Number)
                  const at = new Date(y, m - 1, d, 12).toISOString()
                  setEdit({ ...edit, start_at: at, end_at: timer ? null : at })
                }}
              />
            </div>
          </>
        )}
        <label className="block text-[15px] font-semibold" htmlFor="t-start">
          {timer ? 'Mulai' : 'Jam'}
        </label>
        <div className="mt-1.5">
          <PickerInput id="t-start" type="time" value={start} onChange={setStart} />
        </div>
        {edit?.id && <p className="mt-1.5 text-[15px] text-ink-2">{longDate(todayIso(Date.parse(edit.start_at)))}</p>}
        {timer && (edit?.end_at || !edit?.id) && (
          <>
            <label className="mt-4 block text-[15px] font-semibold" htmlFor="t-end">
              Selesai
            </label>
            <div className="mt-1.5">
              <PickerInput id="t-end" type="time" value={end} onChange={setEnd} />
            </div>
          </>
        )}
        {edit && !edit.id && !timer && (
          <button type="button" onClick={() => go('isi')} className="mt-4 flex min-h-11 w-full items-center justify-between rounded-xl bg-ground px-3.5 text-left text-[15px] font-semibold">
            Lupa jamnya? Isi jumlahnya saja
            <IconChevron size={16} />
          </button>
        )}
        <div className="mt-5 grid gap-2.5">
          <Button onClick={save} disabled={!start}>Simpan</Button>
          {edit?.id && (
            <Button
              kind="secondary"
              onClick={async () => {
                await act.removeEvent(edit.id)
                setEdit(null)
              }}
            >
              Hapus catatan
            </Button>
          )}
        </div>
      </Sheet>
    </Screen>
  )
}
