import { useState } from 'react'
import { IconCheck } from '../components/icons'
import { Button, Chip, PickerInput, Screen } from '../components/ui'
import { isTimer, shortLabel, visibleCounters } from '../lib/counters'
import { addDays, ageInMonths, editableFrom, todayIso } from '../lib/date'
import type { Child } from '../lib/db'
import { longDate } from '../lib/format'
import { useNow } from '../lib/hooks'
import { go } from '../lib/nav'
import { eventDay } from '../lib/recap'
import { useActions, useChildRows, useSettings } from '../lib/store'

/**
 * "Isi yang terlewat": add forgotten taps as counts for a day, no times needed. The recap only judges daily
 * totals, so a count entered later is as good as one tapped live. Entries are marked `susulan`, so the
 * "time since last feed" alerts never treat them as a real time.
 */
export function IsiCatatan({ child, day: asked }: { child: Child; day?: string }) {
  const [now] = useNow()
  const today = todayIso(now)
  const from = editableFrom(child)
  const [day, setDay] = useState(asked && asked >= from && asked <= today ? asked : today)
  const [add, setAdd] = useState<Record<string, number>>({})
  const [saved, setSaved] = useState(false)
  const rows = useChildRows(child.id)
  const settings = useSettings()
  const act = useActions()
  const yesterday = addDays(today, -1)

  // Tap counters only: timers need a duration (add those in the counter's history) and temperature needs a value.
  const counters = visibleCounters(ageInMonths(child.birth_date, day), settings?.enabled_counters).filter((c) => !isTimer(c) && c.choice?.key !== 'celsius' && c.id !== 'MED')
  const logged = (id: string) => rows?.events.filter((e) => e.counter_id === id && eventDay(e) === day).length ?? 0
  const total = Object.values(add).reduce((s, n) => s + n, 0)

  const finish = async () => {
    await act.dismissAlert(child.id, 'RECAP', day)
    setSaved(true)
    setTimeout(() => go('', true), 1100)
  }
  const save = async () => {
    const [y, m, d] = day.split('-').map(Number)
    for (const c of counters)
      for (let i = 0; i < (add[c.id] ?? 0); i++) {
        // Today: now; an earlier day: that evening. A minute apart so the history keeps its order.
        const at = new Date(day === today ? now - i * 60_000 : new Date(y, m - 1, d, 20, 0).getTime() - i * 60_000).toISOString()
        await act.addEvent({ id: crypto.randomUUID(), child_id: child.id, counter_id: c.id, start_at: at, end_at: at, value: { susulan: true } })
      }
    await finish()
  }

  if (saved)
    return (
      <Screen title="Isi yang terlewat" onBack bottom="none">
        <div className="mx-4 mt-10 flex animate-[rise_420ms_cubic-bezier(.22,1,.36,1)] flex-col items-center text-center">
          <span className="grid size-20 place-items-center rounded-full bg-ok text-ground">
            <IconCheck size={40} />
          </span>
          <p className="mt-4 text-2xl font-extrabold">{total ? 'Tersimpan' : 'Oke, tercatat lengkap'}</p>
          <p className="mt-1 text-base text-ink-2">Rekap {day === today ? 'hari ini' : longDate(day)} sudah diperbarui.</p>
        </div>
      </Screen>
    )

  return (
    <Screen title="Isi yang terlewat" onBack bottom="none">
      <div className="px-4">
        <p className="text-[15px] leading-snug text-ink-2">Tambahkan yang lupa dicatat. Cukup jumlahnya, jamnya tidak perlu.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip selected={day === today} onClick={() => (setDay(today), setAdd({}))}>Hari ini</Chip>
          {yesterday >= from && <Chip selected={day === yesterday} onClick={() => (setDay(yesterday), setAdd({}))}>Kemarin</Chip>}
        </div>
        <div className="mt-2.5">
          <PickerInput type="date" label="Tanggal" value={day} min={from} max={today} onChange={(v) => v && (setDay(v), setAdd({}))} />
        </div>
        <p className="mt-1.5 text-[13px] text-ink-2">Bisa diisi mulai {longDate(from)}, saat {child.nickname} ditambahkan ke aplikasi.</p>

        <ul className="mt-4 overflow-hidden rounded-2xl bg-panel">
          {counters.map((c) => {
            const n = add[c.id] ?? 0
            const set = (v: number) => setAdd({ ...add, [c.id]: Math.max(0, Math.min(30, v)) })
            return (
              <li key={c.id} className="flex min-h-[64px] items-center gap-3 border-t border-line px-4 py-2 first:border-t-0">
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold">{shortLabel(c)}</span>
                  <span className="block text-[13px] text-ink-2">
                    Tercatat {logged(c.id)}×{n ? ` · jadi ${logged(c.id) + n}×` : ''}
                  </span>
                </span>
                <button type="button" aria-label={`Kurangi ${shortLabel(c)}`} disabled={!n} onClick={() => set(n - 1)} className="grid size-11 place-items-center rounded-full border border-line text-xl font-bold active:scale-95 disabled:opacity-30">
                  −
                </button>
                <span className="w-10 text-center text-xl font-extrabold tabular-nums" aria-live="polite">
                  {n ? `+${n}` : '0'}
                </span>
                <button type="button" aria-label={`Tambah ${shortLabel(c)}`} onClick={() => (set(n + 1), navigator.vibrate?.(6))} className="grid size-11 place-items-center rounded-full bg-ink text-xl font-bold text-ground active:scale-95">
                  +
                </button>
              </li>
            )
          })}
        </ul>
        <p className="mt-2 px-1 text-[13px] leading-snug text-ink-2">Tidur dan tengkurap butuh lama waktunya: tambahkan lewat riwayatnya (tekan lama kotaknya di Beranda).</p>

        <div className="mt-5 grid gap-2.5 pb-[max(16px,env(safe-area-inset-bottom))]">
          <Button onClick={save} disabled={!total}>
            {total ? `Simpan (+${total})` : 'Simpan'}
          </Button>
          <Button kind="secondary" onClick={finish}>
            Tidak ada yang terlewat
          </Button>
        </div>
      </div>
    </Screen>
  )
}
