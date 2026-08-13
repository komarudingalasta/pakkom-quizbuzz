# PAKKOM-QUIZBUZZ

File siap di-upload ke GitHub Pages.

## Isi
- `index.html`
- `style.css`
- `app.js`

## Upload ke GitHub
1. Buat repository baru, misalnya `PAKKOM-QUIZBUZZ`.
2. Upload ketiga file tersebut ke root repository.
3. Buka **Settings → Pages**.
4. Pada Source pilih **Deploy from a branch**.
5. Pilih branch `main` dan folder `/ (root)`.
6. Simpan.
7. GitHub akan memberikan alamat GitHub Pages.

## Catatan
File ini adalah tahap tampilan dan alur dasar. Data demo masih menggunakan localStorage, sehingga belum sinkron antar-HP.

Untuk tahap real-time berikutnya, `app.js` akan dihubungkan ke backend seperti Supabase. Setelah itu:
- Pembuat membuat room.
- Peserta dari HP berbeda masuk dengan kode.
- Daftar peserta tampil real-time.
- Tekanan BEL diterima server dan hanya peserta tercepat yang menang.
- Benar/Salah mengubah skor semua perangkat secara real-time.
