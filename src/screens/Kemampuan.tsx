import { useState } from 'react'
import { DISCLAIMER } from '../components/DangerSheet'
import { DomainMark } from '../components/Plate'
import { IconAlert, IconChevron, IconShare } from '../components/icons'
import { Button, Screen, Section, Sheet } from '../components/ui'
import { sourceLabel } from '../lib/content'
import { ageInMonths, developmentalBirth } from '../lib/date'
import type { Child } from '../lib/db'
import { ageLabel, ageText } from '../lib/format'
import { useToday } from '../lib/hooks'
import { MONTHLY, milestonesForMonth, nextScreenings, RED_FLAGS, redFlags, type Flag, type Item } from '../lib/milestones'
import { useActions, useChildRows } from '../lib/store'
import { ACTIVITIES, DOMAINS, gridMonth, nextGridMonth } from '../lib/stimulation'

// Plain words for the screening names in the data (the source names stay in the data and the citation).
const PLAIN_SCREENING: Record<string, string> = {
  'Skrining perkembangan terstandar (AAP)': 'Pemeriksaan perkembangan oleh dokter',
  'Skrining autisme (AAP)': 'Pemeriksaan tanda autisme oleh dokter',
  'KPSP di fasilitas kesehatan (SDIDTK)': 'Cek perkembangan (KPSP) di Posyandu/Puskesmas',
}

const FLAG_UI: Record<Flag['rule'], { title: string; tone: string }> = {
  'RF-REGRESSION': { title: 'Periksakan segera', tone: 'var(--late)' },
  'RF-KIA-CUTOFF': { title: 'Sebaiknya periksakan', tone: 'var(--late)' },
  'RF-CDC-MISSING': { title: 'Bicarakan dengan dokter anak', tone: 'var(--warn)' },
}
const FLAG_TEXT: Record<Flag['rule'], string> = {
  'RF-REGRESSION': 'Kehilangan kemampuan yang sebelumnya sudah bisa, di usia berapa pun, perlu dicek dokter.',
  'RF-KIA-CUTOFF': 'Ada kemampuan yang belum muncul. Buku KIA menganjurkan memeriksakan ke Puskesmas/dokter. Banyak anak hanya butuh stimulasi lebih, tetapi pemeriksaan dini penting.',
  'RF-CDC-MISSING': 'Bicarakan dengan dokter anak dan minta skrining perkembangan.',
}

function ItemRow({ item, answer, onAnswer }: { item: Item; answer?: 'yes' | 'no'; onAnswer: (a: 'yes' | 'no') => void }) {
  return (
    <div className="flex items-center gap-2.5 border-t border-line py-2 pr-2 pl-3.5 first:border-t-0">
      <DomainMark domain={item.domain} />
      <p className="min-w-0 flex-1 text-[15px] leading-snug">{item.text}</p>
      <div className="flex shrink-0 gap-1" role="group" aria-label={item.text}>
        {(['yes', 'no'] as const).map((a) => (
          <button
            key={a}
            type="button"
            aria-pressed={answer === a}
            onClick={() => onAnswer(a)}
            className={`min-h-11 min-w-[58px] rounded-xl border px-2 text-[13px] font-bold transition-colors duration-150 active:scale-95 ${
              answer === a ? (a === 'yes' ? 'border-ink bg-ink text-ground' : 'border-ink bg-off text-ink') : 'border-line text-ink-2'
            }`}
          >
            {a === 'yes' ? 'Sudah' : 'Belum'}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Kemampuan({ child }: { child: Child }) {
  const today = useToday()
  const rows = useChildRows(child.id)
  const act = useActions()
  const devBirth = developmentalBirth(child.birth_date, today, child.gestational_weeks)
  const m = ageInMonths(devBirth, today)
  const [concern, setConcern] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const answers = rows?.answers ?? []
  const by = new Map(answers.map((a) => [a.item_id, a.answer]))
  const answer = (id: string) => (a: 'yes' | 'no') => act.answer(child.id, id, a)

  // This month's skills; earlier ones still not seen as "Sudah" while their check age has not passed; next month's preview.
  const g = gridMonth(m)
  const next = nextGridMonth(m)
  const now = milestonesForMonth(g)
  const carry = MONTHLY.filter((x) => x.expected < g && by.get(x.id) !== 'yes' && (x.cutoff === null || x.cutoff > m) && x.expected >= g - 6)
  const upcomingItems = next !== null ? milestonesForMonth(next) : []
  const flags = redFlags(m, answers)
  // Only the soonest screening(s), not the whole programme.
  const upcoming = nextScreenings(m)
  const soonest = Math.min(...upcoming.map((x) => x.next!))
  const screenings = upcoming.filter((x) => x.next === soonest)

  const share = async (f: Flag) => {
    const text = [
      `Ringkasan perkembangan ${child.nickname} (${ageText(child.birth_date, today)}${devBirth !== child.birth_date ? `, usia koreksi ${ageText(devBirth, today)}` : ''})`,
      `${FLAG_UI[f.rule].title}. Kemampuan yang belum muncul:`,
      ...f.items.map((i) => `- ${i.text} (${DOMAINS[i.domain]})`),
      `Acuan: ${sourceLabel(RED_FLAGS[f.rule].source, (RED_FLAGS[f.rule] as { page?: string }).page)}. Dicatat lewat aplikasi Stimulasi Anak.`,
    ].join('\n')
    if (navigator.share) await navigator.share({ title: 'Ringkasan perkembangan', text }).catch(() => {})
    else await navigator.clipboard.writeText(text)
  }

  return (
    <Screen title="Kemampuan">
      <p className="mx-4 text-[15px] leading-snug text-ink-2">Yang perlu dicek sesuai usia {child.nickname} sekarang ({ageText(devBirth, today)}). Jawab dengan satu ketukan; jawaban bisa diubah kapan saja.</p>

      {flags.map((f) => {
        const domains = new Set(f.items.map((i) => i.domain))
        const help = ACTIVITIES.filter((a) => a.start <= m && m < a.end && domains.has(a.domain)).slice(0, 3)
        return (
          <section key={f.rule} role="alert" className="mx-3 mt-3 rounded-2xl border-2 bg-panel p-4" style={{ borderColor: FLAG_UI[f.rule].tone }}>
            <p className="flex items-center gap-2 text-base font-extrabold" style={{ color: FLAG_UI[f.rule].tone }}>
              <IconAlert /> {FLAG_UI[f.rule].title}
            </p>
            <p className="mt-1.5 text-[15px] leading-snug">{FLAG_TEXT[f.rule]}</p>
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[15px]">
              {f.items.map((i) => (
                <li key={i.id}>{i.text}</li>
              ))}
            </ul>
            {help.length > 0 && (
              <p className="mt-2 text-[13px] leading-snug text-ink-2">Sambil menunggu jadwal periksa, lakukan: {help.map((a) => a.title).join(', ')}.</p>
            )}
            <p className="mt-2 text-[13px] text-ink-2">
              Sumber: {sourceLabel(RED_FLAGS[f.rule].source, (RED_FLAGS[f.rule] as { page?: string }).page)}. {DISCLAIMER.split('. ')[1]}.
            </p>
            <div className="mt-3">
              <Button kind="secondary" onClick={() => share(f)}>
                <span className="flex items-center justify-center gap-2">
                  <IconShare /> Bagikan ke dokter
                </span>
              </Button>
            </div>
          </section>
        )
      })}

      <Section
        title={`Biasanya mulai terlihat di usia ${g} bulan`}
        note="Perkiraan bulan dari CDC/AAP, WHO, dan IDAI. Saran periksa tetap mengikuti batas usia Buku KIA, jadi 'Belum' di sini belum tentu masalah."
      >
        {now.length ? now.map((i) => <ItemRow key={i.id} item={i} answer={by.get(i.id)} onAnswer={answer(i.id)} />) : <p className="px-4 py-4 text-[15px] text-ink-2">Bulan ini tidak ada kemampuan baru yang dicek. Lanjutkan stimulasi harian.</p>}
      </Section>

      {carry.length > 0 && (
        <Section title="Dari bulan-bulan sebelumnya" note="Belum dijawab 'Sudah'. Masih dalam rentang wajar; jawab bila sudah terlihat.">
          {carry.map((i) => (
            <ItemRow key={i.id} item={i} answer={by.get(i.id)} onAnswer={answer(i.id)} />
          ))}
        </Section>
      )}

      {upcomingItems.length > 0 && (
        <Section>
          <button type="button" aria-expanded={showNext} onClick={() => setShowNext(!showNext)} className="flex min-h-[52px] w-full items-center justify-between px-4 text-left active:bg-ground">
            <span className="text-base font-semibold">Berikutnya di usia {next} bulan ({upcomingItems.length})</span>
            <span className={`text-ink-2 transition-transform duration-200 ${showNext ? 'rotate-90' : ''}`}>
              <IconChevron size={16} />
            </span>
          </button>
          {showNext && upcomingItems.map((i) => <ItemRow key={i.id} item={i} answer={by.get(i.id)} onAnswer={answer(i.id)} />)}
        </Section>
      )}

      {screenings.length > 0 && (
        <Section title="Skrining di Posyandu/dokter">
          {screenings.map((s) => (
            <div key={s.what} className="border-t border-line px-4 py-3 first:border-t-0">
              <p className="text-base font-semibold">{PLAIN_SCREENING[s.what] ?? s.what}</p>
              <p className="text-[13px] text-ink-2">
                {s.next === m ? 'Bulan ini' : `Berikutnya di ${ageLabel(s.next!).toLowerCase()}`} · tanyakan saat kunjungan. ({sourceLabel(s.source, s.page)})
              </p>
            </div>
          ))}
        </Section>
      )}

      <div className="mx-3 mt-5">
        <Button kind="secondary" onClick={() => setConcern(true)}>
          Saya khawatir
        </Button>
      </div>

      <Sheet open={concern} onClose={() => setConcern(false)} title="Kekhawatiran Ayah/Bunda">
        <p className="text-base leading-relaxed">{RED_FLAGS['RF-PARENT-CONCERN'].text}</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-[15px] leading-snug">
          <li>Catat apa yang membuat khawatir: sejak kapan, seberapa sering.</li>
          <li>Bawa Buku KIA dan catatan ini ke Posyandu, Puskesmas, atau dokter anak.</li>
          <li>Minta skrining perkembangan (KPSP).</li>
        </ul>
        <p className="mt-3 text-[13px] text-ink-2">Sumber: {sourceLabel(RED_FLAGS['RF-PARENT-CONCERN'].source)}</p>
        <div className="mt-4">
          <Button onClick={() => setConcern(false)}>Mengerti</Button>
        </div>
      </Sheet>
    </Screen>
  )
}
