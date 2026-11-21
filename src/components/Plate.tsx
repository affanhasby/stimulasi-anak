import { IconCheck } from './icons'
import { DOMAIN_ORDER, DOMAINS, type Domain } from '../lib/stimulation'

export type SectorState = 'done' | 'todo' | 'off'

function sector(c: number, ro: number, ri: number, gap: number, i: number) {
  const p = (r: number, deg: number) => {
    const a = (deg * Math.PI) / 180
    return `${(c + r * Math.sin(a)).toFixed(2)} ${(c - r * Math.cos(a)).toFixed(2)}`
  }
  const a0 = i * 60 + gap
  const a1 = (i + 1) * 60 - gap
  return `M${p(ro, a0)}A${ro} ${ro} 0 0 1 ${p(ro, a1)}L${p(ri, a1)}A${ri} ${ri} 0 0 0 ${p(ri, a0)}Z`
}

const fill = (d: Domain, s: SectorState) => (s === 'off' ? 'var(--off)' : `var(--color-${d})`)

/**
 * Today's plate: one sector per development domain, filled once an activity of that domain is ticked.
 * The centre stays empty until the day is achieved, then carries a check; progress is never a score.
 */
export function Plate({ states, achieved }: { states: Record<Domain, SectorState>; achieved: boolean }) {
  const done = DOMAIN_ORDER.filter((d) => states[d] === 'done').map((d) => DOMAINS[d])
  return (
    <div className="relative size-[152px] shrink-0">
      <svg
        viewBox="0 0 160 160"
        className="size-full"
        role="img"
        aria-label={`Piring stimulasi: ${done.length ? `${done.join(', ')} terisi` : 'belum ada yang terisi'}${achieved ? ', target hari ini tercapai' : ''}`}
      >
        {DOMAIN_ORDER.map((d, i) => (
          <path
            key={d}
            d={sector(80, 76, 46, 2.5, i)}
            fill={fill(d, states[d])}
            fillOpacity={states[d] === 'todo' ? 0.2 : 1}
            className="origin-center transition-[fill-opacity,scale] duration-300 ease-out data-[done=true]:animate-[settle_380ms_cubic-bezier(.22,1,.36,1)]"
            data-done={states[d] === 'done'}
          />
        ))}
      </svg>
      {achieved && (
        <span className="absolute inset-0 m-auto grid size-12 place-items-center rounded-full bg-ink text-ground">
          <IconCheck />
        </span>
      )}
    </div>
  )
}

/** Same geometry at small scale, so days compare at a glance; an achieved day gets an ink ring. */
export function MiniPlate({ states, achieved, size = 24 }: { states: Record<Domain, SectorState>; achieved: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 28 28" width={size} height={size} aria-hidden="true">
      {/* An unbroken empty ring underneath, so an untouched day reads as a plate, not a cog. */}
      <circle cx="14" cy="14" r="9" fill="none" stroke="var(--off)" strokeWidth="6" />
      {DOMAIN_ORDER.map((d, i) =>
        states[d] === 'done' ? <path key={d} d={sector(14, 12, 6, 0, i)} fill={fill(d, 'done')} /> : null,
      )}
      {achieved && <circle cx="14" cy="14" r="13.25" fill="none" stroke="var(--ink)" strokeWidth="1.5" />}
    </svg>
  )
}

/** The activity's domain as a saturated mark in its sector colour, so each row matches its plate portion. */
export function DomainMark({ domain }: { domain: Domain }) {
  return <span aria-hidden="true" className="h-7 w-2.5 shrink-0 rounded-full" style={{ background: `var(--color-${domain})` }} />
}

/** The app's mark: a full plate, every domain served. Also the source of the PWA icon. */
export function BrandPlate({ size = 88 }: { size?: number }) {
  return (
    <svg viewBox="0 0 160 160" width={size} height={size} aria-hidden="true">
      {DOMAIN_ORDER.map((d, i) => (
        <path key={d} d={sector(80, 76, 40, 2.5, i)} fill={`var(--color-${d})`} />
      ))}
    </svg>
  )
}
