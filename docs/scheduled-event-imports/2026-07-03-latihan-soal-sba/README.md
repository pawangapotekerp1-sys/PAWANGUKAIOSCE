# Latihan Soal SBA Mapping

Sumber:
- `C:/Users/ASUS/Downloads/Latihan Blok SBA.docx`

Tujuan:
- menggantikan soal lama pada event terjadwal `LATIHAN SOAL SBA`
- jumlah soal hasil mapping: `30`
- semua `blockId` dan `topicId` dipetakan ke `null`

File hasil:
- `latihan-soal-sba-staging.csv`
  - versi staging untuk audit manual per soal
- `latihan-soal-sba-normalized.json`
  - hasil normalisasi 30 soal lengkap dengan opsi, kunci jawaban, dan pembahasan
- `latihan-soal-sba-scheduled-event-update.template.json`
  - template payload untuk update event terjadwal
  - sebelum dipakai ke production, isi placeholder berikut dari event yang sudah ada:
    - `description`
    - `editorialStatus`
    - `accessStartAt`
    - `accessEndAt`
- `latihan-soal-sba-parse-summary.json`
  - ringkasan hasil parsing dan catatan jika ada item bermasalah

Catatan:
- preview teks di terminal Windows bisa menampilkan beberapa karakter satuan dengan tampilan aneh, tetapi file JSON/CSV tersimpan UTF-8 dengan isi yang benar.
- payload template ini sengaja belum berisi `eventId`; saat eksekusi nanti, `eventId` event `LATIHAN SOAL SBA` perlu diambil dari production lalu dipasangkan ke RPC update.
