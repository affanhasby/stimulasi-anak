import { useState } from 'react'
import { Button, Chip, Screen, Section, Sheet } from '../components/ui'
import { sourceLabel } from '../lib/content'
import { clockTime, COUNTERS, formatTileDuration, isTimer, shortLabel } from '../lib/counters'
import { ageInMonths, daysBetween, todayIso } from '../lib/date'
import { longDate } from '../lib/format'
import type { Child, EventRow } from '../lib/db'
import { useNow } from '../lib/hooks'
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
  e.value ? Object.values(e.value).map((v) => (typeof v === 'number' ? (v > 30 && v < 45 ? `${v} °C` : `${v} ml`) : String(v))).join(', ') : ''

/** History for one counter (long-press a tile): today or the last 24 hours, edit a time, delete, or add a missed entry. */
export function Catatan({ child, counterId }: { child: Child; counterId: string }) {
  const def = COUNTERS.find((c) => c.id === counterId)
  const [now, refreshNow] = useNow()
  const rows = useChildRows(child.id)
  const act = useActions()
  const [range, setRange] = useState<'today' | '24h'>('today')
  const [edit, setEdit] = useState<EventRow | null>(null)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  if (!def) return <Screen title="Catatan" onBack>{null}</Screen>

  const timer = isTimer(def)
  const dayStart = new Date(now).setHours(0, 0, 0, 0)
  const from = range === 'today' ? dayStart : now - 24 * H
  const list = (rows?.events ?? []).filter((e) => e.counter_id === counterId && Date.parse(e.start_at) >= from).reverse()
  const total = timer ? formatTileDuration(list.reduce((s, e) => s + Math.max(0, (e.end_at ? Date.parse(e.end_at) : now) - Date.parse(e.start_at)), 0)) : `${list.length}×`

  const today = todayIso(now)
  const ageDays = daysBetween(child.birth_date, today)
  const ageM = ageInMonths(child.birth_date, today)
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
        <Chip selected={range === '24h'} onClick={() => setRange('24h')}>24 jam terakhir</Chip>
      </div>
      <div className="mx-3 mt-2.5 rounded-2xl bg-tile p-4 text-on-tile">
        <p className="text-[13px] font-semibold opacity-80">{shortLabel(def)}</p>
        <p className="text-[40px] leading-none font-extrabold">{total}</p>
      </div>
      {norm && (
        <p className="mx-4 mt-2.5 text-[15px] leading-snug">
          {norm.text}
          <span className="mt-0.5 block text-[13px] text-ink-2">Sumber: {sourceLabel(norm.source, norm.page)}</span>
        </p>
      )}
      <Section title="Riwayat" note={list.length ? 'Ketuk catatan untuk mengubah jam atau menghapus.' : undefined}>
        {list.length === 0 && <p className="px-4 py-5 text-center text-[15px] text-ink-2">Belum ada catatan {range === 'today' ? 'hari ini' : 'dalam 24 jam'}.</p>}
        {list.map((e) => (
          <button key={e.id} type="button" onClick={() => open(e)} className="flex min-h-[52px] w-full items-center gap-3 border-t border-line px-4 text-left first:border-t-0 active:bg-ground">
            <span className="text-lg font-extrabold">{clockTime(new Date(e.start_at))}</span>
            <span className="min-w-0 flex-1 truncate text-[15px] text-ink-2">
              {timer ? (e.end_at ? `sampai ${clockTime(new Date(e.end_at))} · ${formatTileDuration(Date.parse(e.end_at) - Date.parse(e.start_at))}` : 'sedang berjalan') : valueText(e)}
            </span>
          </button>
        ))}
      </Section>
      <div className="mx-3 mt-4">
        <Button kind="secondary" onClick={() => open(null)}>
          Tambah catatan terlewat
        </Button>
      </div>

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? `Ubah ${shortLabel(def)}` : `Tambah ${shortLabel(def)}`}>
        <label className="block text-[15px] font-semibold" htmlFor="t-start">
          {timer ? 'Mulai' : 'Jam'}
        </label>
        <input id="t-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1.5 w-full rounded-xl border border-line bg-panel px-4 text-lg font-bold" />
        <p className="mt-1.5 text-[15px] text-ink-2">Pukul {start.replace(':', '.')}{edit ? `, ${longDate(todayIso(Date.parse(edit.start_at)))}` : ''}</p>
        {timer && (edit?.end_at || !edit?.id) && (
          <>
            <label className="mt-4 block text-[15px] font-semibold" htmlFor="t-end">
              Selesai
            </label>
            <input id="t-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1.5 w-full rounded-xl border border-line bg-panel px-4 text-lg font-bold" />
            <p className="mt-1.5 text-[15px] text-ink-2">Pukul {end.replace(':', '.')}</p>
          </>
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
