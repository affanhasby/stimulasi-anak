---
name: Stimulasi Anak
description: Today's stimulation as one balanced plate, in the flat colour language of the Isi Piringku infographic.
colors:
  ground: "#f4f6f3"
  panel: "#ffffff"
  ink: "#1f2a30"
  ink-2: "#4f5c63"
  line: "#e3e7e3"
  off: "#dde2de"
  tile: "#1f2a30"
  tile-active: "#3b4b54"
  on-tile: "#ffffff"
  sosial: "#e2557f"
  bahasa: "#f09a2a"
  kognitif: "#7357d1"
  motorik_kasar: "#2e9a66"
  motorik_halus: "#2685cf"
  kemandirian: "#b8921c"
  ok: "#217a50"
  warn: "#a8640c"
  late: "#b3372f"
  danger: "#c62e2e"
typography:
  display:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 800
    lineHeight: 1.05
    fontFeature: "tnum"
  verdict:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.25
  headline:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.25
  counter:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1
    fontFeature: "tnum"
  title:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.375
  body:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.625
  meta:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.375
  label:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.333
rounded:
  tag: "4px"
  chip: "6px"
  control: "12px"
  panel: "16px"
  sheet: "24px"
  pill: "9999px"
spacing:
  hairline: "2px"
  tile-gap: "6px"
  stack: "10px"
  inset-list: "12px"
  row: "14px"
  inset-screen: "18px"
components:
  button-danger-pill:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.panel}"
    rounded: "{rounded.pill}"
    typography: "{typography.label}"
    padding: "8px 16px 8px 12px"
    height: "44px"
  button-outline:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  tick:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.pill}"
    size: "34px"
  tick-done:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.panel}"
    rounded: "{rounded.pill}"
    size: "34px"
  activity-list:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "6px 6px 6px 14px"
  counter-tile:
    backgroundColor: "{colors.tile}"
    textColor: "{colors.on-tile}"
    rounded: "{rounded.panel}"
    typography: "{typography.counter}"
    padding: "10px 7px"
    height: "88px"
  counter-tile-running:
    backgroundColor: "{colors.tile-active}"
    textColor: "{colors.on-tile}"
    rounded: "{rounded.panel}"
    height: "88px"
  status-chip-catch-up:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.warn}"
    rounded: "{rounded.chip}"
    typography: "{typography.label}"
    padding: "4px 8px"
  status-chip-warn:
    backgroundColor: "{colors.warn}"
    textColor: "{colors.panel}"
    rounded: "{rounded.chip}"
    typography: "{typography.label}"
    padding: "4px 8px"
  status-chip-ok:
    backgroundColor: "{colors.ok}"
    textColor: "{colors.panel}"
    rounded: "{rounded.chip}"
    typography: "{typography.label}"
    padding: "4px 8px"
  status-chip-upcoming:
    backgroundColor: "{colors.off}"
    textColor: "{colors.ink}"
    rounded: "{rounded.chip}"
    typography: "{typography.label}"
    padding: "4px 8px"
  status-chip-done:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    rounded: "{rounded.chip}"
    typography: "{typography.label}"
    padding: "4px 8px"
  tag-new:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    rounded: "{rounded.tag}"
    typography: "{typography.label}"
    padding: "2px 6px"
  tag-wajib:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tag}"
    typography: "{typography.label}"
    padding: "2px 6px"
  tag-tambahan:
    backgroundColor: "{colors.off}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.tag}"
    typography: "{typography.label}"
    padding: "2px 6px"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    rounded: "{rounded.panel}"
    padding: "0 20px"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "0 20px"
    height: "48px"
  button-call-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.panel}"
    rounded: "{rounded.control}"
    height: "48px"
  answer-yes:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.danger}"
    rounded: "{rounded.panel}"
    height: "64px"
  answer-no:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    rounded: "{rounded.panel}"
    height: "64px"
  chip-choice:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  chip-choice-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  field:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "48px"
  result-card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    typography: "{typography.verdict}"
    padding: "32px 20px 24px"
  result-disc-aman:
    backgroundColor: "{colors.ok}"
    textColor: "{colors.panel}"
    rounded: "{rounded.pill}"
    size: "80px"
  result-disc-perhatian:
    backgroundColor: "{colors.warn}"
    textColor: "{colors.panel}"
    rounded: "{rounded.pill}"
    size: "80px"
  result-disc-bahaya:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.panel}"
    rounded: "{rounded.pill}"
    size: "80px"
  danger-alert:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "14px"
  badge-unread:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    rounded: "{rounded.pill}"
    typography: "{typography.label}"
    height: "20px"
  notice-toast:
    backgroundColor: "{colors.tile}"
    textColor: "{colors.on-tile}"
    rounded: "{rounded.panel}"
    padding: "8px 6px 8px 16px"
  growth-badge-normal:
    backgroundColor: "{colors.ok}"
    textColor: "{colors.panel}"
    rounded: "{rounded.chip}"
    typography: "{typography.label}"
    padding: "4px 8px"
  growth-badge-watch:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.warn}"
    rounded: "{rounded.chip}"
    typography: "{typography.label}"
    padding: "4px 8px"
  growth-badge-refer:
    backgroundColor: "{colors.warn}"
    textColor: "{colors.panel}"
    rounded: "{rounded.chip}"
    typography: "{typography.label}"
    padding: "4px 8px"
  snackbar:
    backgroundColor: "{colors.tile}"
    textColor: "{colors.on-tile}"
    rounded: "{rounded.control}"
    padding: "6px 6px 6px 16px"
  tab-bar:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    height: "70px"
  bottom-sheet:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "20px"
---

# Design System: Stimulasi Anak

## Overview

**Creative North Star: "Piring Stimulasi"**

The system borrows its whole grammar from the Kemenkes "Isi Piringku" public-health infographic: a plate divided into portions, each portion one flat, unmodulated colour field. Here the plate holds six development domains instead of food groups, and a portion fills when Ayah or Bunda ticks an activity of that domain. The plate is the measure of the day; nothing else on screen competes with it for colour.

Everything that is not a domain or a state is chrome, and chrome lives in one cool neutral scale: dark ink on a pale green-grey ground, white panels, near-invisible hairlines. The density is that of a one-handed phone tool: one column at most 430px wide, generous 44 to 48px touch targets, short rows, and a dock of dark counter tiles fixed above the tab bar so the most frequent taps sit under the thumb. Surfaces are flat at every level; depth comes only from tone and from the fixed dock overlapping scrolled content.

At night the world "lights down" rather than changing: the neutral scale inverts to a deep blue-grey, the three state colours brighten for legibility, and the six domain hues and danger red stay exactly as they are, so the plate reads the same at 3 a.m. as at noon.

**Key Characteristics:**
- Six domain hues are the only colour besides state (ok, warn, late) and danger red.
- Flat colour fields throughout: no gradients, no shadows, no grain, no translucency in chrome.
- One sans family (Figtree, self-hosted variable 300 to 900) with tabular figures globally.
- The plate and its seven-day strip of identical mini plates are the signature; progress is shown as filled portions, never as a score or percentage.
- Counters dock fixed above the tab bar; activity and vaccine content scroll beneath them.
- Light theme follows the day; `prefers-color-scheme: dark` lights it down for night feeding.
- Motion is short and arriving: things enter (rise, slide in, drop, pop) on one ease-out-quint curve and never bounce on exit.

## Colors

A cool, quiet neutral chrome carrying six saturated, flat domain hues and a small, strictly semantic state set.

### Primary (the six domains)
- **Sosial Raspberry** (sosial): the social-emotional domain's plate sector, row mark and mini-plate portion.
- **Bahasa Marigold** (bahasa): the language domain.
- **Kognitif Violet** (kognitif): the cognitive domain.
- **Motorik Kasar Field Green** (motorik_kasar): gross motor.
- **Motorik Halus Clear Blue** (motorik_halus): fine motor. Also the one domain hue reused outside the plate, as the text-selection tint at 30% mix.
- **Kemandirian Mustard** (kemandirian): self-help and independence.

Domain hues are fills, never text. A planned but unticked domain shows its hue at 20% opacity; a domain not on today's plan shows the neutral `off` grey; a ticked domain shows the full hue. The same six values are used in both themes.

### Secondary (state)
- **Tepat Waktu Green** (ok): "Bisa sekarang" chip (a dose that can be given now), the "aman" result disc of the daily check, the normal growth badge, and the WHO normal band (-2 to +2 SD) and dashed median of the growth chart. Dark theme: #5fc48f.
- **Mendekati Batas Amber** (warn): "Mendekati batas" chip (filled); "Lewat jadwal" / "Bisa dikejar" for a late but catchable dose (1px warn outline, warn text, no fill); the "perhatian" result disc; growth badges (watch = outline, refer = fill); the growth chart's outer bands (-3 to -2 and +2 to +3 SD); a 10% warn tint behind cautionary notes ("Jenis kelamin belum diisi", vaccine maximum-age notes); the "periksa" developmental alert border. Dark theme: #f0b154.
- **Terlambat Brick** (late): the error and destructive-text colour outside danger signs: field error border and message, a 10% late tint behind sign-in errors, the "Hapus akun" row label and the destructive confirm button (2px late outline on panel; irreversible account actions never borrow danger red), the 2px border and icon of a "segera" developmental alert, and the Kemampuan "Periksakan segera" tone. It no longer marks vaccine status. Dark theme: #f08a80.

Filled state chips and badges set their label in the `panel` colour, so in the dark theme the text darkens against the brightened state fill. Outlined variants (catch-up dose, growth "watch") put the state colour on the border and the text, over the panel.

Tints are mixes, not new colours: `color-mix(in oklab, var(--state) N%, transparent)` at 16% for chart bands, 30% for their legend swatches, and Tailwind `/10` (10%) for note blocks.

### Tertiary (danger)
- **Tanda Bahaya Red** (danger): reserved for danger signs. Where it ships: the header "Tanda bahaya" pill; every "Darurat 119" call button (danger sheet, Tanda bahaya screen, daily-check result, Beranda bahaya alert); the "bahaya" result disc on the check result and on the Beranda check row; the 2px border of the Beranda bahaya alert block; the "Cek tanda bahaya" pill inside a "segera" developmental alert; the 2px border and label of the "Ya" answer in the daily-check stepper; bullet markers in danger-sign lists. Fixed in both themes. As a fill it always carries white text; as text it appears only on the "Ya" answer, on panel.

### Neutral
- **Pale Sage Ground** (ground): the page. Dark: #12181b.
- **Panel White** (panel): the activity list, vaccine row, tab bar and bottom sheet. Dark: #1b2327.
- **Slate Ink** (ink): primary text, the done tick, the achieved-day disc and ring, the focus outline, the primary button and selected chip fill, the "Tidak" answer, the growth series line and points, the unread badge and unread dot, the "Baru" and "Sudah" tags, and the check-stepper progress fill. Dark: #edf1ee.
- **Muted Slate** (ink-2): secondary text, meta lines, inactive tab labels, the chevron. Dark: #a9b5b9.
- **Hairline** (line): row dividers, the tab bar's top edge, outline buttons. Dark: #2a3439.
- **Empty Portion Grey** (off): empty plate sectors, the unticked tick ring, the "Akan datang" chip and the "Contoh" badge. Dark: #2c373c.
- **Counter Ink** (tile): counter tiles, the snackbar and the top notice toast. Equal to ink in light; #26323a in dark so tiles stay darker than text but lift off the ground.
- **Counter Ink Running** (tile-active): a timer counter that is currently running. Dark: #3d4f59.
- **On Tile** (on-tile): text on counter tiles and the snackbar. Dark: #edf1ee.

### Named Rules
**The Plate Owns the Colour Rule.** Hue is spent only on the six domains, the three states and danger. Chrome (headers, panels, navigation, counters, buttons) stays in the neutral scale. A new surface that needs emphasis uses ink weight or the ink tile, not a new hue.

**The One Red Rule.** Danger red means "take the child to a health facility" and nothing else. A late vaccine reads as catch-up in warn outline; form errors and destructive text use the brick `late`; neither borrows `danger`.

**The Catch-Up Not Failure Rule.** A dose past its on-time window but within the source's maximum age is "Bisa dikejar", shown in warn outline, never in red or brick. Growth outside the normal band is likewise warn, never late or danger.

**The Lights Down Rule.** The dark theme swaps only the neutral scale and brightens the three state colours. Domain hues and danger are never re-tuned per theme.

## Typography

**Display Font:** Figtree (with ui-sans-serif, system-ui, sans-serif)
**Body Font:** Figtree
**Label/Mono Font:** Figtree; no second family.

**Character:** A friendly geometric sans with open counters, used heavy (800) for the few numbers and names that matter and plain (400 to 600) for everything else. Self-hosted as one variable latin woff2 with `font-display: swap`.

### Hierarchy
- **Display** (800, 40px, 1.05): today's done count ("2" in "2 dari 5"); the trailing "dari 5" drops to 18px/600 in ink-2.
- **Verdict** (800, 24px, 1.25, `text-wrap: balance`): a conclusion or a question the parent must answer: the daily-check question card, the check result title, the congratulation title, the current growth value ("6,2 kg") and the Imunisasi dose count.
- **Headline** (800, 20px, 1.25): the child's name in the header, screen titles in the shared header, and sheet titles ("Tanda bahaya").
- **Counter** (800, 24px, 1): the count or duration on each counter tile.
- **Title** (600, 16px, 1.375): activity titles; done activities shift to ink-2. Section labels like "Stimulasi hari ini" use 15px/600 in ink-2.
- **Body** (400, 15px, 1.625): expanded activity instructions and the danger sheet's prose and sign lists.
- **Meta** (400, 13px): domain, kind and minutes under each title; "Sumber:" source lines; the daily hint; vaccine timing ("Paling lambat 12 Des").
- **Label** (700, 12px): status chips, growth badges, tags ("Baru", "Wajib", "Tambahan"), the "Contoh" badge, tab labels (12px, bold only on the current tab). The unread badge runs 12px at 800. Tile labels and the mini-plate weekday row run at 11 to 11.5px. Chart axis ticks are 12px ink-2.
- **Form label** (600, 15px): field labels and in-sheet questions ("Kenapa tidak diberikan?"). Inputs render at 16px so iOS never zooms.

### Named Rules
**The Tabular Everywhere Rule.** `font-variant-numeric: tabular-nums` is set on `html`; counters, the day count and dates never shift width as numbers change. Do not override it locally.

**The Heavy Means Number Rule.** Weight 800 is reserved for the child's name, screen and sheet titles, verdicts, moving numbers and the two 64px check answers. Everything else tops out at 600 to 700.

## Layout

A single phone-width column, centred and capped at 430px on any wider viewport; there are no multi-column breakpoints. The header and plate section sit on an 18px screen inset; panels (activity list, vaccine row) sit on a 12px inset so they read slightly wider than the text above them. Panels stack 10px apart.

The first viewport reads top to bottom: header (name and age left, danger pill right), the plate (152px) beside the count, hint and a seven-day strip of 24px mini plates, then the white activity list, then the next-immunization row. Activity rows are at least 58px tall with a 14px left pad and a 48px tick hit area.

The bottom of the screen is a fixed stack: a 70px tab bar on panel, and above it a ground-coloured dock of up to five equal-width 88px counter tiles with 6px gaps and 8px padding. Both respect `env(safe-area-inset-bottom)`; the scroll content carries 188px of bottom padding so the last panel clears the dock. The snackbar floats just above the dock. The header respects `env(safe-area-inset-top)`.

Screens other than Beranda use one shared shell: a 56px header (44px back button, 20px/800 title, optional trailing action) and their own scroller with 90px bottom padding above the tab bar, or 24px on full-screen tasks with no tab bar (daily check, Tanda bahaya, measurement form). Full-screen tasks pin their decisive buttons to the bottom of the viewport with `max(16px, env(safe-area-inset-bottom))`. Forms sit on a 16px inset, stack fields 16px apart, and end with a 24px gap before a 10px-gapped button stack.

On Beranda, between the header and the plate, sits the daily-check row (12px inset panel) and, only when a check found danger, the bahaya alert block under it. When every activity is ticked, the plate section and list are replaced by the congratulation panel.

The notice toast is fixed to the top (`max(10px, safe-area-inset-top)`, 12px side insets, max 406px wide), opposite the snackbar at the bottom, so the two never collide.

### Named Rules
**The Thumb Dock Rule.** One-tap logging lives in the fixed dock directly above the tab bar, never in the scroll flow. New quick actions join the dock or a sheet; they do not push it off-screen.

## Elevation & Depth

The system is flat. There are no drop shadows anywhere in the build. Depth is tonal: panel white over pale ground, and in the dark theme panel #1b2327 over ground #12181b. Inside a panel, a nested block (the congratulation panel's "Besok" list, vaccine date grid, growth "Catat" prompt) steps back down to ground. The fixed counter dock gets its separation by sitting on an opaque ground band over scrolling content, the tab bar by a 1px hairline, and the notice toast by being the dark tile colour. The only translucent layer is the modal scrim (black 50%) behind bottom sheets; state tints (10 to 30%) sit on opaque panels and are colour, not glass. The two solid rings in the build (the unread badge's 2px ground ring and a running tile's 2px inset on-tile ring) are cut-out strokes, not shadows.

### Named Rules
**The Flat Plate Rule.** No gradients, shadows, glows or grain on any surface, including the plate. A state change is shown by a change of fill, not by lifting the element.

## Shapes

Soft, friendly rounding with a clear ladder: 4px for small inline tags ("Baru", "Wajib", "Tambahan"), 6px for status chips and growth badges, 12px for snackbars, fields, textareas, call buttons and nested note blocks, 16px for panels, counter tiles, the notice toast, full-width buttons and the 64px check answers, 24px for the top corners of bottom sheets and for the one-off hero cards (check question, check result, congratulation panel), and full pills for the danger pill, outline buttons, choice chips, the round tick, result discs, the unread badge and the progress track. The plate is an annulus of six 60-degree sectors with a small angular gap between each and an empty centre; the mini plate repeats the same geometry at 28-unit scale. The domain mark is a 10 by 28px full-round bar, a vertical slice of the sector's colour. Icons are an authored set on a 24px grid with 2px round strokes and no fills (the check uses 3px).

## Components

### Plate (signature)
Six annular sectors in fixed domain order, one per domain. Off-plan sectors are `off` grey, planned sectors are their hue at 20% opacity, ticked sectors are the full hue. When a sector becomes done it settles in: a scale from 0.9 to 1 over 380ms on `cubic-bezier(.22,1,.36,1)` (ease-out-quint), with fill-opacity crossfading over 300ms ease-out. Under `prefers-reduced-motion: reduce` all transitions and animations collapse to 0.01ms, so the sector fills instantly. When the day's target is met (one core plus one other activity) an ink disc with a check appears in the centre. The SVG carries an `aria-label` listing filled domains.

### Mini Plate
24px, same geometry, done portions in full hue and everything else `off`. An achieved day gets a 1.5px ink ring. Seven of them form the "Tujuh hari terakhir" strip, today labelled "Ini" in 800 ink.

### Activity Row
Inside one panel list with hairline dividers between rows. Domain mark, then a disclosure button (title, meta, chevron that rotates 90 degrees over 200ms when expanded), then the tick. Expanded content shows instructions in body, a "Sumber:" line in meta and, for rotating activities, a "Ganti kegiatan lain" outline pill.

### Tick
A 34px circle with a 2.5px ring inside a 48px hit area. Unticked: `off` ring, transparent check. Done: ink fill and ink ring with a panel-coloured check. Colour transitions over 200ms. Exposes `aria-pressed`.

### Buttons
- **Shape:** full pill for header and inline actions, 12px for paired actions inside sheets.
- **Danger pill:** danger fill, white bold 14px label with the alert icon, minimum 44px tall; presses scale to 0.97.
- **Outline:** 1px hairline border on panel, 14px semibold ink label, minimum 44px tall.
- **Primary (full width):** ink fill, ground label, 16px/700, 16px radius, minimum 48px; presses scale to 0.98 over 150ms; disabled at 50% opacity. One per decision ("Simpan", "Kembali ke Beranda", "Catat berat & panjang/tinggi").
- **Secondary (full width):** same shape on panel with a 1px hairline border and ink label ("Cek ulang", "Tidak ada tanda di atas", "Simpan: tidak diberikan").
- **Quiet:** ink text underlined at 4px offset, no box, for a step aside ("Imunisasi ini tidak diberikan?").
- **Call pair:** a 2-column pair at 48px and 12px radius, wherever a danger verdict lands (danger sheet, Tanda bahaya screen, non-aman check result): danger-filled "Darurat 119" with the phone icon, and an outline hotline button. Inside the Beranda bahaya alert the pair shrinks to 44px and 14px labels.
- **Focus:** every focusable element uses a 2.5px ink outline at 2px offset.

### Counter Tile
Ink tile, 88px tall, 16px radius: a truncated 11.5px semibold label at top, the 24px/800 count or duration in the middle, an 11px "last time" line at 75% opacity at the bottom. Presses scale to 0.96 over 150ms. A running timer switches to `tile-active` with a 2px inset on-tile ring and shows its start time.

### Status Chip
6px radius, 12px bold label, 4 by 8px padding. "Bisa sekarang" uses the ok fill and "Mendekati batas" the warn fill, both with panel-coloured text; "Lewat jadwal" and "Bisa dikejar" (late doses) use a 1px warn outline with warn text; "Sudah" uses an ink fill with ground text; "Akan datang", "Menunggu", "Di sekolah", "Bila berlaku" and "Tidak diberikan" use `off` with ink text.

### Growth Badge
The status chip's shape carrying the Permenkes 2/2020 verdict for the latest weight or length: normal in ok fill, "watch" in warn outline, "refer" in warn fill. Sits top-right of the growth card on Pertumbuhan and in a wrap row on the Beranda growth card.

### Tags
4px radius, 12px bold, 2 by 6px padding, inline after a title. "Baru" (an activity new tomorrow) and the "Sudah" chip are the only ink-filled labels. Vaccine kind: "Wajib" and "Wajib di daerah endemis" in a 1px ink outline with ink text; "Tambahan" and "Opsional" on `off` with ink-2 text.

### Snackbar
Ink tile, 12px radius, 14px semibold text with an underlined "Urungkan" (undo) action at 44px. Floats above the dock, fades in over 160ms ease-out, and dismisses after 5 seconds.

### Notice Toast
The snackbar's sibling at the top of the screen for something new (age band, checklist, vaccine due, daily check). Tile fill, on-tile text at 15px/600, 16px radius, 8px vertical and 16px left padding. Trailing it, a 44px action in an inverted on-tile button (12px radius, tile-coloured 14px/700 label) and a 44px close. It drops in from above (`drop`, 320ms ease-out-quint), shows one notice at a time, and marks itself seen after 8 seconds; every notice also lands in the Notifikasi list so nothing is lost.

### Bell and Unread Badge
A 44px round icon button in the Beranda header, left of the danger pill. Unread count sits on its top-right corner as an ink pill (minimum 20px, 12px/800 ground numerals) with a 2px ground ring that cuts it out of the icon; it pops in (`pop`, 300ms ease-out). The button's `aria-label` carries the count.

### Notification List
One panel list with hairline dividers. Each row: a 10px ink dot when unread (transparent when read), the text at 15px (700 unread, ink-2 regular when read), a 13px ink-2 meta line of date, time and the action name, then the chevron. "Tandai dibaca" sits in the header as a 44px pill text button only while something is unread. Empty state: the bell in ink-2 over "Belum ada notifikasi."

### Daily Check Row (Beranda)
A 12px-inset panel button: a 40px disc (ink with the alert icon before today's check; afterwards ok with a check, warn or danger with the alert icon), a 15px/700 line and a 13px ink-2 meta line, and the chevron. Presses scale to 0.99 and go to ground.

### Bahaya Alert Block (Beranda)
Shown under the check row only when today's check found danger, with `role="alert"`: a panel block with a 2px danger border and 16px radius, a 15px/700 instruction, a 13px ink-2 source line, and the 44px call pair. Developmental alerts reuse the same block with the border in the level's colour (`late` for "segera", `warn` for "periksa", ink-2 otherwise), the alert icon in that colour and the text in ink, and pill actions ("Cek tanda bahaya" in danger fill, "Mengerti" in outline).

### Daily Check Stepper
A full-screen task with no tab bar. Top: an 8px pill progress track (`off`) with an ink fill that grows over 300ms ease-out, and a 13px/700 "1/14" count. Then a 15px/600 ink-2 prompt and one question per 24px-radius panel card (verdict type, a 13px group line), each new card sliding in from the right (`slide-in`, 260ms ease-out-quint). At the bottom, two 64px answers at 16px radius: "Ya" in a 2px danger border with danger 18px/800 text on panel, "Tidak" in ink fill with ground text; both press to 0.97 and tap a light 8ms vibration. A 44px "Pertanyaan sebelumnya" text button follows from the second question on.

### Check Result
A 24px-radius panel card, centred, 32px top padding, rising in (`rise`, 420ms ease-out-quint): an 80px result disc (ok with a check, warn or danger with the alert icon, 40px glyph in the ground colour so it stays legible on the brighter dark-theme fills), the verdict title, and 16px ink-2 body. Under it, when signs were marked, a 16px-radius panel listing them with danger bullet markers and a "Sumber:" line; for perhatian and bahaya, the call pair; then "Kembali ke Beranda" (primary) and "Cek ulang" (secondary); the disclaimer last in 13px ink-2.

### Tanda Bahaya Screen
The emergency path on one screen: the call pair first, a 15px/600 "Ketuk yang sedang dialami" prompt, then every danger sign for the child's age as one panel list of 52px rows (16px/600 text and a chevron); one tap records the sign and opens the check result. A secondary "Tidak ada tanda di atas" closes the list.

### Growth Chart (signature)
An SVG at 340 by 220 units drawn from the WHO LMS curves for the child's sex. The normal zone (-2 to +2 SD) fills in ok at 16%, the two outer zones (to -3 and +3 SD) in warn at 16%, and the median is a 1.5px ok line dashed 4 4. The child's own series sits on top as a 2.5px ink line with round joins; points are panel-filled circles with a 2.5px ink stroke (r 4.5), the selected one filled ink at r 6 with a 14-unit invisible hit circle, growing over 150ms. Y ticks fall on round values (every 1 or 2 kg, every 5 cm) at 12px ink-2; the x axis labels only start, middle and end in "bln". A caption under the chart reads the selected point (ink bold value, ink-2 date), and a legend of two 12px swatches at 30% mix names the zones. A compact variant (no axes, no caption) previews on the Beranda growth card.

### Choice Chip
A 44px full pill, 15px/600: unselected on panel with a hairline border and ink text, selected in ink fill with ground text and an ink border; colours change over 150ms and presses scale to 0.97. Used as a segmented pair (Berat badan / Panjang badan, Berbaring / Berdiri) and as a wrapping reason set. The `check` variant leads with a 20px circle: an `off` 2px ring when unselected, a ground disc with an ink check when selected.

### Field
Label at 15px/600 above, a 48px input on panel with a 1px hairline border and 12px radius, 14px horizontal padding, 16px text, placeholder in ink-2 at 70%. Focus moves the border to ink (the global ink focus ring also applies to keyboard focus). Error sets `aria-invalid`, turns the border `late` and replaces the 13px ink-2 hint with a 13px/600 `late` message. The `reveal` variant (passwords) reserves 48px on the right for an eye / eye-off toggle in ink-2 with `aria-pressed`. Textareas follow the same stroke, radius and focus with 12px vertical padding.

### Skip Flow (Imunisasi)
Inside the dose sheet, below a hairline: a quiet "Imunisasi ini tidak diberikan?" opens a "Kenapa tidak diberikan?" question, a wrapping set of choice chips (Lupa, Anak sedang sakit, Vaksin tidak tersedia, Belum sempat ke faskes, Ragu / menolak, Lainnya), an optional 3-row note textarea (280 characters), and a secondary "Simpan: tidak diberikan" that stays disabled until a reason is chosen. The question is offered only once the dose's window is open. A skipped dose then shows "Tidak diberikan" on `off`, stays in "Bisa dikejar" with an "Alasan:" meta line, and can still be marked given.

### Toggle
A 52px list row with label and optional 13px hint, ending in a 48 by 28px track (`off`, ink when on) with a 20px panel knob sliding over 200ms. The push-notification toggle ("Notifikasi di HP ini") is this row; when the device refuses, the hint is replaced by the reason.

### Congratulation Panel (Beranda)
When every activity of the day is ticked, the plate section yields to a 24px-radius centred panel that rises in (`rise`, 420ms): the brand plate (all six sectors full) at 112px, popping in (`pop`, 520ms ease-out-quint, scale 0.6 to 1.04 to 1), a verdict title, a 15px ink-2 line, then a nested ground block (16px radius) labelled "Besok" in 13px/700 ink-2 listing tomorrow's activities with their domain marks, new ones tagged "Baru". An underlined 44px text button reopens today's list. On a bahaya day the title drops its "Hebat!".

### Navigation
A fixed panel tab bar with a top hairline, five 64 by 70px items (icon over 12px label). The current tab is bold ink and carries `aria-current="page"`.

### Bottom Sheet
A native `<dialog>` anchored to the bottom, full width up to 430px, 24px top corners, max 88dvh, with a sticky title row and a 44px close button. It slides up on open (`sheet-up`, 280ms ease-out-quint). The scrim is black at 50%. A ground-coloured note block (12px radius) closes the content.

### Motion Vocabulary
One curve, `cubic-bezier(.22,1,.36,1)` (ease-out-quint), for every entrance; plain ease-out for small state feedback. Keyframes in `src/index.css`:
- **settle** (scale 0.9 to 1, 380ms): a plate sector filling.
- **sheet-up** (from translate 0 100%, 280ms): bottom sheets.
- **drop** (from translate 0 -120%, 320ms): the notice toast.
- **rise** (opacity 0 and 16px down to rest, 420ms): a verdict or celebration card arriving (check result, congratulation panel).
- **slide-in** (opacity 0 and 24px right to rest, 260ms): the next question in the stepper.
- **pop** (scale 0.6 to 1.04 to 1, opacity 0 to 1 by 60%): the brand plate on congratulation (520ms ease-out-quint) and the unread badge (300ms ease-out).
- **fade-in** (opacity, 160ms ease-out): the snackbar.
Transitions: colours 150 to 200ms, press scales 0.96 to 0.99 at 150ms, progress width 300ms ease-out. Under `prefers-reduced-motion: reduce` every animation and transition collapses to 0.01ms.

## Do's and Don'ts

### Do:
- **Do** show progress as filled plate portions and "N dari M"; the plate centre carries a check only when the day's target is met.
- **Do** use each domain's hue for its sector, its row mark and its mini-plate portion, and nowhere else.
- **Do** keep chrome in the neutral scale: ground, panel, ink, ink-2, line, off, tile.
- **Do** keep touch targets at least 44px, and 48px for the tick.
- **Do** settle a newly filled sector with scale 0.9 to 1 over 380ms ease-out-quint, and fill instantly under reduced motion.
- **Do** carry a "Sumber:" line in meta type under every activity and danger-sign group.
- **Do** derive any new dark-theme value from the existing dark neutral scale, keeping domain hues and danger unchanged.
- **Do** put the call pair ("Darurat 119" plus hotline) wherever a danger verdict lands.
- **Do** show a late but catchable dose as "Bisa dikejar" in warn outline, and growth outside the normal band in warn.
- **Do** mark field errors with a `late` border and a 13px/600 `late` message, never with danger.
- **Do** enter new verdicts, toasts and questions with the ease-out-quint keyframes (rise, drop, slide-in, pop) at 260 to 520ms.
- **Do** keep every notice in the Notifikasi list; a toast is a one-time announcement of something the list already holds.

### Don't:
- **Don't** add gradients, box shadows, glows, grain or blurred translucency to any surface.
- **Don't** introduce a hue outside the six domains, three states and danger red.
- **Don't** set text in a domain hue; domain colour is a fill.
- **Don't** use danger red for anything except danger signs, emergency calls and the "Ya" answer to a danger-sign question; destructive confirmations and errors use ink or `late`.
- **Don't** turn the plate into a score, percentage, streak or ranking.
- **Don't** add a second typeface or disable tabular figures.
- **Don't** move one-tap counters out of the fixed dock above the tab bar.
