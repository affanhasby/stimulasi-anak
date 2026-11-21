# Catatan deploy

Bagian yang sudah diputuskan. Langkah GitHub Pages + Supabase cloud dilengkapi saat deploy.

## Email lewat Gmail (tanpa domain sendiri)

Semua email (konfirmasi daftar, lupa kata sandi, pengingat imunisasi) dikirim dari satu akun Gmail khusus app, dengan nama pengirim "Stimulasi Anak".

### 1. Siapkan akun Gmail
1. Buat akun Gmail khusus, mis. `stimulasianak@gmail.com` (jangan akun pribadi).
2. Aktifkan **Verifikasi 2 Langkah**: Akun Google > Keamanan.
3. Buat **App Password**: Akun Google > Keamanan > Sandi aplikasi > beri nama "Stimulasi Anak". Simpan 16 karakternya; ini yang dipakai server, bukan kata sandi Gmail.

### 2. Email akun (Supabase Auth)
Supabase Dashboard > Authentication > Emails > SMTP Settings > Enable custom SMTP:

| Isian | Nilai |
| --- | --- |
| Host | `smtp.gmail.com` |
| Port | `465` |
| Username | alamat Gmail tadi |
| Password | App Password |
| Sender email | alamat Gmail tadi |
| Sender name | `Stimulasi Anak` |

Template Bahasa Indonesia ada di `supabase/templates/` (salin isinya ke Authentication > Emails > Templates, atau `supabase config push`).

### 3. Email pengingat (Edge Function `send-reminders`)
```bash
supabase secrets set SMTP_HOST=smtp.gmail.com SMTP_PORT=465 SMTP_USER=<gmail> SMTP_PASS=<app-password>
```
Port 465 wajib: Supabase memblokir 25 dan 587 dari Edge Functions.

### Batas
- Gmail: sekitar 500 email/hari; kiriman massal bisa diblokir sementara. Cukup untuk awal.
- Bila pengguna bertambah: beli domain (mis. `.my.id`), lalu ganti ke Resend dengan `supabase secrets set RESEND_API_KEY=...` (fungsi otomatis memakai Resend bila kunci ini ada).

## Rahasia lain untuk fungsi pengingat
```bash
supabase secrets set REMINDER_SECRET=<acak> VAPID_PUBLIC_KEY=<baru> VAPID_PRIVATE_KEY=<baru> VAPID_SUBJECT=mailto:<gmail>
```
Lalu di SQL Editor (sekali per project):
```sql
select vault.create_secret('https://<ref>.supabase.co', 'project_url');
select vault.create_secret('<REMINDER_SECRET yang sama>', 'reminder_secret');
```
Kunci VAPID produksi dibuat baru (jangan pakai kunci lokal); kunci publiknya diisi ke `VITE_VAPID_PUBLIC_KEY` saat build.
