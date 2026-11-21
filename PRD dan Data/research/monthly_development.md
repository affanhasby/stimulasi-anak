# Riset: kemampuan & stimulasi per bulan (0-24 bulan, lalu 2-6 tahun)

Tanggal riset: 2026-11-21. Data mesin: `monthly_development.json` (folder yang sama). File ini tidak mengubah `milestones.json` / `stimulation_activities.json`; ini usulan untuk ditinjau.

## Ringkasan

- **Tidak ada sumber resmi Indonesia yang memberi ceklis perkembangan per bulan.** Buku KIA 2021 dan Revisi 2024 sama-sama memakai rentang 3 bulan (29 hari-3, 3-6, 6-9, 9-12 bln), lalu 12-18, 18-24 bln, lalu tahunan 2-6 thn. Ceklis diisi pada usia 3, 6, 9, 12, 18, 24 bln (dan 3, 4, 5, 6 thn).
- Titik usia resmi Indonesia yang paling rapat adalah **KPSP (SDIDTK)**: 3, 6, 9, 12, 15, 18, 21, 24, 30, 36, 42, 48, 54, 60, 66, 72 bln. Jadi grid usulan: **bulanan 0-12**, lalu **15, 18, 21, 24**, lalu **tiap 6 bulan 30-72** (selaras KPSP).
- Penempatan bulanan dibuat dengan menjangkarkan item KIA ke sumber yang punya usia lebih rinci: AAP HealthyChildren (1 bln, 2 & 4 bln, 4-7 bln), CDC/AAP 2022 (2, 4, 6, 9, 12, 15, 18 bln), median WHO Motor Development Study (6 milestone motorik kasar), dan pernyataan IDAI (lewat liputan media). Sisanya interpolasi dan ditandai `partial`.
- Aturan rujukan Buku KIA **tidak berubah**: `referral_cutoff_month` tetap 3/6/9/12/18/24. `expected_month` hanya menentukan kapan item muncul sebagai "kemampuan bulan ini"; item yang belum tercapai sebelum batas tidak memicu rujukan.

Hitungan: 216 penempatan milestone (57 KIA: 19 verified, 38 partial; 159 CDC verified pada usianya). 146 jendela stimulasi (130 kegiatan lama: 115 tetap pada rentang asli = verified, 15 digeser/diperpanjang = partial; 16 kegiatan baru = partial).

## Sumber

| id | Penerbit | Judul | Tanggal | Granularitas |
| --- | --- | --- | --- | --- |
| BUKU_KIA_2021 | Kemenkes RI | Buku KIA edisi revisi 2021, hal. 42-47 ([PDF](https://sikompak.bappenas.go.id/pembelajaran/view/52/id/other_doc/Buku%20KIA%20Revisi%202021/download.pdf)) | 2021 | Rentang 3 bln s.d. 12 bln, lalu 6 bln s.d. 24 bln |
| BUKU_KIA_2024 | Kemenkes RI (dibaca lewat ringkasan pihak ketiga) | Buku KIA Revisi 2024, bagian balita ([SlideShare](https://www.slideshare.net/slideshow/informasi-kesehatan-buku-kia-revisi-2024-bagian-balita-pdf/275116332)) | ~Des 2024 | Sama dengan 2021: 29 hr-3, 3-6, 6-9, 9-12, 12-18, 18-24 bln, 2-3 ... 5-6 thn. Ceklis diisi di 3, 6, 9, 12, 18, 24 bln. Tidak ada ceklis 1 atau 2 bln. |
| KEMENKES_KPSP | Kemenkes RI, Pedoman SDIDTK (dikutip lewat [manual CSL FK Unhas](https://kedokteran.med.unhas.ac.id/wp-content/uploads/2019/01/MANUAL-CSL-5-BUKU-PANDUAN-KPSP.pdf) dan salinan Scribd) | Jadwal KPSP | Pedoman 2016/2019/2022 | Tiap 3 bln s.d. 24 bln, tiap 6 bln s.d. 72 bln |
| WHO_MDS_2006 | WHO MGRS Group, *Acta Paediatrica* Suppl 450:86-95 ([doi](https://doi.org/10.1080/08035320500495563)) | WHO Motor Development Study: Windows of achievement for six gross motor development milestones | 2006 | Jendela persentil 1-99 dalam bulan (lihat tabel di bawah) |
| WHO_MOTOR_PAGE | WHO | [Motor development milestones](https://www.who.int/tools/child-growth-standards/standards/motor-development-milestones) | tanpa tanggal | Tabel persentil (PDF) |
| IDAI_MOTOR_2024 | Kompas TV meliput seminar media IDAI (dr. Amanda Soebadi, Sp.A(K), UKK Neurologi) | [IDAI Ungkap Perkembangan Motorik Normal pada Bayi di Usia 4 sampai 12 Bulan](https://www.kompas.tv/lifestyle/539241/idai-ungkap-perkembangan-motorik-normal-pada-bayi-di-usia-4-sampai-12-bulan) | 2024-09-18 | Titik usia motorik kasar (angkat kepala ~4, berguling ~6, duduk rata-rata 6-7, berdiri berpegangan 7-8, merangkak 8-9, berjalan berpegangan ~9, berjalan sendiri ~12 bln) |
| IDAI_PANTAU_2016 | IDAI | [Pentingnya Memantau Pertumbuhan dan Perkembangan Anak (Bagian 2)](https://www.idai.or.id/artikel/seputar-kesehatan-anak/pentingnya-memantau-pertumbuhan-dan-perkembangan-anak-bagian-2) | 2016-08-18 | Hanya beberapa titik (9-12 bln mengoceh 2-3 suku kata; 2 thn gabung 2 kata); merujuk KPSP |
| IDAI_JELAJAH_2015 | IDAI | [Menjelajah Sebelum Berjalan](https://www.idai.or.id/artikel/seputar-kesehatan-anak/menjelajah-sebelum-berjalan) | 2015-04-09 | Mulai berpindah tempat 7-10 bln; tips stimulasi (tengkurap sejak dini, hindari baby walker, jangan paksa merangkak) |
| AAP_HC_1M | AAP / HealthyChildren.org | [Developmental Milestones At 1 Month Old](https://healthychildren.org/English/ages-stages/baby/Pages/Developmental-Milestones-1-Month.aspx) | 2026-04-21 | 1 bln + mainan/kegiatan |
| AAP_HC_1_4M | AAP / HealthyChildren.org | [Developmental Milestones: 1-4 Months Old](https://www.healthychildren.org/english/ages-stages/baby/pages/developmental-milestones-3-months.aspx) | 2026-04-22 | Titik 2 dan 4 bln + mainan/kegiatan |
| AAP_HC_4_7M | AAP / HealthyChildren.org | [Developmental Milestones: 7 Months](https://www.healthychildren.org/English/ages-stages/baby/Pages/Developmental-Milestones-7-Months.aspx) | 2009-06-07 (lama) | Rentang 4-7 bln |
| CDC_2M ... CDC_5Y | CDC "Learn the Signs. Act Early." (milestone revisi CDC/AAP 2022) | Milestones by 2/4/6/9 months, 1 year, 15/18 months, 2 years, 30 months, 3/4/5 years + Parenting Tips and Activities | last reviewed 2026-05-16 | 2, 4, 6, 9, 12, 15, 18, 24, 30, 36, 48, 60 bln, plus tips kegiatan per usia |

Yang dicari tetapi tidak ditemukan / tidak terbaca:
- Halaman resmi IDAI berisi tabel milestone **per bulan**: tidak ditemukan di idai.or.id. Pernyataan bulanan IDAI hanya ada lewat liputan media (Kompas TV/Kompas.com), jadi dipakai sebagai pendukung, bukan sumber utama.
- PDF lengkap Buku KIA 2024 dari situs Kemenkes: tidak berhasil dibuka (ayosehat.kemkes.go.id 503, kesprimkom.kemkes.go.id 502). Salinan pihak ketiga ada (Dropbox lewat blog ahligizi.id, Scribd, FlipHTML5) tetapi tidak dibuka karena bukan host resmi. **Petunjuk:** edisi 2024 memuat ceklis 2-3, 3-4, 4-5, 5-6 thn, jadi bisa mengisi TODO `KIA-2Y-6Y` bila salinan resmi didapat.
- Teks lengkap Pedoman SDIDTK (modul stimulasi per kelompok usia): tidak terbaca. Jadwal KPSP dikonfirmasi lewat dokumen pelatihan, bukan PDF Kemenkes.
- NHS: tidak punya halaman milestone per bulan (hanya hub Start for Life dan panduan lokal per rentang). Tidak dipakai.

### Jendela WHO (bulan)

| Milestone | Persentil 1-99 | Rata-rata | Item KIA yang dijangkarkan |
| --- | --- | --- | --- |
| Duduk tanpa ditopang | 3,8-9,2 | 6,0 | KIA-9M-1 -> 6 |
| Berdiri dengan bantuan | 4,8-11,4 | 7,6 | KIA-9M-2 -> 8 |
| Merangkak (tangan-lutut) | 5,2-13,5 | 8,5 | KIA-9M-3 -> 9 |
| Berjalan dengan bantuan | 5,9-13,7 | 9,2 | KIA-12M-3 -> 10 |
| Berdiri sendiri | 6,9-16,9 | ~10,8-11,0 | KIA-18M-1 -> 15 (dibatasi rentang KIA) |
| Berjalan sendiri | 8,2-17,6 | ~12,0-12,1 | KIA-24M-2 -> 21 (berjalan stabil, interpolasi) |

Jendela dari abstrak (RTI/Acta Paediatrica). Rata-rata dari ringkasan sekunder (North Shore Pediatric Therapy) dan perlu dicocokkan ke tabel PDF WHO.

## Metode

1. **Grid usia**: 0-12 bln tiap bulan; 15, 18, 21, 24 bln (titik KPSP); 30, 36, 42, 48, 54, 60, 66, 72 bln.
2. **Item Buku KIA** (57 item): `expected_month` = bulan saat sumber dengan usia lebih rinci (AAP 1 bln, CDC 2/4/6/9/12/15/18 bln, median WHO dibulatkan ke atas) mencantumkan kemampuan yang setara, **dibatasi** ke rentang KIA-nya (`start <= expected <= cutoff`). Bila sumber rinci menaruhnya lebih awal dari rentang KIA (mis. "mama/papa" CDC 12 bln, KIA 12-18), item tetap di dalam rentang KIA. Bila tidak ada jangkar, item disebar dalam rentang dan ditandai `partial`. `referral_cutoff_month` = cutoff asli.
3. **Item CDC** (159): `expected_month` = `referral_cutoff_month` = usia CDC (sudah per usia, "sebagian besar anak (>=75%) sudah bisa").
4. **Stimulasi**: kegiatan lama tetap pada rentang asli (`verified`) kecuali 15 yang jendelanya dipersempit/diperpanjang mengikuti milestone yang dilatih atau tips CDC usia tersebut (`partial`, alasan di `note`). 16 kegiatan baru diambil dari tips "Parenting Tips and Activities" CDC atau mainan/kegiatan AAP, ditulis ulang dalam Bahasa Indonesia, field sama dengan kegiatan lama (`page: null`, karena sumbernya halaman web).
5. **2-6 tahun**: tidak ada data bulanan baru. Ceklis KIA 2-6 thn masih TODO; CDC 24/30/36/48/60 bln dan kegiatan stimulasi 24-72 bln tetap pada rentang aslinya. KPSP 42/54/66/72 bln ada di grid, tetapi belum ada item milestone pada titik itu.

Arti `verification` di file ini: `verified` = usia atau rentang dibaca langsung dari sumber untuk kemampuan yang sama; `partial` = interpolasi, pemetaan longgar antara wording KIA dan sumber lain, atau perpanjangan rentang. Ini sejalan dengan konvensi README (partial -> app menampilkan "konfirmasi ke petugas").

## Hasil per bulan (0-24 bln)

Jumlah milestone (KIA+CDC) yang `expected_month`-nya jatuh di bulan itu, dan jumlah kegiatan stimulasi aktif:

| Bulan | Milestone | Kegiatan aktif | Catatan |
| --- | --- | --- | --- |
| 0 | 0 | 9 | Masa neonatal; KIA mulai 29 hari. Tampilkan stimulasi saja. |
| 1 | 3 | 10 | KIA-3M-2, 3M-3, 3M-6 (AAP 1 bln) |
| 2 | 14 | 13 | CDC 2 bln + KIA-3M-1, 3M-7, 3M-8 |
| 3 | 2 | 10 | **Batas KIA 3 bln** |
| 4 | 18 | 13 | CDC 4 bln + 5 item KIA 6M |
| 5 | 3 | 13 | |
| 6 | 15 | 11 | **Batas KIA 6 bln**; CDC 6 bln; duduk (WHO) |
| 7 | 2 | 10 | |
| 8 | 5 | 13 | |
| 9 | 16 | 15 | **Batas KIA 9 bln**; CDC 9 bln |
| 10 | 8 | 16 | |
| 11 | 4 | 15 | |
| 12 | 10 | 12 | **Batas KIA 12 bln**; CDC 1 thn |
| 15 | 19 | 14 | CDC 15 bln + 6 item KIA 18M |
| 18 | 17 | 10 | **Batas KIA 18 bln**; CDC 18 bln |
| 21 | 6 | 11 | 6 item KIA 24M (semua partial) |
| 24 | 15 | 16 | **Batas KIA 24 bln**; CDC 2 thn |

Bulan 3, 5, 7, 11 tipis: wajar, karena sumber rinci berkumpul di 2, 4, 6, 9, 12 bln. Di UI, tiap bulan sebaiknya menampilkan "kemampuan bulan ini" plus item sebelumnya di rentang yang sama yang belum dicentang.

## Catatan penting (caveats)

1. **Penempatan per bulan bukan standar resmi Indonesia.** Kemenkes/IDAI tidak menerbitkan ceklis bulanan. Yang resmi tetap rentang Buku KIA dan titik KPSP. UI harus menyebut bulan sebagai perkiraan ("biasanya mulai terlihat sekitar usia ini"), bukan batas.
2. **Rujukan hanya di cutoff KIA** (3/6/9/12/18/24) dan usia CDC. Jangan membuat peringatan dari `expected_month`.
3. **Perbedaan KIA vs sumber lain**:
   - KIA-3M-5 "tertawa keras" dibatasi 3 bln oleh KIA, sedangkan CDC baru mencantumkan tertawa di 6 bln. Tetap ikuti KIA untuk rujukan, tetapi pantas ditinjau dokter.
   - KIA-9M-3 "merangkak" cutoff 9 bln, padahal persentil 99 WHO 13,5 bln dan IDAI menyebut sebagian bayi tidak merangkak sama sekali. Risiko alarm palsu.
   - KIA-12M-6 "memasukkan benda ke mulut" dan KIA-24M-4 "menjimpit" ditaruh KIA lebih lambat daripada CDC (6 dan 12 bln).
4. **Sumber IDAI bulanan hanya lewat media.** Angka IDAI (rata-rata duduk 6-7 bln, dst.) diambil dari liputan Kompas, bukan dokumen IDAI.
5. **Buku KIA 2024** hanya dibaca lewat ringkasan SlideShare; wording item 0-24 bln belum dicek ulang terhadap edisi 2024. Bila ada perubahan wording atau item, id lama mungkin perlu dipetakan ulang.
6. **AAP 4-7 bln** halaman lama (2009), dipakai hanya sebagai pendukung.
7. **Prematur**: KPSP memakai usia koreksi sampai 2 tahun (manual Unhas); `expected_month` sebaiknya juga memakai usia koreksi.
8. Kegiatan baru menambah 16 item `partial`; semuanya perlu ditinjau bidan/dokter sebelum rilis, sama seperti data lain.

## Langkah berikut yang disarankan

- Dapatkan PDF Buku KIA 2024 resmi (Puskesmas/Kemenkes) untuk mengisi ceklis 2-6 thn dan memastikan wording 0-24 bln.
- Dapatkan Pedoman SDIDTK resmi: modul stimulasinya per kelompok usia KPSP (termasuk 12-15 dan 15-18 bln) bisa menggantikan sebagian kegiatan baru CDC dengan sumber Indonesia.
- Bila disetujui, pindahkan `expected_month` ke `milestones.json` (field baru per item) dan jendela stimulasi ke `stimulation_activities.json`, lalu jalankan `build_csv.py`.
