# PAKKOM-QUIZBUZZ

## 1. Supabase
Buka Supabase → SQL Editor → New query.
Salin seluruh isi `supabase.sql`, lalu klik **Run**.

## 2. GitHub
Upload:
- index.html
- style.css
- app.js

Aktifkan GitHub Pages:
Settings → Pages → Deploy from branch → main → /(root).

## 3. Uji
Buka URL GitHub Pages di HP/laptop pembuat.
- Buat permainan.
- Catat kode 6 karakter.
- Buka URL yang sama pada HP peserta.
- Masukkan kode dan nama tim.
- Pembuat buka BEL.
- Peserta menekan BEL.
- Pembuat memilih BENAR/SALAH.

## Catatan keamanan
Publishable key ada di app.js dan boleh digunakan pada frontend. Jangan pernah menaruh service_role/secret key di GitHub.

Versi ini menggunakan database Supabase + Postgres Realtime. Kebijakan anon pada SQL dibuat longgar agar prototipe dapat langsung diuji. Untuk pemakaian kompetisi publik, sebaiknya ditambah autentikasi dan validasi server/RPC agar peserta tidak dapat mengubah skor secara manual.
