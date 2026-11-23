import { useState, type ReactNode } from 'react'
import { DISCLAIMER } from '../components/DangerSheet'
import { DayBars } from '../components/DayBars'
import { IconChevron, IconShare } from '../components/icons'
import { Button, Chip, Screen } from '../components/ui'
import { shortLabel, visibleCounters } from '../lib/counters'
import { addDays, ageInMonths, developmentalBirth, todayIso } from '../lib/date'
import type { Child } from '../lib/db'
import { ageText, longDate, shortDate, weekday } from '../lib/format'
import { MONTHLY, redFlags } from '../lib/milestones'
import { go } from '../lib/nav'
import { counterRecap, formatValue, type Tone } from '../lib/recap'
import { useChildRows, useSettings } from '../lib/store'
import { ACTIVITIES, dayAchieved, DOMAIN_ORDER, DOMAINS, gridMonth } from '../lib/stimulation'
import { doseName, vaccineSchedule } from '../lib/vaccines'
import { useNow } from '../lib/hooks'
import { latestStatus, weighDue } from './Pertumbuhan'
import { nextVisit } from './Beranda'
import { TONE_DOT } from './Catatan'

type Finding = { tone: Tone | 'danger'; text: string; to: string }
const DOT: Record<Finding['tone'], string> = { ...TONE_DOT, danger: 'var(--color-danger)' }
const HEALTH_DOT = { aman: 'var(--ok)', perhatian: 'var(--warn)', bahaya: 'var(--color-danger)' }
const HEALTH_TEXT = { aman: 'Aman', perhatian: 'Perlu perhatian', bahaya: 'Tanda bahaya' }

function Card({ title, to, children }: { title: string; to: string; children: ReactNode }) {
  return (
    <section className="mx-3 mt-3 rounded-2xl bg-panel">
      <button type="button" onClick={() => go(to)} className="flex min-h-12 w-full items-center justify-between px-4 pt-1 text-left">
        <h2 className="text-base font-extrabold">{title}</h2>
        <span className="flex items-center text-[13px] font-semibold text-ink-2">
          Buka <IconChevron size={16} />
        </span>
      </button>
      <div className="px-4 pb-4">{children}</div>
    </section>
  )
}

const Line = ({ tone, children }: { tone: string; children: ReactNode }) => (
  <p className="flex gap-2 py-0.5 text-[15px] leading-snug">
    <i className="mt-[7px] size-2.5 shrink-0 rounded-full" style={{ background: tone }} />
    <span>{children}</span>
  </p>
)

/** Everything recorded for the child on one page, each part with its own conclusion, plus one summary on top. */
export function Rekap({ child }: { child: Child }) {
  const [now] = useNow()
  const today = todayIso(now)
  const rows = useChildRows(child.id)
  const settings = useSettings()
  const [n, setN] = useState<7 | 30>(7)
  if (!rows) return <Screen title="Rekap">{null}</Screen>

  const from = addDays(today, -n + 1)
  const devBirth = developmentalBirth(child.birth_date, today, child.gestational_weeks)
  const m = ageInMonths(devBirth, today)
  const findings: Finding[] = []

  // Kondisi harian
  const health = rows.health.filter((h) => h.day >= from).sort((a, b) => a.day.localeCompare(b.day))
  const todayCheck = rows.health.find((h) => h.day === today)
  const badDays = health.filter((h) => h.result !== 'aman')
  if (todayCheck?.result === 'bahaya') findings.push({ tone: 'danger', text: 'Hari ini ada tanda bahaya: segera ke fasilitas kesehatan.', to: 'cek-kondisi' })
  else if (todayCheck?.result === 'perhatian') findings.push({ tone: 'watch', text: 'Hari ini ada tanda kurang cairan.', to: 'cek-kondisi' })
  else if (!todayCheck) findings.push({ tone: 'info', text: 'Cek kondisi hari ini belum diisi.', to: 'cek-kondisi' })

  // Pertumbuhan
  const growth = latestStatus(child, rows.measurements)
  for (const [k, g] of [['Berat', growth.weight], ['Panjang/tinggi', growth.length]] as const)
    if (g && g.status.level !== 'ok') findings.push({ tone: 'watch', text: `${k}: ${g.status.label}.`, to: 'pertumbuhan' })
  const due = weighDue(rows.measurements, today)
  if (due) findings.push({ tone: 'info', text: 'Bulan ini belum ditimbang.', to: 'ukur' })

  // Imunisasi
  const doses = vaccineSchedule(child, rows.vaccines, today)
  const done = doses.filter((d) => d.status === 'done')
  const late = doses.filter((d) => d.status === 'late')
  const skipped = doses.filter((d) => d.status === 'skipped')
  const visit = nextVisit(doses)
  if (late.length) findings.push({ tone: 'watch', text: `${late.length} imunisasi lewat jadwal; sebagian besar masih bisa dikejar.`, to: 'imunisasi' })

  // Kemampuan
  const by = new Map(rows.answers.map((a) => [a.item_id, a.answer]))
  const flags = redFlags(m, rows.answers)
  const shown = MONTHLY.filter((x) => x.expected <= gridMonth(m))
  const yes = shown.filter((x) => by.get(x.id) === 'yes').length
  const unanswered = MONTHLY.filter((x) => x.expected === gridMonth(m) && !by.has(x.id)).length
  if (flags.length) findings.push({ tone: 'watch', text: `${flags.reduce((s, f) => s + f.items.length, 0)} kemampuan perlu dibicarakan dengan petugas kesehatan.`, to: 'tumbuh' })

  // Stimulasi
  const days = Array.from({ length: n }, (_, i) => addDays(today, i - n + 1)).filter((d) => d >= child.birth_date)
  const achieved = days.filter((d) => dayAchieved(d, rows.checks)).length
  const active = new Set(rows.checks.filter((c) => c.day >= from).map((c) => c.day)).size
  const domainCount = DOMAIN_ORDER.map((d) => ({ d, k: rows.checks.filter((c) => c.day >= from && ACTIVITIES.find((a) => a.id === c.activity_id)?.domain === d).length }))
  const rare = domainCount.filter((x) => x.k === 0 && ACTIVITIES.some((a) => a.domain === x.d && a.start <= m && m < a.end)).map((x) => DOMAINS[x.d])

  // Penghitung
  const counters = visibleCounters(ageInMonths(child.birth_date, today), settings?.enabled_counters)
  const recaps = counters.map((c) => ({ c, r: counterRecap(c, rows.events, child.birth_date, today, n, now) }))
  for (const { c, r } of recaps) if (r.tone === 'watch') findings.push({ tone: 'watch', text: `${shortLabel(c)} di bawah anjuran beberapa hari.`, to: `catatan/${c.id}` })

  const worst = findings.some((f) => f.tone === 'danger') ? 'danger' : findings.some((f) => f.tone === 'watch') ? 'watch' : 'ok'
  const headline = worst === 'danger' ? 'Perlu tindakan segera' : worst === 'watch' ? 'Ada yang perlu diperhatikan' : `${child.nickname} terlihat baik`

  const share = async () => {
    const text = [
      `Rekap ${child.nickname} (${ageText(child.birth_date, today)}), ${n} hari terakhir s.d. ${longDate(today)}`,
      `Kesimpulan: ${headline}.`,
      ...findings.map((f) => `- ${f.text}`),
      growth.weight ? `Berat ${growth.weight.row.weight_kg} kg (${shortDate(growth.weight.row.measured_on)}): ${growth.weight.status.label}` : 'Berat: belum dicatat',
      growth.length ? `Panjang/tinggi ${growth.length.row.length_cm} cm (${shortDate(growth.length.row.measured_on)}): ${growth.length.status.label}` : 'Panjang/tinggi: belum dicatat',
      `Imunisasi: ${done.length} dosis sudah${late.length ? `, ${late.length} lewat jadwal` : ''}${skipped.length ? `, ${skipped.length} tidak diberikan` : ''}.`,
      `Cek kondisi: ${health.length} dari ${days.length} hari diisi${badDays.length ? `, ${badDays.length} hari ada keluhan` : ', semua aman'}.`,
      `Stimulasi: target tercapai ${achieved} dari ${days.length} hari.`,
      ...recaps.filter(({ r }) => r.tone !== 'none').map(({ c, r }) => `${shortLabel(c)}: ${r.text}`),
      'Dicatat lewat aplikasi Stimulasi Anak. Bukan pengganti pemeriksaan tenaga kesehatan.',
    ].join('\n')
    if (navigator.share) await navigator.share({ title: `Rekap ${child.nickname}`, text }).catch(() => {})
    else await navigator.clipboard.writeText(text)
  }

  return (
    <Screen title="Rekap">
      <div className="mx-3 flex gap-2">
        <Chip selected={n === 7} onClick={() => setN(7)}>7 hari</Chip>
        <Chip selected={n === 30} onClick={() => setN(30)}>30 hari</Chip>
      </div>

      <section className="mx-3 mt-3 rounded-3xl bg-panel p-5" aria-live="polite">
        <p className="text-[13px] font-semibold text-ink-2">
          Kesimpulan · {ageText(child.birth_date, today)}
        </p>
        <h1 className="mt-1 flex items-center gap-2.5 text-2xl leading-tight font-extrabold text-balance">
          <i className="size-3.5 shrink-0 rounded-full" style={{ background: worst === 'danger' ? DOT.danger : worst === 'watch' ? DOT.watch : DOT.ok }} />
          {headline}
        </h1>
        {findings.length > 0 ? (
          <ul className="mt-3 space-y-0.5">
            {findings.map((f) => (
              <li key={f.text}>
                <button type="button" onClick={() => go(f.to)} className="flex min-h-11 w-full items-center gap-2 text-left text-[15px] leading-snug active:opacity-70">
                  <i className="size-2.5 shrink-0 rounded-full" style={{ background: DOT[f.tone] }} />
                  <span className="flex-1">{f.text}</span>
                  <IconChevron size={16} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[15px] leading-snug text-ink-2">Tidak ada yang perlu ditindaklanjuti dari data yang tercatat. Teruskan kebiasaan baiknya.</p>
        )}
      </section>

      <Card title="Kondisi harian" to="cek-kondisi">
        <div className="flex gap-[3px]" aria-label="Hasil cek kondisi per hari">
          {days.map((d) => {
            const h = rows.health.find((x) => x.day === d)
            return <span key={d} title={`${d}: ${h ? HEALTH_TEXT[h.result] : 'belum dicek'}`} className="h-6 flex-1 rounded-[4px]" style={{ background: h ? HEALTH_DOT[h.result] : 'var(--off)' }} />
          })}
        </div>
        {n === 7 && (
          <div className="mt-1 flex gap-[3px] text-center text-[11px] text-ink-2">
            {days.map((d) => (
              <span key={d} className="flex-1">{weekday(d)}</span>
            ))}
          </div>
        )}
        <Line tone={badDays.length ? 'var(--warn)' : 'var(--ok)'}>
          Diisi {health.length} dari {days.length} hari. {badDays.length ? `${badDays.length} hari ada keluhan (terakhir ${shortDate(badDays.at(-1)!.day)}).` : health.length ? 'Semua hari yang dicek aman.' : ''}
        </Line>
      </Card>

      <Card title="Pertumbuhan" to="pertumbuhan">
        {growth.weight ? (
          <Line tone={growth.weight.status.level === 'ok' ? 'var(--ok)' : 'var(--warn)'}>
            Berat <b>{growth.weight.row.weight_kg?.toLocaleString('id-ID')} kg</b> · {growth.weight.status.label} <span className="text-ink-2">({shortDate(growth.weight.row.measured_on)})</span>
          </Line>
        ) : (
          <Line tone="var(--off)">Berat belum dicatat.</Line>
        )}
        {growth.length ? (
          <Line tone={growth.length.status.level === 'ok' ? 'var(--ok)' : 'var(--warn)'}>
            Panjang/tinggi <b>{growth.length.row.length_cm?.toLocaleString('id-ID')} cm</b> · {growth.length.status.label} <span className="text-ink-2">({shortDate(growth.length.row.measured_on)})</span>
          </Line>
        ) : (
          <Line tone="var(--off)">Panjang/tinggi belum dicatat.</Line>
        )}
        <p className="mt-1 text-[13px] text-ink-2">{due ? 'Waktunya menimbang bulan ini.' : 'Penimbangan bulan ini sudah tercatat.'}</p>
      </Card>

      <Card title="Imunisasi" to="imunisasi">
        <Line tone={late.length ? 'var(--warn)' : 'var(--ok)'}>
          <b>{done.length}</b> dosis sudah diberikan{late.length ? `, ${late.length} lewat jadwal` : ''}{skipped.length ? `, ${skipped.length} tidak diberikan` : ''}.
        </Line>
        {visit && (
          <Line tone="var(--ink-2)">
            Berikutnya: {visit.doses.map((d) => doseName(d.dose)).join(', ')} · mulai {shortDate(visit.lead.earliest)}
          </Line>
        )}
      </Card>

      <Card title="Kemampuan" to="tumbuh">
        <Line tone={flags.length ? 'var(--warn)' : 'var(--ok)'}>
          {yes} kemampuan sudah bisa sampai usia ini.{flags.length ? ` ${flags.reduce((s, f) => s + f.items.length, 0)} perlu dibicarakan dengan petugas.` : ' Tidak ada tanda yang perlu dikhawatirkan.'}
        </Line>
        {unanswered > 0 && <Line tone="var(--off)">{unanswered} kemampuan bulan ini belum dijawab.</Line>}
      </Card>

      <Card title="Stimulasi" to="stimulasi">
        <Line tone={achieved * 2 >= days.length ? 'var(--ok)' : 'var(--ink-2)'}>
          Target harian tercapai <b>{achieved}</b> dari {days.length} hari; ada kegiatan di {active} hari.
        </Line>
        {rare.length > 0 && <Line tone="var(--off)">Belum disentuh: {rare.join(', ')}. Coba satu kegiatan dari domain ini.</Line>}
      </Card>

      {recaps.length > 0 && (
        <section className="mx-3 mt-3 rounded-2xl bg-panel">
          <div className="flex items-center justify-between px-4 pt-2">
            <h2 className="text-base font-extrabold">Catatan harian</h2>
            <button type="button" onClick={() => go('isi')} className="min-h-11 text-[13px] font-semibold text-ink underline underline-offset-4">
              Isi yang terlewat
            </button>
          </div>
          {recaps.map(({ c, r }) => (
            <button key={c.id} type="button" onClick={() => go(`catatan/${c.id}`)} className="block w-full border-t border-line px-4 py-3 text-left first:border-t-0 active:bg-ground">
              <span className="flex items-center gap-2">
                <i className="size-2.5 shrink-0 rounded-full" style={{ background: DOT[r.tone] }} />
                <span className="flex-1 text-[15px] font-bold">{shortLabel(c)}</span>
                {r.avg !== null && <span className="text-[15px] font-extrabold tabular-nums">{formatValue(r.avg, r.timer)}<span className="text-[12px] font-semibold text-ink-2">/hari</span></span>}
                <IconChevron size={16} />
              </span>
              <span className="mt-0.5 block pl-[18px] text-[13px] leading-snug text-ink-2">{r.text}</span>
              {r.tone !== 'none' && n === 7 && (
                <span className="mt-2 block pl-[18px]">
                  <DayBars days={r.days} timer={r.timer} today={today} height={40} />
                </span>
              )}
            </button>
          ))}
        </section>
      )}

      <div className="mx-3 mt-4">
        <Button kind="secondary" onClick={share}>
          <span className="flex items-center justify-center gap-2">
            <IconShare /> Bagikan rekap ke bidan/dokter
          </span>
        </Button>
      </div>
      <p className="mx-4 mt-3 text-[13px] leading-relaxed text-ink-2">{DISCLAIMER}</p>
    </Screen>
  )
}
