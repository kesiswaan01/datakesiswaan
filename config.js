/* Konfigurasi publik frontend. JANGAN menaruh kata sandi, kunci API, atau token rahasia di sini — berkas ini terbaca siapa pun. */
window.APP_CONFIG = {
  // Alamat Web App Apps Script (hasil Deploy → New deployment → Web app), berakhiran /exec
  API_URL: 'https://script.google.com/macros/s/AKfycbw7wqjTIzGl79KzICvat-ppd33Qa2P3kHd82CNlRSU93Jm51hvzaq9ujH7sEGkaiIb1Ag/exec',
  // Selang (milidetik) pemeriksaan perubahan data oleh pengguna lain. 0 = matikan. Makin kecil makin banyak memakai kuota waktu eksekusi Apps Script.
  POLL_MS: 180000
};
