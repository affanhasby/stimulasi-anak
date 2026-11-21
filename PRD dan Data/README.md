# Data set — Aplikasi Stimulasi & Tumbuh Kembang Anak

Versi data: 2026-11-21. PRD lengkap ada di Claude Doc "PRD — Aplikasi Stimulasi & Tumbuh Kembang Anak (PWA)".

## Aturan utama: JSON = sumber utama, CSV = turunan

Semua data diedit di `data/*.json`. File CSV dibuat otomatis dan **jangan diedit langsung** (perubahan di CSV akan tertimpa). Setelah mengubah JSON, jalankan:

```
python3 scripts/build_csv.py
```

Skrip membuat ulang semua CSV, memperbarui tabel uji di bawah, dan gagal (kode keluar 1) bila ada `source` yang tidak terdefinisi, id duplikat, atau field verifikasi yang tidak valid. Dokter/bidan peninjau boleh memberi catatan di CSV, tetapi koreksinya dipindahkan ke JSON.

## Isi folder

| File | Isi |
| --- | --- |
| `data/danger_signs.json` | Tanda bahaya untuk tombol merah "Tanda bahaya" (MVP): bayi baru lahir, kuning, balita, dehidrasi + hotline. |
| `data/sources.json` | Semua sumber (id, penerbit, judul, URL, tanggal). Item lain merujuk ke `id` ini lewat `source` / `related_source`; nomor halaman di field `page` item. |
| `data/vaccines.json` | 62 dosis: jadwal Kemenkes (default) dan IDAI 2024, aturan kejar, opsi pengingat. |
| `data/milestones.json` | Ceklis Buku KIA 0-24 bln (57 item) + milestone CDC/AAP 2 bln-5 thn termasuk 30 bln (159 item, tiap usia punya `source` sendiri), aturan red flag, jadwal skrining. |
| `data/stimulation_activities.json` | 130 kegiatan (0-24 bln Buku KIA, 24-72 bln CDC; 12-15 kegiatan rotasi per rentang) + aturan daftar harian. |
| `data/counters.json` | Penghitung sekali-tap, norma per usia, aturan peringatan. |
| `scripts/build_csv.py` | Pembuat CSV + validator. |
| `data/*.csv` (dibuat skrip) | `sources`, `vaccines`, `vaccine_catch_up_rules`, `milestones`, `stimulation_activities`, `counter_norms`, `counter_alerts`, `danger_signs`. |

## Konvensi

- Usia = offset dari tanggal lahir `{months, days}`. Tanggal = `addMonths(lahir, months)` (date-fns; tanggal yang tidak ada dibulatkan ke akhir bulan) lalu `addDays(days)`.
- Rentang usia bulan pada stimulasi/ceklis: `start` inklusif, `end` eksklusif.
- **Tanggal imunisasi, semuanya inklusif** (hari itu masih termasuk):

| Field JSON | Label di app | Arti |
| --- | --- | --- |
| `earliest` | Mulai bisa | Hari pertama dosis boleh diberikan |
| `on_time_until` | Paling lambat | Hari terakhir yang masih tepat waktu menurut jadwal |
| `max_until` | Batas maksimal | Hari terakhir dosis masih boleh dikejar. `null` = sumber tidak menyebut batas; tampilkan "Terlambat - konsultasikan ke petugas" |

- **Satu field verifikasi:** `verification` = `verified` (angka dibaca langsung dari sumber) | `partial` (sumber resmi ada, tetapi kutipan dari ringkasan atau sumber luar negeri; app menambahkan "konfirmasi ke petugas") | `unverified` (belum terkonfirmasi). Tidak ada field verifikasi lain.
- `source` + `page` wajib ditampilkan di UI detail (mis. "Buku KIA 2021 hal. 43").

## Hal yang masih perlu dilengkapi sebelum rilis (status 2026-11-21)

1. **Ceklis Buku KIA 2-6 tahun (hal. 49-53): belum bisa diambil.** Salinan PDF yang dapat diakses terpotong di hal. 48. Butuh Buku KIA cetak/PDF lengkap. Sementara memakai milestone CDC 24/30/36/48/60 bulan (`fallback: cdc_milestones`).
2. **Imunisasi `partial` (9 dosis):** HB0 dan BCG (batas < 7 hari dan < 1 tahun dari Lampiran Permenkes 12/2017, hanya terbaca lewat ringkasan, belum verbatim); Rotavirus Kemenkes & IDAI (batas 6 minggu - 14 minggu 6 hari dan 8 bulan 0 hari verbatim dari CDC, tetapi untuk merek AS; vaksin program Kemenkes perlu dicocokkan ke Juknis/kemasan).
3. **Imunisasi `unverified` (1 dosis):** Varisela 2 IDAI. Rangkuman IDAI menyebut 14 bulan, CDC mensyaratkan jarak minimal 3 bulan. App memakai max(14 bulan, dosis 1 + 90 hari) sampai dokumen resmi IDAI terbaca.
4. Jadwal IDAI masih dari rangkuman Bio Farma; cocokkan dengan dokumen resmi idai.or.id.
5. Penamaan Heksavalen vs DPT-HB-Hib + IPV per wilayah (transisi Okt 2025 - 2026).
6. Ditinjau dokter anak/bidan sebelum dipublikasikan.

## Tabel uji: jadwal Kemenkes untuk tanggal lahir 2026-01-31

Dibuat otomatis oleh `scripts/build_csv.py`.

<!-- TEST_TABLE_START -->
| id | Dosis | Mulai bisa | Paling lambat | Batas maksimal | Verifikasi |
| --- | --- | --- | --- | --- | --- |
| K-HB0 | HB0 | 2026-01-31 | 2026-02-01 | 2026-02-06 | partial |
| K-BCG | BCG | 2026-01-31 | 2026-02-27 | 2027-01-30 | partial |
| K-OPV1 | OPV1 | 2026-01-31 | 2026-02-27 | - | verified |
| K-DPT1 | DPT-HB-Hib 1 | 2026-03-31 | 2026-04-29 | - | verified |
| K-OPV2 | OPV2 | 2026-03-31 | 2026-04-29 | - | verified |
| K-PCV1 | PCV1 | 2026-03-31 | 2026-04-29 | - | verified |
| K-RV1 | RV1 | 2026-03-31 | 2026-04-29 | 2026-05-15 | partial |
| K-DPT2 | DPT-HB-Hib 2 | 2026-04-30 | 2026-05-30 | - | verified |
| K-OPV3 | OPV3 | 2026-04-30 | 2026-05-30 | - | verified |
| K-PCV2 | PCV2 | 2026-04-30 | 2026-05-30 | - | verified |
| K-RV2 | RV2 | 2026-04-30 | 2026-05-30 | 2026-09-30 | partial |
| K-DPT3 | DPT-HB-Hib 3 | 2026-05-31 | 2026-06-29 | - | verified |
| K-OPV4 | OPV4 | 2026-05-31 | 2026-06-29 | - | verified |
| K-IPV1 | IPV1 | 2026-05-31 | 2026-06-29 | - | verified |
| K-RV3 | RV3 | 2026-05-31 | 2026-06-29 | 2026-09-30 | partial |
| K-MR1 | MR1 | 2026-10-31 | 2026-11-29 | - | verified |
| K-IPV2 | IPV2 | 2026-10-31 | 2026-11-29 | - | verified |
| K-JE | JE | 2026-11-30 | 2026-12-30 | - | verified |
| K-PCV3 | PCV3 (booster) | 2027-01-31 | 2028-01-30 | 2028-01-30 | verified |
| K-DPT4 | DPT-HB-Hib 4 (lanjutan baduta) | 2027-07-31 | 2028-01-30 | 2028-01-30 | verified |
| K-MR2 | MR2 (lanjutan baduta) | 2027-07-31 | 2028-01-30 | 2028-01-30 | verified |
<!-- TEST_TABLE_END -->
