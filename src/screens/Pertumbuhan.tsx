import { useState } from 'react'
import { GrowthChart, type Point } from '../components/GrowthChart'
import { Button, Chip, Screen, Section } from '../components/ui'
import type { IsoDate } from '../lib/date'
import type { Child, MeasurementRow } from '../lib/db'
import { longDate, shortDate } from '../lib/format'
import { adjustedLength, ageMonthsExact, lengthStatus, MAX_MONTH, weightStatus, zScore, type Indicator, type Status } from '../lib/growth'
import { useToday } from '../lib/hooks'
import { go } from '../lib/nav'
import { useChildRows } from '../lib/store'

const TONE: Record<Status['level'], string> = { ok: 'bg-ok text-panel', watch: 'border border-warn text-warn', refer: 'bg-warn text-panel' }

export function seriesOf(child: Child, rows: MeasurementRow[], ind: Indicator): Point[] {
  return rows
    .map((r) => {
      const months = ageMonthsExact(child.birth_date, r.measured_on)
      const v = ind === 'wfa' ? r.weight_kg : r.length_cm !== null ? adjustedLength(r.length_cm, months, r.method) : null
      return v === null || months > MAX_MONTH ? null : { months, value: Number(v), label: longDate(r.measured_on) }
    })
    .filter((p): p is Point => p !== null)
}

/** Latest weight and length with their Permenkes 2/2020 status. */
export function latestStatus(child: Child, rows: MeasurementRow[]) {
  const sex = child.sex ?? 'M'
  const w = [...rows].reverse().find((r) => r.weight_kg !== null)
  const l = [...rows].reverse().find((r) => r.length_cm !== null)
  const wm = w ? ageMonthsExact(child.birth_date, w.measured_on) : 0
  const lm = l ? ageMonthsExact(child.birth_date, l.measured_on) : 0
  return {
    weight: w && wm <= MAX_MONTH ? { row: w, status: weightStatus(zScore('wfa', sex, wm, Number(w.weight_kg))) } : null,
    length: l && lm <= MAX_MONTH ? { row: l, status: lengthStatus(zScore('lhfa', sex, lm, adjustedLength(Number(l.length_cm), lm, l.method))) } : null,
  }
}

/** Is a weighing due? Monthly per the schedule; due when the last weight is from an earlier calendar month. */
export function weighDue(rows: MeasurementRow[], today: IsoDate) {
  const last = [...rows].reverse().find((r) => r.weight_kg !== null)
  return !last || last.measured_on.slice(0, 7) < today.slice(0, 7)
}

export function Pertumbuhan({ child }: { child: Child }) {
  const today = useToday()
  const rows = useChildRows(child.id)?.measurements ?? []
  const [ind, setInd] = useState<Indicator>('wfa')
  const sex = child.sex ?? 'M'
  const age = ageMonthsExact(child.birth_date, today)
  const from = Math.max(0, Math.floor(age) - 12)
  const to = Math.min(MAX_MONTH, Math.max(from + 6, Math.ceil(age) + 2))
  const latest = latestStatus(child, rows)
  const cur = ind === 'wfa' ? latest.weight : latest.length

  return (
    <Screen title="Pertumbuhan" onBack>
      {!child.sex && <p className="mx-4 mb-2 rounded-xl bg-warn/10 p-3 text-[13px] font-semibold text-warn">Jenis kelamin belum diisi; grafik memakai standar anak laki-laki. Isi di Lainnya &gt; Profil anak.</p>}
      <div className="mx-3 flex gap-2">
        <Chip selected={ind === 'wfa'} onClick={() => setInd('wfa')}>Berat badan</Chip>
        <Chip selected={ind === 'lhfa'} onClick={() => setInd('lhfa')}>{age < 24 ? 'Panjang badan' : 'Tinggi badan'}</Chip>
      </div>
      <Section>
        <div className="p-3">
          {cur ? (
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <div>
                <p className="text-2xl font-extrabold">
                  {ind === 'wfa' ? `${Number(cur.row.weight_kg).toLocaleString('id-ID')} kg` : `${Number(cur.row.length_cm).toLocaleString('id-ID')} cm`}
                </p>
                <p className="text-[13px] text-ink-2">{longDate(cur.row.measured_on)}</p>
              </div>
              <span className={`rounded-md px-2 py-1 text-xs font-bold ${TONE[cur.status.level]}`}>{cur.status.label}</span>
            </div>
          ) : (
            <p className="mb-2 px-1 text-[15px] text-ink-2">Belum ada data {ind === 'wfa' ? 'berat badan' : 'panjang/tinggi badan'}.</p>
          )}
          <GrowthChart ind={ind} sex={sex} points={seriesOf(child, rows, ind)} fromMonth={from} toMonth={to} />
          <p className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[12px] text-ink-2">
            <span className="flex items-center gap-1.5"><i className="size-3 rounded-sm" style={{ background: 'color-mix(in oklab, var(--ok) 30%, transparent)' }} /> Normal (−2 s.d. +2 SD)</span>
            <span className="flex items-center gap-1.5"><i className="size-3 rounded-sm" style={{ background: 'color-mix(in oklab, var(--warn) 30%, transparent)' }} /> Perlu perhatian</span>
          </p>
        </div>
      </Section>
      {cur && <p className="mx-4 mt-2 text-[15px] leading-snug">{cur.status.advice}</p>}

      <div className="mx-3 mt-4">
        <Button onClick={() => go('ukur')}>Catat berat &amp; panjang/tinggi</Button>
      </div>
      <p className="mx-4 mt-2 text-[13px] leading-snug text-ink-2">
        Timbang setiap bulan dan ukur panjang/tinggi minimal tiap 3 bulan, mis. saat ke Posyandu (Permenkes 66/2014).
      </p>

      {rows.length > 0 && (
        <Section title="Riwayat pengukuran">
          {[...rows].reverse().map((r) => (
            <button key={r.id} type="button" onClick={() => go(`ukur/${r.id}`)} className="flex min-h-[52px] w-full items-center gap-3 border-t border-line px-4 text-left first:border-t-0 active:bg-ground">
              <span className="w-24 shrink-0 text-[15px] font-semibold">{shortDate(r.measured_on)}</span>
              <span className="flex-1 text-[15px] text-ink-2">
                {[r.weight_kg !== null && `${Number(r.weight_kg).toLocaleString('id-ID')} kg`, r.length_cm !== null && `${Number(r.length_cm).toLocaleString('id-ID')} cm`].filter(Boolean).join(' · ')}
              </span>
            </button>
          ))}
        </Section>
      )}
      <p className="mx-4 mt-4 text-[13px] leading-relaxed text-ink-2">
        Standar: WHO Child Growth Standards 2006, sesuai Permenkes No. 2/2020 tentang Standar Antropometri Anak. Bukan diagnosis; status gizi dipastikan oleh petugas kesehatan.
      </p>
    </Screen>
  )
}
