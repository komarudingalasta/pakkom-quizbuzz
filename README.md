# PAKKOM-QUIZBUZZ

GitHub Pages + Supabase Realtime.

## Upload
Upload `index.html`, `style.css`, dan `app.js` ke repository GitHub lalu aktifkan:
Settings → Pages → Deploy from branch → main → root.

## Penting
Versi ini menggunakan Supabase Realtime Broadcast. Agar daftar peserta dan kontrol pembuat berjalan sempurna, mekanisme sinkronisasi room sebaiknya memakai database Supabase sebagai sumber kebenaran. Broadcast saja tidak menyimpan state untuk peserta yang masuk terlambat.

Publishable key boleh berada di frontend. Jangan pernah memasukkan secret/service_role key ke repository.
