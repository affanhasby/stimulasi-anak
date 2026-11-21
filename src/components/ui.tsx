import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { back } from '../lib/nav'
import { IconBack, IconCheck, IconChevron, IconClose, IconEye, IconEyeOff } from './icons'
import { BrandPlate } from './Plate'

/** A screen: fixed header, its own scroller, and room for the tab bar (and counter dock) below. */
export function Screen({
  title,
  onBack,
  action,
  children,
  bottom = 'tabs',
}: {
  title?: ReactNode
  onBack?: boolean | string
  action?: ReactNode
  children: ReactNode
  bottom?: 'tabs' | 'dock' | 'none'
}) {
  const pad = bottom === 'dock' ? 'pb-[calc(188px+env(safe-area-inset-bottom))]' : bottom === 'tabs' ? 'pb-[calc(90px+env(safe-area-inset-bottom))]' : 'pb-[calc(24px+env(safe-area-inset-bottom))]'
  return (
    <div className="mx-auto flex h-full max-w-[430px] flex-col">
      {title !== undefined && (
        <header className="flex min-h-14 shrink-0 items-center gap-1 px-2 pt-[env(safe-area-inset-top)]">
          {onBack ? (
            <button type="button" onClick={() => back(typeof onBack === 'string' ? onBack : '')} aria-label="Kembali" className="grid size-11 place-items-center rounded-full active:bg-off">
              <IconBack />
            </button>
          ) : (
            <span className="w-2.5" />
          )}
          <h1 className="min-w-0 flex-1 truncate text-xl font-extrabold">{title}</h1>
          {action}
        </header>
      )}
      <main className={`scroller min-h-0 flex-1 ${pad}`}>{children}</main>
    </div>
  )
}

export function Section({ title, children, note, id }: { title?: string; children: ReactNode; note?: ReactNode; id?: string }) {
  return (
    <section id={id} className="mx-3 mt-4 scroll-mt-2">
      {title && <h2 className="mb-1.5 px-1.5 text-[15px] font-bold text-ink-2">{title}</h2>}
      <div className="overflow-hidden rounded-2xl bg-panel">{children}</div>
      {note && <p className="mt-1.5 px-1.5 text-[13px] leading-snug text-ink-2">{note}</p>}
    </section>
  )
}

export function Row({ label, value, onClick, href }: { label: ReactNode; value?: ReactNode; onClick?: () => void; href?: string }) {
  const inner = (
    <>
      <span className="min-w-0 flex-1 text-base">{label}</span>
      {value !== undefined && <span className="shrink-0 text-[15px] text-ink-2">{value}</span>}
      {(onClick || href) && (
        <span className="text-ink-2">
          <IconChevron size={16} />
        </span>
      )}
    </>
  )
  const cls = 'flex min-h-[52px] w-full items-center gap-2 border-t border-line px-4 text-left first:border-t-0 active:bg-ground'
  if (href) return <a href={href} className={cls}>{inner}</a>
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{inner}</button>
  return <div className={cls}>{inner}</div>
}

export function Toggle({ label, hint, checked, onChange }: { label: ReactNode; hint?: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId()
  return (
    <label htmlFor={id} className="flex min-h-[52px] items-center gap-3 border-t border-line px-4 py-2 first:border-t-0">
      <span className="min-w-0 flex-1">
        <span className="block text-base">{label}</span>
        {hint && <span className="block text-[13px] text-ink-2">{hint}</span>}
      </span>
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className="relative h-7 w-12 shrink-0 rounded-full bg-off transition-colors duration-200 peer-checked:bg-ink peer-focus-visible:outline-2 peer-focus-visible:outline-ink after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-panel after:transition-transform after:duration-200 peer-checked:after:translate-x-5"
      />
    </label>
  )
}

export function Chip({ selected, onClick, children, check }: { selected: boolean; onClick: () => void; children: ReactNode; check?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-11 rounded-full border px-4 text-[15px] font-semibold transition-colors duration-150 active:scale-[.97] ${
        selected ? 'border-ink bg-ink text-ground' : 'border-line bg-panel text-ink'
      } ${check ? 'inline-flex items-center gap-1.5' : ''}`}
    >
      {check && (
        <span className={`-ml-1 grid size-5 place-items-center rounded-full ${selected ? 'bg-ground text-ink' : 'border-2 border-off'}`} aria-hidden="true">
          {selected && <IconCheck size={14} />}
        </span>
      )}
      {children}
    </button>
  )
}

export function Button({
  children,
  onClick,
  kind = 'primary',
  type = 'button',
  disabled,
  full = true,
}: {
  children: ReactNode
  onClick?: () => void
  kind?: 'primary' | 'secondary' | 'danger' | 'destructive' | 'quiet'
  type?: 'button' | 'submit'
  disabled?: boolean
  full?: boolean
}) {
  const tone = {
    primary: 'bg-ink text-ground',
    secondary: 'border border-line bg-panel text-ink',
    danger: 'bg-danger text-white',
    destructive: 'border-2 border-late bg-panel text-late', // irreversible but not a health danger: no danger red
    quiet: 'text-ink underline underline-offset-4',
  }[kind]
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${full ? 'w-full' : ''} min-h-12 rounded-2xl px-5 text-base font-bold transition-[transform,opacity] duration-150 active:scale-[.98] disabled:opacity-50 ${tone}`}
    >
      {children}
    </button>
  )
}

export function Field({
  label,
  hint,
  error,
  reveal,
  ...input
}: { label: string; hint?: ReactNode; error?: string | null; reveal?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  const [shown, setShown] = useState(false)
  return (
    <div className="mt-4 first:mt-0">
      <label htmlFor={id} className="mb-1.5 block text-[15px] font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={!!error || undefined}
          aria-describedby={error || hint ? `${id}-d` : undefined}
          className={`min-h-12 w-full rounded-xl border border-line bg-panel px-3.5 text-ink outline-none placeholder:text-ink-2/70 focus:border-ink aria-invalid:border-late ${reveal ? 'pr-12' : ''}`}
          {...input}
          type={reveal ? (shown ? 'text' : 'password') : input.type}
        />
        {reveal && (
          <button
            type="button"
            onClick={() => setShown(!shown)}
            aria-label={shown ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            aria-pressed={shown}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-xl text-ink-2 active:text-ink"
          >
            {shown ? <IconEyeOff /> : <IconEye />}
          </button>
        )}
      </div>
      {(error || hint) && (
        <p id={`${id}-d`} className={`mt-1.5 text-[13px] leading-snug ${error ? 'font-semibold text-late' : 'text-ink-2'}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
}

/** Bottom sheet on a native <dialog>: focus trap, Escape and the back gesture come for free. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-0 mt-auto max-h-[88dvh] w-full max-w-none overscroll-contain rounded-t-3xl bg-panel p-0 text-ink backdrop:bg-black/50 open:animate-[sheet-up_280ms_cubic-bezier(.22,1,.36,1)] sm:mx-auto sm:max-w-[430px]"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between bg-panel px-5 pt-5 pb-2">
        <h2 id={id} className="text-xl font-extrabold">
          {title}
        </h2>
        <button type="button" onClick={onClose} aria-label="Tutup" className="grid size-11 place-items-center rounded-full active:bg-off">
          <IconClose />
        </button>
      </div>
      <div className="px-5 pb-[calc(20px+env(safe-area-inset-bottom))]">{children}</div>
    </dialog>
  )
}

export function Splash() {
  return (
    <div className="grid h-full place-items-center" aria-busy="true" aria-label="Memuat">
      <BrandPlate size={64} />
    </div>
  )
}
