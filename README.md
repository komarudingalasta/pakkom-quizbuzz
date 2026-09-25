# PAKKOM-QUIZBUZZ V4 — Classroom Arena

Fokus versi ini: stabilitas join dan media di HP.

## Perubahan V4
- Nama tim disimpan sebagai draft saat diketik; tidak hilang ketika pindah ke halaman media.
- Foto selfie memakai kamera/file capture bawaan perangkat, bukan getUserMedia.
- Opsi Pilih Foto dari galeri.
- Video selfie memakai recorder bawaan perangkat agar lebih kompatibel dengan Android/WebView.
- Media opsional: kegagalan Storage tidak menggagalkan proses gabung.
- Preview media sebelum bergabung.
- Waktu buzz tercepat ditampilkan dalam detik.
- Persistent session/reconnect, keluar peserta, Akhiri Game host, podium tetap tersedia.
- Rebutan setelah jawaban salah, Batalkan Buzz, Batalkan Soal, Undo skor, Projector Mode.

## Firebase
Aktifkan Anonymous Authentication, Realtime Database, dan Storage. Publikasikan database.rules.json dan storage.rules.

Catatan: fitur kamera/file capture harus diuji dari situs HTTPS (misalnya GitHub Pages) di browser perangkat. Preview lokal/WebView tertentu dapat membatasi kamera.
