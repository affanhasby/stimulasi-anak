import { useState } from 'react'
import { IconCalendar, IconChevron } from '../components/icons'
import { Button, Chip, Screen, Section, Sheet, Toggle, PickerInput } from '../components/ui'
import { sourceLabel } from '../lib/content'
import { daysBetween, type IsoDate } from '../lib/date'
import type { Child } from '../lib/db'
import { ageLabel, longDate, shortDate } from '../lib/format'
import { useToday } from '../lib/hooks'
import { downloadFile, scheduleIcs } from '../lib/ics'
import { useActions, useChildRows, useSettings } from '../lib/store'
import { doseName, VACCINES, VACCINES_AS_OF, vaccineInfo, vaccineSchedule, type ScheduledDose } from '../lib/vaccines'
import { missed, nextVisit } from '../lib/visit'
import { chipFor } from './Beranda'

const vaccineName = (code: string) => VACCINES.find((v) => v.code === code)?.name ?? code

function whenLine(d: ScheduledDose, today: IsoDate) {
  if (d.status === 'done') return `Diberikan ${d.givenDate ? shortDate(d.givenDate) : ''}`
  if (d.status === 'skipped') return 'Tidak diberikan · ketuk bila sudah dikejar'
  if (d.status === 'school') return 'Lewat program BIAS di sekolah'
  if (d.status === 'waiting') return `Setelah ${d.waitingFor ? 'dosis sebelumnya' : ''} diberikan`
  if (d.status === 'conditional') return d.dose.condition === 'region_endemic_je' ? 'Hanya untuk daerah endemis JE' : 'Tergantung jenis vaksin'
  if (d.status === 'upcoming') return `Mulai bisa ${shortDate(d.earliest)} · ${daysBetween(today, d.earliest)} hari lagi`
  if (d.status === 'late') return d.maxUntil && today <= d.maxUntil ? `Sampai ${shortDate(d.maxUntil)}` : 'Tanyakan ke petugas kesehatan'
  return d.onTimeUntil ? `Paling lambat ${shortDate(d.onTimeUntil)}` : 'Bisa diberikan sekarang'
}

function bucketOf(d: ScheduledDose) {
  if (d.dose.trigger === 'school_grade') return 1000
  return d.dose.recommended?.months ?? 0
}

const SKIP_REASONS = ['Lupa', 'Anak sedang sakit', 'Vaksin tidak tersedia', 'Belum sempat ke faskes', 'Ragu / menolak', 'Lainnya']

const KIND_TAG: Record<string, string> = { wajib: 'Wajib', 'wajib-daerah': 'Wajib di daerah endemis', tambahan: 'Tambahan', opsional: 'Opsional' }

function KindTag({ dose }: { dose: ScheduledDose['dose'] }) {
  const k = vaccineInfo(dose).kind
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${k === 'wajib' || k === 'wajib-daerah' ? 'border border-ink text-ink' : 'bg-off text-ink-2'}`}>{KIND_TAG[k]}</span>
  )
}

function DoseRow({ d, today, onOpen, detail, reason }: { d: ScheduledDose; today: IsoDate; onOpen: () => void; detail?: boolean; reason?: string | null }) {
  const info = vaccineInfo(d.dose)
  return (
    <button type="button" onClick={onOpen} className="flex min-h-[60px] w-full items-center gap-3 border-t border-line px-4 py-2.5 text-left first:border-t-0 active:bg-ground">
      <span className="min-w-0 flex-1">
        <span className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-base leading-snug font-semibold ${d.status === 'done' ? 'text-ink-2' : ''}`}>
          {doseName(d.dose)}
          {d.occurrence ? ` (ke-${d.occurrence})` : ''}
          {detail && <KindTag dose={d.dose} />}
        </span>
        {detail && <span className="mt-0.5 block text-[13px] leading-snug">Untuk: {info.protects}</span>}
        <span className="block text-[13px] text-ink-2">{whenLine(d, today)}</span>
        {reason && <span className="block text-[13px] text-ink-2">Alasan: {reason}</span>}
      </span>
      <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-bold ${chipFor(d, today).tone}`}>{chipFor(d, today).text}</span>
      {/* The chevron says "tap for details and to mark it given", so no instruction line is needed. */}
      <span className="-mr-1 shrink-0 text-ink-2">
        <IconChevron size={16} />
      </span>
    </button>
  )
}

export function Imunisasi({ child }: { child: Child }) {
  const today = useToday()
  const rows = useChildRows(child.id)
  const settings = useSettings()
  const act = useActions()
  const [sel, setSel] = useState<ScheduledDose | null>(null)
  const [date, setDate] = useState(today)
  const [showAll, setShowAll] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const [skipMode, setSkipMode] = useState(false)
  const [reason, setReason] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const recordOf = (key: string) => rows?.vaccines.find((r) => r.dose_key === key)

  const doses = vaccineSchedule(child, rows?.vaccines ?? [], today)
  const groups = new Map<number, ScheduledDose[]>()
  for (const d of doses) groups.set(bucketOf(d), [...(groups.get(bucketOf(d)) ?? []), d])
  const done = doses.filter((d) => d.status === 'done')
  const counted = doses.filter((d) => !['school', 'conditional'].includes(d.status) && !d.dose.optional).length

  // Only what matters now: the nearest visit, any doses to catch up, and the one visit after.
  const visit = nextVisit(doses, today)
  const inVisit = new Set(visit?.doses.map((d) => d.key))
  // Past the maximum age or not given: kept apart so they never crowd out what can be given now.
  const catchUp = doses.filter((d) => missed(d, today) && !inVisit.has(d.key))
  const after = doses
    .filter((d) => d.status === 'upcoming' && !inVisit.has(d.key) && (!visit || d.earliest > visit.lead.earliest))
    .sort((a, b) => a.earliest.localeCompare(b.earliest))
  const nextGroup = after.filter((d) => d.earliest === after[0]?.earliest)

  const openDose = (d: ScheduledDose) => {
    setSel(d)
    setDate(d.givenDate ?? today)
    const r = recordOf(d.key)
    setSkipMode(false)
    setReason(r?.skip_reason ?? null)
    setNote(r?.note ?? '')
  }
  const exportIcs = () => {
    downloadFile(`imunisasi-${child.nickname.toLowerCase().replace(/\W+/g, '-')}.ics`, scheduleIcs(child.nickname, doses, settings?.reminder_lead_days ?? [1], settings?.reminder_time ?? '07:00'), 'text/calendar')
  }

  return (
    <Screen
      title="Imunisasi"
      action={
        <button type="button" onClick={exportIcs} className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-bold active:bg-off">
          <IconCalendar /> Simpan ke kalender
        </button>
      }
    >
      <div className="mx-4 mt-1">
        <p className="text-[15px] text-ink-2">{child.schedule === 'KEMENKES' ? 'Program pemerintah (Kemenkes 2025)' : 'Rekomendasi IDAI 2024'}</p>
        <p className="mt-0.5 text-2xl font-extrabold">
          {done.length} <span className="text-base font-semibold text-ink-2">dari {counted} dosis sudah</span>
        </p>
      </div>

      {visit ? (
        <Section
          title={visit.lead.status === 'upcoming' ? `Kunjungan berikutnya · mulai ${shortDate(visit.lead.earliest)}` : 'Kunjungan sekarang'}
        >
          {visit.doses.map((d) => (
            <DoseRow key={d.key} d={d} today={today} onOpen={() => openDose(d)} detail />
          ))}
        </Section>
      ) : (
        <p className="mx-4 mt-4 rounded-2xl bg-panel p-4 text-base">Tidak ada imunisasi yang menunggu saat ini.</p>
      )}

      {catchUp.length > 0 && (
        <Section title="Terlewat · tanyakan ke petugas" note="Sudah lewat jadwal. Banyak yang masih bisa diberikan, tetapi petugas kesehatan yang menentukan; bawa Buku KIA saat kunjungan.">
          {catchUp.map((d) => (
            <DoseRow key={d.key} d={d} today={today} onOpen={() => openDose(d)} detail reason={d.status === 'skipped' ? [recordOf(d.key)?.skip_reason, recordOf(d.key)?.note].filter(Boolean).join(' · ') : null} />
          ))}
        </Section>
      )}

      {nextGroup.length > 0 && (
        <Section title={`Setelah itu · mulai ${shortDate(nextGroup[0].earliest)}`}>
          {nextGroup.map((d) => (
            <DoseRow key={d.key} d={d} today={today} onOpen={() => openDose(d)} />
          ))}
        </Section>
      )}

      {done.length > 0 && (
        <Section>
          <button type="button" aria-expanded={showDone} onClick={() => setShowDone(!showDone)} className="flex min-h-[52px] w-full items-center justify-between px-4 text-left active:bg-ground">
            <span className="text-base font-semibold">Sudah diberikan ({done.length})</span>
            <span className={`text-ink-2 transition-transform duration-200 ${showDone ? 'rotate-90' : ''}`}>
              <IconChevron size={16} />
            </span>
          </button>
          {showDone && done.map((d) => <DoseRow key={d.key} d={d} today={today} onOpen={() => openDose(d)} />)}
        </Section>
      )}

      <div className="mx-3 mt-4">
        <Button kind="secondary" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Sembunyikan jadwal lengkap' : 'Lihat jadwal lengkap'}
        </Button>
      </div>
      {showAll &&
        [...groups].sort(([a], [b]) => a - b).map(([m, list]) => (
          <Section key={m} title={m === 1000 ? 'Di sekolah (BIAS)' : ageLabel(m)}>
            {list.map((d) => (
              <DoseRow key={d.key} d={d} today={today} onOpen={() => openDose(d)} />
            ))}
          </Section>
        ))}
      <p className="mx-4 mt-4 text-[13px] leading-relaxed text-ink-2">
        Tombol Simpan ke kalender menyimpan jadwal yang akan datang ke kalender HP, lengkap dengan pengingat sesuai pilihan Ayah/Bunda. Data per {longDate(VACCINES_AS_OF)}.
      </p>

      <Sheet open={!!sel} onClose={() => setSel(null)} title={sel ? doseName(sel.dose) : ''}>
        {sel && (
          <>
            {vaccineName(sel.dose.vaccine) !== doseName(sel.dose).replace(/ \d+$/, '') && <p className="text-[15px] text-ink-2">{vaccineName(sel.dose.vaccine)}</p>}
            <div className="mt-3 rounded-xl border border-line p-3.5">
              <p className="text-[13px] font-semibold text-ink-2">Untuk apa</p>
              <p className="text-base leading-snug font-semibold">Melindungi dari {vaccineInfo(sel.dose).protects.charAt(0).toLowerCase() + vaccineInfo(sel.dose).protects.slice(1)}</p>
              <p className="mt-2.5 flex items-center gap-2 text-[13px] font-semibold text-ink-2">
                <KindTag dose={sel.dose} /> {vaccineInfo(sel.dose).label}
              </p>
              <p className="mt-1 text-[15px] leading-snug">{vaccineInfo(sel.dose).reason}</p>
            </div>
            {sel.dose.vaccine === 'DPT-HB-Hib' && <p className="mt-1 text-[13px] text-ink-2">Di sebagian wilayah diganti vaksin Heksavalen (Kemenkes, Des 2025).</p>}
            {sel.status === 'skipped' && (
              <p className="mt-3 rounded-xl bg-ground p-3.5 text-[15px] leading-snug">
                <b>Tidak diberikan</b>: {recordOf(sel.key)?.skip_reason ?? '—'}
                {recordOf(sel.key)?.note ? <span className="block text-ink-2">{recordOf(sel.key)?.note}</span> : null}
              </p>
            )}
            {sel.status !== 'school' && (
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-xl bg-ground p-3.5 text-[15px]">
                <dt className="text-ink-2">Mulai bisa</dt>
                <dd className="font-semibold">{longDate(sel.earliest)}{sel.status === 'waiting' ? ' (perkiraan)' : ''}</dd>
                <dt className="text-ink-2">Paling lambat</dt>
                <dd className="font-semibold">{sel.onTimeUntil ? longDate(sel.onTimeUntil) : '—'}</dd>
                <dt className="text-ink-2">Batas maksimal</dt>
                <dd className="font-semibold">{sel.maxUntil ? longDate(sel.maxUntil) : 'Tidak ada batas khusus'}</dd>
              </dl>
            )}
            {sel.dose.verification !== 'verified' && (
              <p className="mt-2 rounded-xl bg-warn/10 p-3 text-[13px] leading-snug font-semibold text-warn">
                Batas ini belum terverifikasi penuh dari sumber resmi. Konfirmasi ke petugas kesehatan.
              </p>
            )}
            {sel.dose.note && <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{sel.dose.note}</p>}
            <p className="mt-2 text-[13px] text-ink-2">
              Sumber: {sourceLabel(sel.dose.source)}
              {sel.dose.related_source ? `; ${sourceLabel(sel.dose.related_source)}` : ''}
            </p>

            {sel.dose.condition && (
              <div className="mt-3 overflow-hidden rounded-xl border border-line">
                {sel.dose.condition === 'region_endemic_je' ? (
                  <Toggle label="Daerah kami endemis JE" hint="Tanyakan ke Puskesmas setempat" checked={!!child.je_endemic} onChange={(v) => act.saveChild({ ...child, je_endemic: v })} />
                ) : (
                  <Toggle label="Vaksin rotavirus pentavalen" hint="Dosis ke-3 hanya untuk jenis ini" checked={!!child.rv_pentavalent} onChange={(v) => act.saveChild({ ...child, rv_pentavalent: v })} />
                )}
              </div>
            )}

            {!['school', 'waiting'].includes(sel.status) && (
              <div className="mt-4">
                <label htmlFor="given" className="block text-[15px] font-semibold">
                  Tanggal diberikan
                </label>
                <div className="mt-1.5">
                  <PickerInput id="given" type="date" value={date} max={today} min={child.birth_date} onChange={setDate} />
                </div>
                {sel.status === 'upcoming' && (
                  <p className="mt-1.5 text-[13px] leading-snug text-ink-2">Belum masuk jadwal (mulai {longDate(sel.earliest)}). Tandai hanya bila memang sudah diberikan.</p>
                )}
                <div className="mt-3 grid gap-2.5">
                  <Button
                    disabled={!date || date > today}
                    onClick={async () => {
                      await act.setVaccine(child.id, sel.key, date)
                      setSel(null)
                    }}
                  >
                    {sel.status === 'done' ? 'Simpan tanggal' : 'Tandai sudah diberikan'}
                  </Button>
                  {(sel.status === 'done' || sel.status === 'skipped') && (
                    <Button
                      kind="secondary"
                      onClick={async () => {
                        await act.setVaccine(child.id, sel.key, null)
                        setSel(null)
                      }}
                    >
                      {sel.status === 'done' ? 'Batalkan tanda sudah' : 'Hapus tanda tidak diberikan'}
                    </Button>
                  )}
                </div>
                {!['done', 'upcoming', 'waiting'].includes(sel.status) && (
                  <div className="mt-5 border-t border-line pt-4">
                    {!skipMode && sel.status !== 'skipped' ? (
                      <Button kind="quiet" onClick={() => setSkipMode(true)}>
                        Imunisasi ini tidak diberikan?
                      </Button>
                    ) : (
                      <>
                        <p className="text-[15px] font-semibold">Kenapa tidak diberikan?</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {SKIP_REASONS.map((r) => (
                            <Chip key={r} selected={reason === r} onClick={() => setReason(r)}>
                              {r}
                            </Chip>
                          ))}
                        </div>
                        <label htmlFor="skip-note" className="mt-4 block text-[15px] font-semibold">
                          Catatan <span className="font-normal text-ink-2">(opsional)</span>
                        </label>
                        <textarea
                          id="skip-note"
                          value={note}
                          maxLength={280}
                          rows={3}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Mis. demam, dijadwalkan ulang minggu depan"
                          className="mt-1.5 w-full rounded-xl border border-line bg-panel px-3.5 py-3 outline-none focus:border-ink"
                        />
                        <div className="mt-3">
                          <Button
                            kind="secondary"
                            disabled={!reason}
                            onClick={async () => {
                              await act.setVaccine(child.id, sel.key, null, { reason: reason!, note: note.trim() })
                              setSel(null)
                            }}
                          >
                            Simpan: tidak diberikan
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Sheet>
    </Screen>
  )
}

