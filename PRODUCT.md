# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Mobile-first PWA, installed to the home screen on Android and iOS. Used on a phone; on a laptop it renders as a centered phone-width column.

## Users

Primary: new mothers and fathers (25–35) of a child aged 0–6 years, often holding the phone in one hand while carrying the baby, short on time, tired and short on sleep, frequently using it at night (feeding). Secondary: caregivers and grandparents given shared access (phase 2).

Job: know what to do today for the child (stimulation), never miss an immunization, log daily care in one tap (feeds, diapers, sleep), and know when a delay or symptom warrants a visit to the Posyandu, Puskesmas or doctor.

## Product Purpose

Guidance on child development is scattered across the Buku KIA, the IDAI schedule and many websites. Parents enter the birth date once and the app derives everything from it: daily stimulation, immunization schedule with reminders (push and email), age-appropriate milestones with "when to see a doctor" flags, danger signs, and one-tap daily counters.

Success (3 months after launch, from the PRD): onboarding completed by ≥ 85% with a median under 30 s; ≥ 50% of weekly active users tick at least one stimulation; ≥ 80% of doses marked done within the on-time window; ≥ 8 counter taps per day for babies under 6 months.

## Positioning

- **Only the birth date.** One required input; immunization dates, milestones, stimulation and counter norms are all computed from it.
- **All taps, under 2 minutes.** No free-text forms in the daily flow; the daily checklist is finished in under two minutes, one-handed.
- **An official source on every item.** Buku KIA (Kemenkes 2021, with page numbers), IDAI, WHO, CDC/AAP; the source is shown on every activity, norm and warning.

## Operating Context

- Daily loop: open → daily condition check (Ya/Tidak) → today's stimulation (per month of age) → tap counters (BAB, pipis, menyusu, tidur, tengkurap, MP-ASI…) → glance at the next vaccine and growth. In-app notifications keep every reminder until acted on.
- Visits: Posyandu / Puskesmas (government program, free) or private paediatrician (IDAI schedule); school vaccination (BIAS) for older children.
- Two immunization schedules: Kemenkes program (default) and IDAI 2024.
- Content lives in `PRD dan Data/*.json` (with `source` + `page` per item); the PRD PDF in the same folder is the product spec.

## Capabilities and Constraints

- Account required: register with username + email + password (confirm password; no email confirmation while outgoing email is not set up, see DEPLOY.md); log in with email or username. "Lupa kata sandi" and email reminders are hidden until email exists. All user data stored in Supabase, with a local copy on the device that syncs automatically; the app must stay fast and usable offline.
- Deploy: GitHub Pages (static) + Supabase. Built locally first.
- Must be light: small bundle, fast start, optimistic taps, clear offline/sync and error handling.
- Preterm children (< 37 weeks) use corrected age for milestones and stimulation until 24 months; vaccines use chronological age.
- Not a diagnostic tool. No doctor chat, marketplace or social features in v1. Pregnancy mode, sharing and English are phase 2. Growth tracking shipped early (WHO 2006 / Permenkes 2/2020): weight and length entry, charts and status, monthly weighing and 3-monthly length reminders.
- Undecided: final app name and visual identity ("Stimulasi Anak" is the working name); the paediatrician/midwife who reviews content before release.

## Brand Commitments

- Working name: **Stimulasi Anak** (temporary).
- Voice: Indonesian. Addresses the parent as **Ayah/Bunda** ("Bunda, si Kecil bisa imunisasi besok."). The child is "si Kecil" or the nickname.
- Calming, never alarming: warnings use neutral language, name their source, and always give the next step. No score or sense of "failure"; only a gentle streak.
- Medical disclaimer shown at onboarding and on every warning card (text in the PRD).

## Evidence on Hand

- Content data with sources: 62 vaccine doses, 57 Buku KIA checklist items + 159 CDC milestones, 130 stimulation activities, 11 counters with norms and alerts, danger signs + hotlines (Halo Kemenkes 1500-567, emergency 112/119), 30 sources — all in `PRD dan Data/`.
- No testimonials, user numbers, partners, medical endorsements or reviewer names exist; never fabricate them.
- Accepted exceptions (user decisions, 2026-11-21): Sutter Health (reviewed by an FAAP physician) stays as the cited source for (1) the dehydration danger signs and (2) the BAB and Pipis counter norms, because the Buku KIA PDF could not be reached to re-source them. Replace with Buku KIA when a copy is available.
- Not yet verified: Buku KIA checklist for 2–6 years (CDC used as fallback); 10 doses marked `partial`/`unverified`, which the UI must label "konfirmasi ke petugas".

## Product Principles

1. One input, everything derived. Never ask for what can be computed.
2. Tap, don't type. Smart defaults that the parent only confirms.
3. One hand, tired eyes: primary actions in the bottom third, targets ≥ 48 × 48, readable at 3 a.m.
4. Calm and sourced: every claim carries its official source; every warning gives a next step.
5. Everything can be undone (5-second undo on every tap, long-press to edit history).

## Accessibility & Inclusion

WCAG 2.2 AA contrast; body text at least 16 px; screen-reader labels; touch targets ≥ 48 × 48; one-handed use; dark mode for night feeding; respects reduced motion. Bahasa Indonesia only in v1.
