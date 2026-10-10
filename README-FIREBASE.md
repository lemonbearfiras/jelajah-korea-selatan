# Panduan Firebase — Ruang Komuniti (Sign In + Komen + Profil + Rakan + Sembang)

Ruang Komuniti di laman ini disambungkan kepada **Firebase** (Authentication + Cloud Firestore).
Sebelum konfigurasi diisi, laman berjalan dalam **Mod Demo** — semua fungsi boleh dicuba,
tetapi akaun & komen disimpan dalam pelayar anda sahaja.

---

## Langkah 1 — Cipta projek Firebase (2 minit)

1. Buka <https://console.firebase.google.com> dan log masuk dengan akaun Google.
2. Klik **Create a project / Add project**.
3. Nama projek: cth. `jelajah-korea` → teruskan (Google Analytics boleh dimatikan).

## Langkah 2 — Salin konfigurasi ke `js/firebase-config.js`

1. Dalam halaman utama projek, klik ikon **Web** `</>` (Add app → Web).
2. Taip nama samaran cth. `jelajah-korea-web` → **Register app**.
3. Firebase memaparkan blok `const firebaseConfig = {...}` — **salin setiap nilai**.
4. Buka fail **`js/firebase-config.js`** dan gantikan semua nilai `MASUKKAN_...`:

```js
var FIREBASE_CONFIG = {
  apiKey:            "AIzaSy... (daripada Firebase)",
  authDomain:        "jelajah-korea.firebaseapp.com",
  projectId:         "jelajah-korea",
  storageBucket:     "jelajah-korea.appspot.com",
  messagingSenderId: "123456789012",
  appId:             "1:123456789012:web:abc123"
};
```

5. Simpan fail. Sebaik sahaja nilai diisi, laman bertukar daripada Mod Demo ke Firebase secara automatik.

## Langkah 3 — Aktifkan Authentication

1. Menu kiri: **Build → Authentication → Get started**.
2. Tab **Sign-in method** → aktifkan:
   - **Email/Password** → Enable → Save
   - **Google** → Enable → masukkan emel sokongan projek → Save

> **Nota Google sign-in:** Google hanya dibenarkan dari domain yang didaftarkan.
> `file://` (buka terus index.html) **tidak** dibenarkan — gunakan `localhost`
> (Langkah 5). Emel/kata laluan berfungsi sama ada melalui `file://` mahupun localhost.

## Langkah 4 — Cipta pangkalan data Firestore + peraturan

1. Menu kiri: **Build → Firestore Database → Create database**.
2. Pilih lokasi (cth. `asia-southeast1` — Singapura) → mode **Production** → Create.
3. Tab **Rules** → **padam semua** teks lama → buka fail **`firestore.rules`** dalam
   folder projek ini → **Ctrl+A kemudian Ctrl+C** (salin SELURUH isinya) →
   tampal di tab Rules → klik **Publish**.

> ⚠️ Peraturan versi ini menambah koleksi baharu: `follows`, `friendRequests`,
> `friends`, `chats` dan medan `about` dalam `users`. Tanpa menerbitkannya,
> halaman profil masih loads (nama, komen, tarikh) tetapi kiraan Pengikut /
> Mengikut / Rakan paparkan "—" dan butang Ikut / Tambah Rakan / Chat gagal.

Maksud peraturan ringkas:

- `comments` — sesiapa boleh baca; hanya ahli log masuk boleh tulis; padam milik sendiri.
- `users` — profil awam (nama, foto, `about` ≤ 500 aksara, `createdAt`); hanya pemilik boleh ubah/padam. Emel tidak disimpan di sini.
- `follows` — satu dokumen `ID = saya_dia`; siapa pun boleh baca kiraan; hanya pengikut boleh cipta/padam ikutan sendiri.
- `friendRequests` — `ID = penghantar_penerima`; hanya dua orang terlibat boleh baca; penerima sahaja boleh terima (pending → accepted).
- `friends` — `ID = dua uid tersusun a-z`; awam boleh baca (bukti persahabatan); hanya dicipta oleh penerima selepas permintaan diterima.
- `chats` — mesej dalam `chats/<pairId>/messages`; HANYA dua rakan terlibat boleh baca/hantar; teks 1–1000 aksara; padam mesej sendiri.

## Langkah 5 — Buka laman melalui localhost (disyorkan)

Untuk Google sign-in (dan pengujian yang paling mirip laman sebenar):

```bash
# dalam folder projek, mana-mana satu:
py -m http.server 8000        # Windows (Python)
npx serve .                   # Node.js
```

Kemudian buka <http://localhost:8000>.
`localhost` sudah secara automatik dibenarkan oleh Firebase Authentication.

---

## Struktur fail

| Fail | Fungsi |
|---|---|
| `index.html` | Laman utama — termasuk section `09 — Komuniti` |
| `profile.html` | Halaman profil **awam** setiap ahli — `profile?v=<uid>` (pautan avatar/nama dalam komen & top bar) |
| `js/profile.js` | Logik profil — butang Ikut, Tambah Rakan / Terima / Chat, statistik & sunting Tentang |
| `chat.html` | Halaman **sembang peribadi** antara dua rakan — `chat?v=<uid rakan>` |
| `js/chat.js` | Logik chat masa nyata (onSnapshot) — hantar & papar mesej |
| `js/firebase-config.js` | **Anda isi** konfigurasi projek di sini |
| `js/komuniti-auth.js` | Daftar / masuk / Google / log keluar (dua mod) |
| `js/komuniti-comments.js` | Papar, hantar & padam komen (Firestore / demo) |
| `firestore.rules` | Peraturan keselamatan Firestore (tampal dalam Console — Langkah 4) |
| `destinations-korea.json` | Salinan sandaran pangkalan data 68 tempat |

## Data yang disimpan

- **Firebase mode:** koleksi dalam Firestore
  - `comments` → `{ uid, name, photo, text, createdAt }` — kemas kini masa nyata (tanpa muat semula).
  - `users` → profil awam setiap akaun: `{ uid, name, photo, about, createdAt }` — dicipta automatik semasa daftar/masuk; `about` (max 500 aksara) boleh disunting pemilik dalam halaman profil. Emel tidak disimpan di sini (privasi — dokumen ini boleh dibaca umum).
  - `follows` → `{ follower, following }` — ID dokumen `pengikut_diikuti`; untuk kiraan Pengikut/Mengikut.
  - `friendRequests` → `{ from, to, status }` — ID `penghantar_penerima`; status `pending` / `accepted`.
  - `friends` → `{ participants: [uidA, uidB] tersusun a-z, reqId }` — bukti persahabatan; ID = `uidA_uidB`.
  - `chats/<pairId>/messages` → `{ from, to, text, createdAt }` — sembang peribadi, hanya antara dua rakan.
- **Mod demo:** `localStorage` pelayar (`km-demo-user`, `km-demo-comments`).

## Soalan lazim

| Masalah | Punca / penyelesaian |
|---|---|
| `auth/unauthorized-domain` | Buka melalui `http://localhost:8000`, atau tambah domain anda di Authentication → Settings → Authorized domains |
| `permission-denied` semasa hantar | Peraturan Firestore belum diterbitkan (Langkah 4) |
| Komen tidak muncul | Semak anda gunakan projek yang betul dalam `js/firebase-config.js`; buka Console (F12) untuk ralat |
| `auth/operation-not-allowed` | Aktifkan kaedah Email/Password atau Google dalam Authentication |
| Lupa kata laluan | Klik "Lupa kata laluan?" — pautan set semula dihantar ke emel |
