# Jelajah Korea Selatan 🇰🇷

Laman web interaktif berbahasa Melayu untuk merancang percutian ke Korea Selatan — direktori destinasi, perancang bajet, data langsung (cuaca & kadar tukaran), dan komuniti pelancong.

**Demo langsung:**
- GitHub Pages — https://lemonbearfiras.github.io/jelajah-korea-selatan/
- Qoder Sites (private) — https://jelajah-korea-qodzbckpyph.qoder.website

---

## Ciri-ciri utama

| Bahagian | Fungsi |
|---|---|
| 🌤️ **Destinasi** | 6 kad wilayah dengan cuaca **langsung** setiap bandar (Open-Meteo): suhu, suhu rasa, min–maks, kelembapan, angin, kebarangkalian hujan |
| 🗺️ **Peta Korea** | Peta SVG interaktif dengan laluan kereta api KTX sebenar + pin kota |
| 💰 **Perancang Bajet** | Kadar tukaran **langsung ECB** (graf 1 hari–1 tahun, setiap titik = 1 hari, hover crosshair), penukar RM↔₩, anggaran bajet ikut kadar/musim/tema + Jana itinerari harian; kad info ekonomi Korea |
| 📚 **Pangkalan Data** | 68 tempat (Seoul, Busan, Jeju, Gyeongju, Jeolla, Gangwon, dll.) dengan carian + modal butiran |
| 🤖 **Tanya Panduan** | Soalan bebas → cadangan tempat: AI langsung melalui Fungsi Qoder Sites; enjin padanan lokal sebagai sandaran apabila luar talian |
| 👥 **Komuniti** | Daftar/masuk (e-mel + Google) melalui Firebase, komen awam, halaman profil, ikut & rakan, dan sembang masa nyata |

## Tech stack

- **Frontend:** HTML + CSS + JavaScript biasa — tiada build step, tiada framework. Kesemua gaya dan skrip utama berada dalam `index.html`; skrip luaran di `js/`.
- **Backend komuniti:** Firebase (Auth + Firestore, SDK compat melalui CDN).
- **Data langsung:** [Open-Meteo](https://open-meteo.com) (cuaca), [Frankfurter](https://api.frankfurter.dev) (kadar MYR→KRW ECB).
- **AI:** Qoder Cloud Agents melalui edge Function Deno (`functions/index.ts`) — kuncian API diurus platform, tiada secret dalam pelayar.
- **Hosting:** GitHub Pages (statik) + Qoder Sites (statik + Function).

## Struktur folder

```
├── index.html            # Laman utama (segala CSS/JS utama + pangkalan data destinasi)
├── profile.html          # Halaman profil awam ahli
├── chat.html             # Sembang masa nyata antara rakan
├── js/
│   ├── live.js           # Cuaca langsung + graf kadar ECB + hover/tooltip
│   ├── firebase-config.js# Konfig projek Firebase (isi sendiri — lihat README-FIREBASE.md)
│   ├── komuniti-auth.js  # Daftar/masuk/Google (Firebase Auth, mod demo offline)
│   ├── komuniti-comments.js # Komen Firestore
│   ├── profile.js        # Profil, ikut/rakan
│   └── chat.js           # Sembang masa nyata
├── functions/
│   ├── index.ts          # Endpoint AI: /functions/v1/app?action=ask|health
│   └── cloud-agents.mjs  # Klien Qoder Cloud Agents
├── firestore.rules       # Peraturan keselamatan Firestore
├── dist/                 # Salinan siap diterbitkan (Qoder Sites)
└── README-FIREBASE.md    # Panduan penuh setup Firebase
```

## Menjalankan secara lokal

1. Klon atau muat turun folder ini.
2. Hidangkan sebagai pelayan statik, contoh:
   ```bash
   npx serve .          # atau
   python -m http.server 8000
   ```
3. Buka `http://localhost:8000`. Cuaca & kadar berjalan terus (API awan, tanpa kunci).
4. Komuniti: jika `js/firebase-config.js` belum diisi, laman automatik menggunakan **mod demo** (localStorage). Untuk Firebase sebenar, ikut [README-FIREBASE.md](README-FIREBASE.md) dan benarkan `localhost:8000` dalam *Authentication → Authorized domains*.
5. Fungsi AI hanya aktif di Qoder Sites; secara luar talian, "Tanya Panduan" digunakan enjin padanan lokal.

## Terbitkan

- **GitHub Pages:** push ke `main` — Pages menerbitkan dari akar repositori.
- **Qoder Sites:** `dist/` + `functions/` disiapkan dan diterbitkan melalui Qoder (runtime edge Function).

## Data & kredit

- Cuaca: Open-Meteo (bekanan, tanpa kunci API).
- Kadar tukaran: kadar langsung terkini dari [exchangerate.fun](https://api.exchangerate.fun/latest); siri harian melalui Bank Tengah Eropah (API Frankfurter).
- Fakta ekonomi: Bank Korea, KDI, OECD (setakat Oktober 2026).
- Imej: Wikimedia Commons (thumb 1280/1920px).
- Direka dan dibina sebagai projek penilaian pelajar.

## Lesen

Dilesenkan di bawah [LICENSE](LICENSE).
