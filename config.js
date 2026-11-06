/* Konfigurasi publik frontend. JANGAN menaruh kata sandi, kunci API, atau token rahasia di sini — berkas ini terbaca siapa pun. */
window.APP_CONFIG = {
  // Alamat Web App Apps Script (hasil Deploy → New deployment → Web app), berakhiran /exec
  API_URL: 'GANTI_DENGAN_ALAMAT_WEB_APP_ANDA/exec',
  // Selang (milidetik) pemeriksaan perubahan data oleh pengguna lain. 0 = matikan. Makin kecil makin banyak memakai kuota waktu eksekusi Apps Script.
  POLL_MS: 180000
};
