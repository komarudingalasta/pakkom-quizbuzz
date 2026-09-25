# PAKKOM-QUIZBUZZ V3.3 — Clean Arena + Selfie

Versi ini memakai Firebase Realtime Database, Anonymous Authentication, dan Firebase Storage.

## Fitur utama
- Atomic buzzer via Firebase transaction
- Countdown 3–2–1, rebuzz, Batalkan Buzz, Batalkan Soal, undo skor
- 30 pilihan sound buzzer
- Projector Arena dan podium
- Persistent session: peserta/host kembali ke permainan setelah refresh
- Foto atau video selfie opsional (maks. ±3 detik, tanpa audio)
- Media pemenang tampil bersama nama tim di host controller dan layar proyektor
- Foto/video juga dipakai sebagai identitas tim/podium

## Setup Firebase
1. Authentication > Sign-in method > aktifkan **Anonymous**.
2. Realtime Database > Rules > tempel isi `database.rules.json` lalu Publish.
3. Storage > Get started / aktifkan Firebase Storage.
4. Storage > Rules > tempel isi `storage.rules` lalu Publish.
5. `firebase-config.js` sudah berisi konfigurasi project `pakkom-quizbuzz` yang digunakan pada pengembangan ini.

## Catatan kamera
- Kamera memerlukan HTTPS atau localhost. GitHub Pages memenuhi syarat HTTPS.
- Pengguna dapat memilih **Lewati**, jadi kamera tidak wajib.
- Video direkam tanpa audio, sekitar 3 detik, bitrate rendah, dan dibatasi Storage Rules <3 MB.
- Untuk penggunaan siswa, sesuaikan penggunaan foto/video dengan kebijakan dan persetujuan sekolah yang berlaku.

## File
- `index.html`
- `style.css`
- `app.js`
- `firebase-config.js`
- `database.rules.json`
- `storage.rules`
- `sounds/`


## V3.3 — Akhiri & Keluar
- Host: **Akhiri Game** mengubah room menjadi `finished` dan menampilkan hasil ke semua perangkat.
- Host pada hasil akhir: **Selesai & Keluar** menghapus sesi host lokal dan kembali ke Home.
- Peserta pada hasil akhir: **Selesai & Keluar** menghapus sesi peserta lokal dan kembali ke Home.
- Peserta dapat **Keluar dari tim** saat game berlangsung tanpa mengakhiri game peserta lain; skor/riwayat tetap disimpan.
- Refresh bukan keluar: persistent session tetap memulihkan room selama pengguna belum menekan tombol keluar.

## V3.4 Selfie & Join Fix
- Nama tim dipertahankan saat kembali dari halaman selfie.
- Foto selfie tersedia sebagai opsi utama selain video.
- Perekaman video dibuat lebih kompatibel; perangkat yang tidak mendukung diarahkan ke Foto Selfie.
- Upload media memiliki timeout 8 detik. Jika Storage lambat/gagal, peserta tetap masuk permainan tanpa media.
- Status online peserta disimpan saat berhasil bergabung.
