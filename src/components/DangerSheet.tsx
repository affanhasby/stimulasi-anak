import { dangerGroupsFor, HOTLINE, sourceLabel } from '../lib/content'
import { daysBetween, todayIso } from '../lib/date'
import type { Child } from '../lib/db'
import { IconPhone } from './icons'
import { Sheet } from './ui'

export const DISCLAIMER =
  'Aplikasi ini alat bantu pemantauan berdasarkan Buku KIA Kemenkes RI, IDAI, CDC/AAP, dan WHO. Bukan alat diagnosis dan tidak menggantikan pemeriksaan bidan, dokter, atau Posyandu. Jika ada tanda bahaya, segera ke fasilitas kesehatan terdekat atau hubungi 119.'

export function DangerSheet({ child, open, onClose }: { child: Child; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Tanda bahaya">
      <p className="text-[15px] leading-relaxed">Satu tanda saja sudah cukup. Segera bawa {child.nickname} ke fasilitas kesehatan terdekat.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a href="tel:119" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-danger font-bold text-white active:scale-[.98]">
          <IconPhone /> Darurat 119
        </a>
        <a href={`tel:${HOTLINE.number.replace(/\D/g, '')}`} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line font-bold active:scale-[.98]">
          <IconPhone /> {HOTLINE.label}
        </a>
      </div>
      {dangerGroupsFor(daysBetween(child.birth_date, todayIso())).map((g) => (
        <section key={g.id} className="mt-5">
          <h3 className="text-base font-bold">{g.label}</h3>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[15px] leading-snug marker:text-danger">
            {g.signs.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          {g.rule && <p className="mt-1.5 text-[15px] leading-snug">{g.rule}</p>}
          <p className="mt-1.5 text-[13px] text-ink-2">Sumber: {sourceLabel(g.source, g.page)}</p>
        </section>
      ))}
      <p className="mt-5 rounded-xl bg-ground p-3 text-[13px] leading-relaxed text-ink-2">{DISCLAIMER}</p>
    </Sheet>
  )
}
