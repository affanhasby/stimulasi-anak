# Growth standards: data sources, checks and caveats

As of 2026-11-21. Data file: `growth_standards.json` (same folder).

## What the JSON contains

| Key | Content | Origin |
|---|---|---|
| `lms.wfa.M` / `.F` | Weight-for-age L, M, S, completed months 0–60 (61 rows each) | WHO monthly xlsx tables |
| `lms.lhfa.M` / `.F` | Length/height-for-age L, M, S, months 0–60 (61 rows each). 0–24 = recumbent length, 25–60 = standing height. Month 24 also has `height_variant` | WHO monthly xlsx tables |
| `lms.wfl` / `lms.wfh` | Weight-for-length 45–110 cm and weight-for-height 65–120 cm, 0.5 cm steps (optional extra) | WHO xlsx tables |
| `classification` | Permenkes 2/2020 cut-offs for BB/U, PB/U–TB/U, BB/PB–BB/TB (plus IMT/U for completeness), boundary rules, footnotes, Posyandu referral triggers | Permenkes 2/2020 |
| `schedule.weigh`, `schedule.length_height` | How often to weigh and measure, with the exact regulation text | PMK 66/2014, PMK 6/2024, PMK 2/2020 |
| `notes` | Z-score formula, WHO restricted LMS rule, flags, 0.7 cm rule, checks | WHO, anthro |

All 61 months × 2 sexes × 2 indicators (244 rows) come from fetched WHO files. No values were typed in by hand or interpolated.

## Sources

1. **WHO Child Growth Standards (2006): monthly tables with LMS columns**, downloaded from cdn.who.int (linked from who.int/tools/child-growth-standards/standards/...):
   - `weight-for-age/tab_wfa_{boys,girls}_p_0_5.xlsx`
   - `length-height-for-age/tab_lhfa_{boys,girls}_p_0_2.xlsx` (length) and `tab_lhfa_{boys,girls}_p_2_5.xlsx` (height)
   - `weight-for-length-height/tab_wfl_{boys,girls}_p_0_2.xlsx`, `tab_wfh_{boys,girls}_p_2_5.xlsx`
   - `instructions-en.pdf`: 1 month = 30.4375 days. The length/height curves break between day 730 and day 731.
2. **WHO "Computation of centiles and z-scores"** (2007 reference, cdn.who.int/.../growth-reference-5-19-years/computation.pdf). It describes the restricted LMS method and says it follows "the same methodology applied to the WHO Child Growth Standards".
3. **WHO `anthro` R package** (github.com/WorldHealthOrganization/anthro, master b776d8a, 2026-01-30). The daily LMS tables (`weianthro.txt`, `lenanthro.txt`, `wflanthro.txt`, `wfhanthro.txt`) were used only to cross-check. `R/z-score-helper.R` gives the reference z-score code and the 0.7 cm adjustment.
4. **Permenkes No. 2 Tahun 2020 tentang Standar Antropometri Anak**, Berita Negara 2020 No. 7, https://www.peraturan.go.id/files/bn7-2020.pdf. Ditetapkan 2 Jan 2020, diundangkan 8 Jan 2020. Used: Pasal 2, Pasal 4; Lampiran BAB II pp. 12–15 (age in completed months, 0.7 cm rule, cut-off table and footnotes); Tabel 1 pp. 16–18; BAB IV pp. 85–87 (Posyandu flow).
5. **Permenkes No. 66 Tahun 2014** (Pemantauan Pertumbuhan, Perkembangan, dan Gangguan Tumbuh Kembang Anak), Pasal 5. Copy hosted in WHO's MCA policy database (platform.who.int).
6. **Permenkes No. 6 Tahun 2024** (Standar Teknis Pemenuhan SPM Kesehatan; replaces PMK 4/2019), https://peraturan.go.id/files/permenkes-no-6-tahun-2024.pdf, Lampiran pp. 52–53 (Pelayanan Kesehatan Balita).

## Verification

- **Requested spot checks.** Weight-for-age boys month 0 M = **3.3464** and girls month 0 M = **3.2322**. Both match the WHO xlsx exactly. Other month-0 values: lhfa boys M = 49.8842, girls 49.1477.
- **WHO monthly vs WHO daily (anthro).** All 122 wfa rows and all 122 lhfa rows agree with the daily tables, linearly interpolated at month × 30.4375 days. The largest relative difference in M is 1.7e-4, which is rounding. All 262 wfl rows and 222 wfh rows match the anthro files exactly.
- **WHO vs Permenkes.** Permenkes Tabel 1 (BB/U, boys, 0–60 months, −3 SD to +3 SD) was OCR'd: 61 rows × 7 values. Every value equals M·(1+L·S·z)^(1/L) computed from the WHO LMS and rounded to 0.1 kg. This confirms that Permenkes uses the WHO 2006 standard unchanged.
- **Cut-offs.** The table "Kategori dan Ambang Batas Status Gizi Anak" (Lampiran pp. 14–15) and Pasal 4 were read, and they match the cut-offs in the brief:
  - BB/U: < −3 sangat kurang; −3 to < −2 kurang; −2 to +1 normal; > +1 risiko BB lebih (footnote 1: confirm with BB/TB or IMT/U).
  - PB/U–TB/U: < −3 sangat pendek; −3 to < −2 pendek; −2 to +3 normal; > +3 tinggi (footnote 2: possible endocrine cause, refer).
  - BB/PB–BB/TB: < −3 gizi buruk; −3 to < −2 gizi kurang; −2 to +1 gizi baik (normal); > +1 to +2 berisiko gizi lebih; > +2 to +3 gizi lebih; > +3 obesitas.
  - The normal band for BB/PB is officially labelled **"gizi baik (normal)"**.
- **0.7 cm rule.** Permenkes p. 12 says: measure PB (lying down) for ages 0–24 months, and add 0.7 cm if the child was measured standing. Measure TB (standing) above 24 months, and subtract 0.7 cm if the child was measured lying down. In the WHO tables, the month-24 length median is exactly 0.70 cm above the height median (boys 87.8161 vs 87.1161; girls 86.4153 vs 85.7153).

## Formulas for the app

- z = ((y/M)^L − 1) / (L·S). If L = 0, z = ln(y/M)/S. Length/height has L = 1, so z = (y − M)/(M·S).
- Value at a given z: SD(z) = M·(1 + L·S·z)^(1/L). Use this to draw the chart lines.
- **WHO restricted LMS** applies to weight-based indicators (BB/U, BB/PB, BB/TB, IMT/U) but not to length/height:
  - If z > 3: z* = 3 + (y − SD(+3)) / (SD(+3) − SD(+2)).
  - If z < −3: z* = −3 + (y − SD(−3)) / (SD(−2) − SD(−3)).
- WHO Anthro rounds z to 2 decimals. It flags implausible values: BB/U z < −6 or > +5, PB/U |z| > 6, BB/PB |z| > 5. The app can use the same limits to catch input errors such as wrong units.
- Age is counted in completed months (Permenkes: 2 months 29 days counts as 2 months). WHO Anthro uses age in days instead, which is more precise and can be added later if needed.

## Schedule (what the regulations actually say)

| Source | Weighing | Length/height |
|---|---|---|
| PMK 66/2014 Pasal 5(1), 0–72 months | **every month** | **every 3 months** (head circumference "sesuai jadwal") |
| PMK 6/2024 SPM, 0–59 months (minimum standard) | **at least 8×/year** (from 12 months: at least 4× in any 6 months) | **at least 2×/year** |
| PMK 2/2020 BAB IV (Posyandu flow) | Monthly. If a child was not weighed last month or the trend is "tidak naik", a health worker must confirm | If the Posyandu has the equipment, plot PB/U–TB/U and review the trend each month |

Suggested app defaults: a weighing reminder every month, and a length/height reminder every 3 months (monthly allowed), never fewer than 2 per year. Tell users that Posyandu is the official place for measurement.

## Caveats

- **Lampiran OCR.** The Permenkes Lampiran on peraturan.go.id is a set of scanned images. The cut-off table and Tabel 1 were read with macOS Vision OCR and checked by hand. Tabel 1 matching the WHO data exactly shows the OCR was correct. Only Tabel 1 (BB/U boys) was compared row by row. The other Permenkes tables were not OCR'd, because the WHO files are the primary data.
- **Buku KIA and Juknis Posyandu/ILP not verified.** No official PDF of Buku KIA (2020/2023/2024) or of the 2023 Posyandu/ILP juknis was retrieved. The Kemenkes Ayo Sehat page that reportedly says "measure PB/TB every month" returned HTTP 503 and is not cited as a rule. Check the current Buku KIA before finalising the app copy.
- **PMK 66/2014 copy.** The copy used is the one hosted by WHO, not the JDIH Kemenkes copy. It was not checked whether a later regulation has amended PMK 66/2014.
- **Month 24 ambiguity.** Permenkes says PB for 0–24 months, while WHO Anthro switches to height at day 731. The JSON's month-24 entry uses length values and also carries `height_variant`. The app should use whichever matches how the child was actually measured, after applying the 0.7 cm adjustment.
- **Oedema.** Weight z-scores are not valid when bilateral oedema is present, and WHO Anthro does not compute them in that case.
- **5–18 years.** Data for 5–18 years (WHO 2007, IMT/U and TB/U) was not collected. Only the IMT/U cut-offs are recorded.
- The app's status is a screening estimate, not a diagnosis. Follow the referral flow in Permenkes BAB IV.
