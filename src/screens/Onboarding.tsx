import { useMemo, useState } from 'react'
import { PushToggle } from '../components/PushToggle'
import { Button, Chip, Screen } from '../components/ui'
import { nowIso, type Child } from '../lib/db'
import { addMonths, todayIso, type IsoDate } from '../lib/date'
import { useActions, useStore } from '../lib/store'
import { doseName, REMINDER_OPTIONS, vaccineSchedule, type ScheduleId } from '../lib/vaccines'
import { longDate } from '../lib/format'

const LEAD_LABEL: Record<number, string> = { 0: 'Hari-H', 1: 'H-1', 2: 'H-2', 3: 'H-3', 7: 'H-7' }

function Steps({ at, total }: { at: number; total: number }) {
  return (
    <div className="flex gap-1.5" aria-label={`Langkah ${at} dari ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-full ${i < at ? 'bg-ink' : 'bg-off'}`} />
      ))}
    </div>
  )
}

export function Onboarding() {
  const { db } = useStore()
  const act = useActions()
  const today = todayIso()
  const [step, setStep] = useState(1)
  const [birth, setBirth] = useState<IsoDate>(today)
  const [nickname, setNickname] = useState('')
  const [sex, setSex] = useState<'M' | 'F' | null>(null)
  const [preterm, setPreterm] = useState(false)
  const [weeks, setWeeks] = useState(34)
  const [schedule, setSchedule] = useState<ScheduleId>('KEMENKES')
  const [lead, setLead] = useState<number[]>(REMINDER_OPTIONS.default_lead_time_days)
  const [time, setTime] = useState(REMINDER_OPTIONS.time_of_day_default)
  const [email] = useState(false) // email reminders hidden until outgoing email is set up
  const [unticked, setUnticked] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const birthOk = birth <= today && birth >= addMonths(today, -72)
  // PRD: doses due before today are listed, all ticked by default; the parent unticks what was missed.
  const past = useMemo(
    () => vaccineSchedule({ birth_date: birth, schedule, sex }, [], today).filter((d) => d.earliest < today && !['school', 'conditional', 'waiting'].includes(d.status)),
    [birth, schedule, sex, today],
  )
  const total = past.length ? 4 : 3

  const finish = async () => {
    setSaving(true)
    const child: Child = {
      id: crypto.randomUUID(),
      nickname: nickname.trim() || 'Si Kecil',
      birth_date: birth,
      sex,
      gestational_weeks: preterm ? weeks : null,
      schedule,
      je_endemic: null,
      rv_pentavalent: null,
      created_at: nowIso(),
      updated_at: nowIso(),
      deleted_at: null,
    }
    await db.transaction('rw', db.children, db.settings, db.vaccine_records, async () => {
      await act.saveChild(child)
      await act.saveSettings({ active_child_id: child.id, reminder_lead_days: lead, reminder_time: time, email_reminders: email })
      for (const d of past) if (!unticked.includes(d.key)) await act.setVaccine(child.id, d.key, d.earliest)
    })
  }

  if (step === 1)
    return (
      <Screen bottom="none">
        <div className="flex min-h-full flex-col px-5 pt-[max(20px,var(--top-guard))]">
          <Steps at={1} total={total} />
          <h1 className="mt-6 text-[40px] leading-[1.05] font-extrabold text-balance">Kapan si Kecil lahir?</h1>
          <p className="mt-2 text-[15px] leading-snug text-ink-2">Dari tanggal ini semua jadwal imunisasi, stimulasi, dan kemampuan sesuai usia disusun otomatis.</p>
          <label className="mt-6 block">
            <span className="sr-only">Tanggal lahir</span>
            <input
              type="date"
              value={birth}
              max={today}
              min={addMonths(today, -72)}
              onChange={(e) => setBirth(e.target.value)}
              className="w-full rounded-2xl border border-line bg-panel px-4 py-3 text-xl font-bold"
            />
          </label>
          {!birthOk && <p className="mt-2 text-[15px] font-semibold text-late">Pilih tanggal dalam 6 tahun terakhir, tidak setelah hari ini.</p>}
          <p className="mt-2 text-[15px] text-ink-2">{birthOk && longDate(birth)}</p>
          <div className="flex-1" />
          <p className="mt-6 text-[13px] leading-relaxed text-ink-2">
            Aplikasi ini alat bantu pemantauan berdasarkan Buku KIA Kemenkes RI, IDAI, CDC/AAP, dan WHO. Bukan alat diagnosis dan tidak menggantikan bidan, dokter, atau Posyandu. Jika ada tanda bahaya, segera ke fasilitas kesehatan atau hubungi 119.
          </p>
          <div className="mt-4 mb-2">
            <Button disabled={!birthOk} onClick={() => setStep(2)}>
              Lanjut
            </Button>
          </div>
        </div>
      </Screen>
    )

  if (step === 2)
    return (
      <Screen bottom="none">
        <div className="px-5 pt-[max(20px,var(--top-guard))]">
          <Steps at={2} total={total} />
          <h1 className="mt-6 text-[40px] leading-[1.05] font-extrabold text-balance">Tentang si Kecil</h1>
          <p className="mt-2 text-[15px] text-ink-2">Semua boleh dilewati.</p>
          <label className="mt-4 block text-[15px] font-semibold" htmlFor="nick">
            Nama panggilan
          </label>
          <input id="nick" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Si Kecil" maxLength={40} autoComplete="off" className="mt-1.5 min-h-12 w-full rounded-xl border border-line bg-panel px-3.5 outline-none focus:border-ink" />

          <p className="mt-5 text-[15px] font-semibold">Jenis kelamin</p>
          <p className="text-[13px] text-ink-2">Dipakai untuk jadwal vaksin HPV.</p>
          <div className="mt-2 flex gap-2">
            <Chip selected={sex === 'M'} onClick={() => setSex(sex === 'M' ? null : 'M')}>Laki-laki</Chip>
            <Chip selected={sex === 'F'} onClick={() => setSex(sex === 'F' ? null : 'F')}>Perempuan</Chip>
          </div>

          <p className="mt-5 text-[15px] font-semibold">Lahir prematur?</p>
          <p className="text-[13px] text-ink-2">Bila ya, ceklis dan stimulasi memakai usia koreksi sampai 2 tahun.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Chip selected={!preterm} onClick={() => setPreterm(false)}>Tidak</Chip>
            <Chip selected={preterm} onClick={() => setPreterm(true)}>Ya</Chip>
            {preterm && (
              <label className="flex items-center gap-2 text-[15px]">
                <input type="number" inputMode="numeric" min={22} max={36} value={weeks} onChange={(e) => setWeeks(Math.min(36, Math.max(22, Number(e.target.value) || 22)))} className="min-h-11 w-20 rounded-xl border border-line bg-panel px-3 text-center font-bold" />
                minggu
              </label>
            )}
          </div>

          <p className="mt-5 text-[15px] font-semibold">Jadwal imunisasi</p>
          <div className="mt-2 grid gap-2">
            {([
              ['KEMENKES', 'Program pemerintah', 'Gratis di Posyandu/Puskesmas'],
              ['IDAI', 'IDAI / dokter anak swasta', 'Menambah influenza, varisela, hepatitis A, tifoid, dan lainnya'],
            ] as const).map(([id, label, hint]) => (
              <button
                key={id}
                type="button"
                aria-pressed={schedule === id}
                onClick={() => setSchedule(id)}
                className={`rounded-2xl border p-3.5 text-left ${schedule === id ? 'border-ink bg-panel ring-1 ring-ink' : 'border-line bg-panel'}`}
              >
                <span className="block font-bold">{label}</span>
                <span className="block text-[13px] text-ink-2">{hint}</span>
              </button>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-[auto_1fr] gap-2">
            <Button kind="secondary" full={false} onClick={() => setStep(1)}>Kembali</Button>
            <Button onClick={() => setStep(3)}>Lanjut</Button>
          </div>
        </div>
      </Screen>
    )

  if (step === 3)
    return (
      <Screen bottom="none">
        <div className="px-5 pt-[max(20px,var(--top-guard))]">
          <Steps at={3} total={total} />
          <h1 className="mt-6 text-[40px] leading-[1.05] font-extrabold text-balance">Pengingat imunisasi</h1>
          <p className="mt-2 text-[15px] leading-snug text-ink-2">Kapan Ayah/Bunda ingin diingatkan sebelum jadwal? Boleh pilih lebih dari satu.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {REMINDER_OPTIONS.lead_time_days_choices.map((d) => (
              <Chip key={d} check selected={lead.includes(d)} onClick={() => setLead(lead.includes(d) ? lead.filter((x) => x !== d) : [...lead, d].sort((a, b) => a - b))}>
                {LEAD_LABEL[d] ?? `H-${d}`}
              </Chip>
            ))}
          </div>
          <label className="mt-5 block text-[15px] font-semibold" htmlFor="rtime">Jam pengingat</label>
          <input id="rtime" type="time" value={time} onChange={(e) => setTime(e.target.value || '07:00')} className="mt-1.5 w-full rounded-xl border border-line bg-panel px-3.5 text-lg font-bold" />
          <p className="mt-1.5 text-[15px] text-ink-2">Pukul {time.replace(':', '.')}</p>
          <div className="mt-5 overflow-hidden rounded-2xl bg-panel">
            <PushToggle />
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-2">Jadwal juga bisa dimasukkan ke kalender HP dari tab Imunisasi.</p>
          <div className="mt-6 grid grid-cols-[auto_1fr] gap-2">
            <Button kind="secondary" full={false} onClick={() => setStep(2)}>Kembali</Button>
            {past.length ? (
              <Button onClick={() => setStep(4)}>Lanjut</Button>
            ) : (
              <Button disabled={saving} onClick={finish}>Mulai</Button>
            )}
          </div>
        </div>
      </Screen>
    )

  return (
    <Screen bottom="none">
      <div className="px-5 pt-[max(20px,var(--top-guard))]">
        <Steps at={4} total={total} />
        <h1 className="mt-6 text-[40px] leading-[1.05] font-extrabold text-balance">Mana yang sudah diberikan?</h1>
        <p className="mt-2 text-[15px] leading-snug text-ink-2">Imunisasi ini dijadwalkan sebelum hari ini. Semua sudah dicentang; hapus centang yang belum diberikan. Tanggal bisa diubah nanti.</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {past.map((d) => (
            <li key={d.key}>
              <Chip check selected={!unticked.includes(d.key)} onClick={() => setUnticked(unticked.includes(d.key) ? unticked.filter((k) => k !== d.key) : [...unticked, d.key])}>
                {doseName(d.dose)}
              </Chip>
            </li>
          ))}
        </ul>
        <div className="mt-6 grid grid-cols-[auto_1fr] gap-2">
          <Button kind="secondary" full={false} onClick={() => setStep(3)}>Kembali</Button>
          <Button disabled={saving} onClick={finish}>Mulai</Button>
        </div>
      </div>
    </Screen>
  )
}
