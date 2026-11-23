import { useState } from 'react'
import { Button, Chip, Field, Screen } from '../components/ui'
import type { Child, MeasurementRow } from '../lib/db'
import { ageMonthsExact } from '../lib/growth'
import { useToday } from '../lib/hooks'
import { back, go } from '../lib/nav'
import { useActions, useChildRows } from '../lib/store'

const num = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')))

/**
 * Record (or edit) one measurement: weight and/or length/height on a date.
 * The form starts from the stored values, so it waits until the device database has loaded (and restarts
 * when the record arrives by sync): starting earlier would open an edit as a blank form dated today.
 */
export function Ukur({ child, id }: { child: Child; id?: string }) {
  const loaded = useChildRows(child.id)
  if (!loaded) return <Screen title={id ? 'Ubah pengukuran' : 'Catat pengukuran'} onBack="pertumbuhan" bottom="none">{null}</Screen>
  const existing = id ? loaded.measurements.find((r) => r.id === id) : undefined
  // Keyed by whether the record is here yet: if it arrives later (synced from the server), the form restarts
  // from its values instead of keeping the blank start.
  return <UkurForm key={existing ? existing.id : 'new'} child={child} rows={loaded.measurements} existing={existing} />
}

function UkurForm({ child, rows, existing }: { child: Child; rows: MeasurementRow[]; existing?: MeasurementRow }) {
  const today = useToday()
  const act = useActions()
  const id = existing?.id
  const [date, setDate] = useState(existing?.measured_on ?? today)
  const [w, setW] = useState(existing?.weight_kg != null ? String(existing.weight_kg).replace('.', ',') : '')
  const [l, setL] = useState(existing?.length_cm != null ? String(existing.length_cm).replace('.', ',') : '')
  const age = ageMonthsExact(child.birth_date, date)
  const [method, setMethod] = useState<'telentang' | 'berdiri'>(existing?.method ?? (age < 24 ? 'telentang' : 'berdiri'))

  const wv = num(w)
  const lv = num(l)
  const wErr = wv !== null && !(wv >= 0.5 && wv <= 60) ? 'Isi berat 0,5–60 kg, mis. 6,4.' : null
  const lErr = lv !== null && !(lv >= 30 && lv <= 150) ? 'Isi panjang/tinggi 30–150 cm, mis. 62,5.' : null
  // Guard against typos (e.g. 64 instead of 6,4): a jump of more than 30% from the previous weight.
  const prev = [...rows].filter((r) => r.id !== id && r.weight_kg !== null && r.measured_on <= date).at(-1)
  const jump = wv !== null && prev && Math.abs(wv - Number(prev.weight_kg)) / Number(prev.weight_kg) > 0.3
  const ok = (wv !== null || lv !== null) && !wErr && !lErr && date <= today && date >= child.birth_date

  return (
    <Screen title={existing ? 'Ubah pengukuran' : 'Catat pengukuran'} onBack="pertumbuhan" bottom="none">
      <div className="px-4">
        <Field label="Tanggal" type="date" value={date} max={today} min={child.birth_date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        <Field
          label="Berat badan (kg)"
          inputMode="decimal"
          value={w}
          onChange={(e) => setW(e.target.value.replace(/[^\d.,]/g, ''))}
          placeholder="mis. 6,4"
          error={wErr}
          hint={jump ? `Berbeda jauh dari sebelumnya (${String(prev?.weight_kg).replace('.', ',')} kg). Periksa lagi angkanya.` : 'Timbang tanpa baju tebal/popok penuh.'}
        />
        <Field label={age < 24 ? 'Panjang badan (cm)' : 'Tinggi badan (cm)'} inputMode="decimal" value={l} onChange={(e) => setL(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="mis. 62,5" error={lErr} hint="Boleh dikosongkan bila belum diukur." />
        <p className="mt-4 text-[15px] font-semibold">Cara mengukur</p>
        <div className="mt-1.5 flex gap-2">
          <Chip selected={method === 'telentang'} onClick={() => setMethod('telentang')}>Berbaring</Chip>
          <Chip selected={method === 'berdiri'} onClick={() => setMethod('berdiri')}>Berdiri</Chip>
        </div>
        <p className="mt-1.5 text-[13px] text-ink-2">Di bawah 2 tahun diukur berbaring; mulai 2 tahun berdiri. Selisihnya disesuaikan otomatis (0,7 cm).</p>
        <div className="mt-6 grid gap-2.5 pb-[max(16px,env(safe-area-inset-bottom))]">
          {wv === null && lv === null && <p className="text-center text-[13px] text-ink-2">Isi berat atau panjang badan dulu untuk menyimpan.</p>}
          <Button
            disabled={!ok}
            onClick={async () => {
              await act.saveMeasurement({ id: existing?.id ?? crypto.randomUUID(), child_id: child.id, measured_on: date, weight_kg: wv, length_cm: lv, method: lv !== null ? method : null })
              go('pertumbuhan', true) // show where the new point lands on the chart
            }}
          >
            Simpan
          </Button>
          {existing && (
            <Button
              kind="secondary"
              onClick={async () => {
                await act.removeMeasurement(existing.id)
                back('pertumbuhan')
              }}
            >
              Hapus pengukuran
            </Button>
          )}
        </div>
      </div>
    </Screen>
  )
}
