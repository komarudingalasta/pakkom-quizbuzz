# PAKKOM-QUIZBUZZ V5.2.1 – Permission Fix

Perbaikan khusus Firebase Realtime Database permission denied saat peserta bergabung.
Foto tetap storage-free: avatar kecil disimpan sementara di Realtime Database.

## Wajib setelah upload
Salin seluruh isi `database.rules.json` ke Firebase Console > Realtime Database > Rules lalu Publish.
Anonymous Authentication harus aktif.

## Catatan
Rules V5.2.1 memprioritaskan kompatibilitas alur aplikasi (create room, join, buzzer, scoring) sambil menjaga hostUid dan ownerUid tidak dapat diganti setelah dibuat. Hardening hak host per-path dapat dilakukan pada versi berikutnya setelah seluruh alur tervalidasi.

# PAKKOM-QUIZBUZZ V5.2 — Storage-Free Photo

QuizBuzz adalah bel digital real-time untuk cerdas cermat/rebutan cepat.

## Perubahan V5.2
- Firebase Storage tidak digunakan.
- Foto selfie/galeri dipotong persegi dan dikompres menjadi avatar 200×200 di perangkat peserta.
- Avatar kecil disimpan sementara sebagai Data URL di Realtime Database pada data tim.
- Foto tampil di lobby/papan skor, host, pemenang buzz, projector, dan podium.
- Jika peserta tidak memakai foto, aplikasi memakai inisial tim.
- Video dinonaktifkan agar aplikasi ringan dan tetap dapat berjalan tanpa Storage.

## Firebase yang dibutuhkan
1. Authentication → Anonymous sign-in: aktifkan.
2. Realtime Database: aktifkan.
3. Publish isi `database.rules.json` ke Realtime Database → Rules.
4. Firebase Storage tidak perlu diaktifkan.

## Hosting
Upload isi folder ini ke GitHub Pages seperti versi sebelumnya.

## Catatan foto
Foto asli tidak dikirim. Browser lebih dulu crop dan kompres foto menjadi avatar kecil. Ukuran string avatar dibatasi di aplikasi dan Database Rules agar tidak membebani Realtime Database.


## V5.3.1 Mobile & Room Fix
- Home responsive diperbaiki untuk HP portrait; tidak ada panel terpotong ke kanan.
- Pembuatan room dilakukan bertahap (hostUid lalu data room) agar kompatibel dengan rules.
- Error Firebase saat membuat room sekarang ditampilkan, tidak berhenti di “Membuat room…”.
- Publish database.rules.json dari paket ini di Firebase Realtime Database > Rules.
