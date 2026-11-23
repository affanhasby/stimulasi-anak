import { useState } from 'react'
import { valueAt, type Indicator } from '../lib/growth'

export type Point = { months: number; value: number; label: string }

const Z = [-3, -2, 0, 2, 3]

/**
 * Reference bands from the WHO curves with the child's own measurements on top.
 * Inside -2..+2 is the normal zone; tap a point to read its value.
 */
export function GrowthChart({ ind, sex, points, fromMonth, toMonth, height = 220, compact = false }: {
  ind: Indicator
  sex: 'M' | 'F'
  points: Point[]
  fromMonth: number
  toMonth: number
  height?: number
  compact?: boolean
}) {
  const [sel, setSel] = useState<number | null>(points.length ? points.length - 1 : null)
  const W = 340
  const pad = { l: compact ? 6 : 30, r: 8, t: 10, b: compact ? 8 : 22 }
  const steps = 48
  const months = Array.from({ length: steps + 1 }, (_, i) => fromMonth + ((toMonth - fromMonth) * i) / steps)
  const curves = Z.map((z) => months.map((m) => valueAt(ind, sex, m, z)))
  const vals = [...curves.flat(), ...points.map((p) => p.value)]
  const lo = Math.min(...vals) * 0.97
  const hi = Math.max(...vals) * 1.02
  const x = (m: number) => pad.l + ((m - fromMonth) / (toMonth - fromMonth)) * (W - pad.l - pad.r)
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (height - pad.t - pad.b)
  const line = (vs: number[]) => vs.map((v, i) => `${i ? 'L' : 'M'}${x(months[i]).toFixed(1)} ${y(v).toFixed(1)}`).join('')
  const band = (a: number[], b: number[]) => `${line(a)}${[...b].reverse().map((v, i) => `L${x(months[steps - i]).toFixed(1)} ${y(v).toFixed(1)}`).join('')}Z`
  const unit = ind === 'wfa' ? 'kg' : 'cm'
  // Round-number ticks at their own values: every 1 or 2 kg, every 5 cm.
  const step = ind === 'wfa' ? (hi - lo > 8 ? 2 : 1) : 5
  const ticks = Array.from({ length: Math.floor(hi / step) - Math.ceil(lo / step) + 1 }, (_, i) => (Math.ceil(lo / step) + i) * step)
  const p = sel !== null ? points[sel] : null

  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label={`Grafik ${ind === 'wfa' ? 'berat' : 'panjang/tinggi'} menurut umur, standar WHO`}>
        <path d={band(curves[0], curves[1])} fill="color-mix(in oklab, var(--warn) 16%, transparent)" />
        <path d={band(curves[3], curves[4])} fill="color-mix(in oklab, var(--warn) 16%, transparent)" />
        <path d={band(curves[1], curves[3])} fill="color-mix(in oklab, var(--ok) 16%, transparent)" />
        <path d={line(curves[2])} fill="none" stroke="var(--ok)" strokeWidth="1.5" strokeDasharray="4 4" />
        {!compact &&
          ticks.filter((t) => y(t) < height - pad.b - 8).map((t) => (
            <text key={t} x={pad.l - 4} y={y(t) + 4} textAnchor="end" className="fill-ink-2 text-xs">
              {t}
            </text>
          ))}
        {!compact &&
          [fromMonth, Math.round((fromMonth + toMonth) / 2), toMonth].map((m, i) => (
            // First and last labels hug the plot edges so neither is cut off.
            <text key={m} x={x(m)} y={height - 6} textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'} className="fill-ink-2 text-xs">
              {m} bln
            </text>
          ))}
        {points.length > 1 && <path d={points.map((q, i) => `${i ? 'L' : 'M'}${x(q.months)} ${y(q.value)}`).join('')} fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" />}
        {points.map((q, i) => (
          <g key={i} onClick={() => setSel(i)} className="cursor-pointer">
            <circle cx={x(q.months)} cy={y(q.value)} r="14" fill="transparent" />
            <circle cx={x(q.months)} cy={y(q.value)} r={sel === i ? 6 : 4.5} fill={sel === i ? 'var(--ink)' : 'var(--panel)'} stroke="var(--ink)" strokeWidth="2.5" className="transition-[r] duration-150" />
          </g>
        ))}
      </svg>
      {!compact && p && (
        <figcaption className="mt-1 text-center text-[13px] text-ink-2">
          <b className="text-ink">
            {p.value.toLocaleString('id-ID', { maximumFractionDigits: 1 })} {unit}
          </b>{' '}
          · {p.label}
        </figcaption>
      )}
    </figure>
  )
}
