# PAKKOM-QUIZBUZZ V2 — Firebase Realtime Database

Versi ini sudah dimigrasikan dari Supabase ke Firebase Realtime Database dan menambahkan fondasi QuizBuzz V2: anonymous auth, transaction/atomic buzzer, countdown, rebuzz setelah jawaban salah, undo skor, QR join, reconnect tim, lock room, kick tim, host control, riwayat aksi, dan mode layar proyektor.

## 1. Buat Firebase Project
1. Firebase Console → Add project → misalnya `pakkom-quizbuzz`.
2. Build → Authentication → Get started → Sign-in method → aktifkan **Anonymous**.
3. Build → Realtime Database → Create Database. Pilih region terdekat yang tersedia (umumnya Singapore untuk Indonesia) dan mulai dalam locked mode.
4. Project settings → Your apps → Web (`</>`) → Register app.
5. Salin konfigurasi Web App ke `firebase-config.js`.

## 2. Pasang Rules
Realtime Database → Rules → ganti seluruh rules dengan isi `database.rules.json` → Publish.

Catatan: rules ini membatasi kontrol room/skor ke UID host dan tim ke UID pemilik. Buzzer peserta hanya boleh mengisi pemenang saat buzzer memang terbuka dan masih kosong. Penentuan pertama juga memakai transaction Firebase.

## 3. Upload GitHub Pages
Upload seluruh isi folder ini, termasuk folder `sounds`, `firebase-config.js`, dan `database.rules.json` (rules file aman disimpan; bukan secret).

GitHub → Settings → Pages → Deploy from branch → main → /(root).

## 4. Uji
- Buka URL sebagai host → Buat Permainan.
- Scan QR / masukkan kode pada perangkat peserta.
- Peserta pilih nama dan suara tim.
- Host tekan `MULAI 3…2…1`.
- Hanya pemenang transaksi pertama yang tercatat.
- Jika salah, host dapat `SALAH & REBUZZ` atau `SALAH & SELESAI`.
- `UNDO` membatalkan keputusan skor terakhir.
- `LAYAR PROYEKTOR` membuka tampilan publik khusus pertandingan.

## Catatan
Firebase Web config bukan secret. Jangan pernah memasukkan service-account/private key ke GitHub.

## Update QuizBuzz V2.1
- 30 pilihan sound buzzer. Sound 1–7 memakai MP3 lama; sound 8–30 dibuat ringan dengan Web Audio sehingga tidak menambah file besar.
- Sound boleh sama antar tim dan tersedia tombol Preview serta Acak.
- Batalkan Buzz: membatalkan penekan bel saat ini, membuka bel kembali, tanpa perubahan skor.
- Batalkan Soal: menutup soal aktif, menghapus status pemenang/blocked, tanpa perubahan skor dan tetap dicatat di history.
