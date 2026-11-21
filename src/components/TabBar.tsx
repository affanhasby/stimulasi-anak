import { go } from '../lib/nav'
import { IconChart, IconHome, IconMenu, IconPlate, IconSprout, IconSyringe } from './icons'

export const TABS = [
  ['', 'Beranda', IconHome],
  ['stimulasi', 'Stimulasi', IconPlate],
  ['imunisasi', 'Imunisasi', IconSyringe],
  ['tumbuh', 'Kemampuan', IconSprout],
  ['rekap', 'Rekap', IconChart],
  ['lainnya', 'Lainnya', IconMenu],
] as const

export function TabBar({ route }: { route: string }) {
  const top = route.split('/')[0]
  return (
    <nav aria-label="Menu utama" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-panel pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-[430px]">
        {TABS.map(([path, label, Icon]) => {
          const on = top === path
          return (
            <li key={label} className="flex-auto">
              <a
                href={`#/${path}`}
                onClick={(e) => {
                  e.preventDefault()
                  if (!on) go(path, true)
                }}
                aria-current={on ? 'page' : undefined}
                className={`flex h-[70px] w-full flex-col items-center justify-center gap-1 text-xs active:scale-95 ${on ? 'font-bold text-ink' : 'text-ink-2'}`}
              >
                <Icon />
                {label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
