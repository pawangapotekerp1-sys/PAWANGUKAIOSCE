# Flashcard BYOK Design

**Context**

Flash card generator saat ini memakai key Gemini platform global yang dibaca dari `ai_provider_configs` dan Supabase Vault. Pengguna ingin pola ini diubah menjadi BYOK per user dari frontend, dengan pengalaman yang konsisten seperti Question Generator.

**Approved Behavior**

1. BYOK flashcard berlaku untuk **admin dan mentor**.
2. API key disimpan **per user**, bukan global platform.
3. Model dikunci ke **`gemini-2.5-flash`**, sama seperti Generator Soal.
4. Halaman create flashcard menampilkan panel ringkas `Status Gemini BYOK` dengan:
- status aktif/belum aktif,
- input API key,
- simpan,
- tes koneksi,
- hapus key,
- restore key dari local browser.
5. Pembuatan dan pemrosesan draft flashcard diblok bila user belum punya BYOK valid di backend.
6. Implementasi backend mengikuti pola BYOK per user yang sudah ada, supaya key yang disimpan user dapat dipakai konsisten oleh fitur AI personal lain.

**Implementation Shape**

- Frontend create page flashcard akan memuat status BYOK dan menahan submit bila key belum valid.
- API client flashcard akan ditambah kontrak `get-status`, `save-credential`, `test-credential`, dan `delete-credential`.
- Edge function `flash-card-generator` akan membaca dan mengelola credential user, bukan lagi platform config global.
- Penyimpanan local browser akan memakai helper terpisah agar UX flashcard tetap rapi dan tidak bercampur dengan Question Generator.

**Risk Notes**

- Perubahan ini menghapus ketergantungan flashcard ke platform AI config aktif.
- Karena memakai credential per user, kegagalan setup BYOK akan langsung menghentikan proses material baru sampai user menyimpan key yang valid.
- UX admin dan mentor harus tetap sama walau entry route saat ini baru terlihat di jalur mentor.
