import { addDays, type IsoDate } from './date'
import { doseName, type ScheduledDose } from './vaccines'

const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n')
const d8 = (iso: IsoDate) => iso.replaceAll('-', '')

/**
 * Calendar file with one all-day event per visit (doses sharing a start date) and an alarm for every
 * lead time the parent chose, at their reminder time. The no-server fallback for reminders (PRD).
 */
export function scheduleIcs(childName: string, doses: ScheduledDose[], leadDays: number[], time: string) {
  const byDate = new Map<IsoDate, ScheduledDose[]>()
  for (const d of doses) if (['upcoming', 'due', 'ending_soon'].includes(d.status)) byDate.set(d.earliest, [...(byDate.get(d.earliest) ?? []), d])
  const [hh, mm] = time.split(':')
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Stimulasi Anak//ID', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:Imunisasi ${esc(childName)}`]
  for (const [date, list] of [...byDate].sort(([a], [b]) => a.localeCompare(b))) {
    const names = list.map((d) => doseName(d.dose)).join(', ')
    const until = list[0].onTimeUntil
    lines.push(
      'BEGIN:VEVENT',
      `UID:${list.map((d) => d.key).join('-')}@stimulasi-anak`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${d8(date)}`,
      `DTEND;VALUE=DATE:${d8(addDays(date, 1))}`,
      `SUMMARY:${esc(`Imunisasi ${childName}: ${names}`)}`,
      `DESCRIPTION:${esc(`Mulai bisa ${date}${until ? `. Sebaiknya sebelum ${until}` : ''}. Bawa Buku KIA.`)}`,
    )
    for (const lead of leadDays)
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(`${lead === 0 ? 'Hari ini' : `${lead} hari lagi`} ${childName} bisa imunisasi ${names}`)}`, `TRIGGER;VALUE=DATE-TIME:${d8(addDays(date, -lead))}T${hh}${mm}00`, 'END:VALARM')
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
