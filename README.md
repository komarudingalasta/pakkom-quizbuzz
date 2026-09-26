# PAKKOM-QUIZBUZZ V5.4 – Competition Audio

Basis: V5.3.1 Mobile & Room Fix.

Perubahan audio:
- Bunyi BEL tim tetap memakai 30 suara pilihan tim, lalu voice hanya menyebut nama tim.
- BENAR memakai chime naik khusus, lalu voice “Benar!”.
- SALAH memakai tone turun khusus, lalu voice “Salah!”.
- Rebutan kembali memakai double-beep khusus, lalu voice “Rebutan dibuka kembali.”
- Audio memakai antrean (audio queue), sehingga sound effect dan voice tidak diputar bersamaan.
- Event baru dapat membatalkan antrean lama yang sudah tidak relevan.
- Voice utama hanya pada Host/Projector; perangkat peserta tidak ikut berbicara.
- Audio di-unlock pada interaksi pertama untuk kompatibilitas kebijakan autoplay browser.

Firebase rules tidak berubah dari V5.3.1.


## V5.4.1 Audio & Voice Fix
- Voice pemenang: “Tim [nama], menekan bel.”
- Voice benar: “Benar. Tim [nama], mendapat [poin] poin.”
- Voice salah: “Salah. Tim [nama].”
- Pemilihan voice Indonesia bila tersedia dan referensi utterance dipertahankan untuk Android.
- Host kini menampilkan panel BENAR/SALAH yang jelas setelah penilaian.
- Efek bel, benar, salah tetap berbeda dan seluruh audio tetap berurutan.

## V5.5 — Cobalt + Coral
- Brand tetap **PakKom QuizBuzz**.
- Halaman Buat Room didesain ulang dengan palet cobalt + coral.
- Nama Kompetisi sekarang wajib dan disimpan sebagai `rooms/{code}/title`.
- Live preview nama kompetisi + nama babak sebelum room dibuat.
- Judul kompetisi ikut tampil pada area host dan projector.
- Audio/voice engine V5.4.1 tetap dipertahankan.
