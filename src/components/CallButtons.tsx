import { HOTLINE } from '../lib/content'
import { waLink } from '../lib/phone'
import { useSettings } from '../lib/store'
import { IconChat, IconPhone } from './icons'

/** Emergency contacts: the parent's own doctor on WhatsApp (if set), plus Darurat 119 and Halo Kemenkes unless hidden.
 * The hotlines always show while no doctor number is saved, so this is never empty. */
export function CallButtons({ compact = false, panel = false }: { compact?: boolean; panel?: boolean }) {
  const s = useSettings()
  const wa = s ? waLink(s.doctor_phone) : null
  const hotlines = !wa || s?.show_hotlines !== false
  const size = compact ? 'min-h-11 gap-1.5 text-sm' : 'min-h-12 gap-2'
  const base = `flex ${size} items-center justify-center rounded-xl px-2 font-bold active:scale-[.98]`
  const outline = `${base} border border-line ${panel ? 'bg-panel' : ''}`
  return (
    <div className="grid grid-cols-2 gap-2">
      {wa && (
        <a href={wa} target="_blank" rel="noreferrer" className={`col-span-2 ${hotlines ? outline : `${base} bg-danger text-white`}`}>
          <IconChat /> <span className="truncate">WhatsApp {s?.doctor_name.trim() || 'dokter'}</span>
        </a>
      )}
      {hotlines && (
        <>
          <a href="tel:119" className={`${base} bg-danger text-white`}>
            <IconPhone /> Darurat 119
          </a>
          <a href={`tel:${HOTLINE.number.replace(/\D/g, '')}`} className={outline}>
            <IconPhone /> {HOTLINE.label}
          </a>
        </>
      )}
    </div>
  )
}
