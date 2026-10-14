# Firebase Guide — Community Space (Sign In + Comments + Profile + Friends + Chat)

The Community Space on this site is connected to **Firebase** (Authentication + Cloud Firestore).
Before the configuration is filled in, the site runs in **Demo Mode** — every feature can be tried,
but accounts & comments are stored only in your browser.

---

## Step 1 — Create a Firebase project (2 minutes)

1. Open <https://console.firebase.google.com> and log in with a Google account.
2. Click **Create a project / Add project**.
3. Project name: e.g. `jelajah-korea` → continue (Google Analytics can be turned off).

## Step 2 — Copy the configuration into `js/firebase-config.js`

1. On the project's main page, click the **Web** icon `</>` (Add app → Web).
2. Type a nickname, e.g. `jelajah-korea-web` → **Register app**.
3. Firebase shows a `const firebaseConfig = {...}` block — **copy every value**.
4. Open the **`js/firebase-config.js`** file and replace every placeholder value (they all start with `MASUKKAN_`) with the value Firebase shows you:

```js
var FIREBASE_CONFIG = {
  apiKey:            "AIzaSy... (from Firebase)",
  authDomain:        "jelajah-korea.firebaseapp.com",
  databaseURL:       "https://jelajah-korea-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "jelajah-korea",
  storageBucket:     "jelajah-korea.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId:             "1:123456789012:web:abc123",
  measurementId:     "G-XXXXXXXXXX"
};
```

> Extra fields are harmless: the site only ever talks to **Firestore**, **Authentication** and **AI Logic**. `databaseURL` (Realtime Database) and `measurementId` (Analytics) are kept so the block matches what the console shows — the Realtime Database is not used and its rules stay closed, so no data lives there.

5. Save the file. As soon as the values are filled in, the site switches from Demo Mode to Firebase automatically.

## Step 3 — Enable Authentication

1. Left menu: **Build → Authentication → Get started**.
2. **Sign-in method** tab → enable:
   - **Email/Password** → Enable → Save
   - **Google** → Enable → enter the project support email → Save

> **Google sign-in note:** Google is only allowed from registered domains.
> `file://` (opening index.html directly) is **not** allowed — use `localhost`
> (Step 6). Email/password work both through `file://` and through localhost.

## Step 4 — Create the Firestore database + rules

1. Left menu: **Build → Firestore Database → Create database**.
2. Choose a location (e.g. `asia-southeast1` — Singapore) → **Production** mode → Create.
3. **Rules** tab → **delete all** the old text → open the **`firestore.rules`** file in
   this project folder → **Ctrl+A then Ctrl+C** (copy ALL of its contents) →
   paste it in the Rules tab → click **Publish**.

> ⚠️ This version of the rules adds new collections: `follows`, `friendRequests`,
> `friends`, `chats`, the required `username` field (3–20 characters, `^[a-z0-9._]{3,20}$`) and the editable
> `about` field (≤ 500 characters) in `users`. Without publishing them, the profile page still
> loads (name, comments, date)
> but the Followers / Following / Friends counts show "—" and the Follow / Add Friend / Chat
> buttons fail.

What the rules mean in short:

- `comments` — anyone can read; only signed-in members can write; you can delete only your own.
- `users` — public profile (name, photo, `about` ≤ 500 characters, required `username` of 3–20 characters matching `^[a-z0-9._]{3,20}$`, `createdAt`); only the owner can edit/delete. Email is not stored here. Members without a username yet must set one in **settings.html** before any other change can be saved. Can be updated through the **settings.html** page (the ⚙ Settings button on your own profile). The photo is either an image link or an **uploaded photo** stored as a `data:image/...` text (up to 120,000 characters) — the rules must allow that length or saving a new photo is rejected.
- `follows` — one document per follow, `ID = follower_following`; anyone can read the counts; only the follower can create or delete their own follow.
- `friendRequests` — `ID = sender_receiver`; only the two people involved can read; only the recipient can accept (pending → accepted).
- `friends` — `ID = the two uids sorted a-z`; anyone can read (proof of friendship); created only by the recipient after the request is accepted.
- `chats` — messages in `chats/<pairId>/messages`; only the two friends involved can read or send; text 1–1000 characters; you can delete only your own messages.

## Step 5 — Enable the AI answers (Firebase AI Logic)

"Ask Jelajah AI" calls Gemini through **Firebase AI Logic** straight from the browser (`js/ai-logic.js`), so it works on GitHub Pages too — no API key is ever put in the code. It uses the same project as Step 2.

1. Open [the Firebase console](https://console.firebase.google.com) and pick **jelajah-korea**.
2. In the left menu, under **Build**, click **Gemini AI** (it may be labelled *AI Logic* / *Vertex AI in Firebase*), then click **Get started** / **Enable**.
3. Choose the **Gemini Developer API** free tier when it asks which backend to use. Confirmation appears after a minute or two; the site then answers for visitors immediately — nothing to publish again.
4. If the console instead shows an error saying AI Logic works best with **App Check**, do this extra bit:
   - Open [Google Cloud reCAPTCHA](https://www.google.com/recaptcha/admin/create), choose **reCAPTCHA v3**, add both domains — `lemonbearfiras.github.io` and your `*.qoder.website` host — and accept.
   - Copy the **site key** it shows and paste it into `APP_CHECK_SITE_KEY` at the top of `js/ai-logic.js`. (The site key is public by design; the secret key is not needed by this site.)
   - Back in the Firebase console → **App Check** → **Get started for Web** → register this web app with that site key → save.
5. **Free-tier limits.** Google's free tier for this project allows about **20 Gemini requests per day per model**, plus a per-minute cap, and the counter resets after roughly 12 hours of usage. `gemini-2.5-flash` (the name in older guides) is no longer open to new projects, so `js/ai-logic.js` asks for `gemini-3.8-flash` and falls back to the `gemini-flash-latest` alias. When the quota runs out the ask box does **not** break: it moves on to the Qoder Sites Function (your MiniMax gateway credit) and then to the offline matching engine. If you want more free quota for demo day, enable billing on the project — Google then charges per request instead of blocking at 20/day.

## Step 6 — Open the site through localhost (recommended)

For Google sign-in (and testing that most closely matches the real site):

```bash
# in the project folder, either one:
py -m http.server 8000        # Windows (Python)
npx serve .                   # Node.js
```

Then open <http://localhost:8000>.
`localhost` is already allowed automatically by Firebase Authentication.

---

## File structure

| File | Function |
|---|---|
| `index.html` | Home page — includes the `09 — Community` section |
| `profile.html` | **Public** profile page of each member — `profile?v=<uid>` (the avatar/name links in comments & the top bar) |
| `js/profile.js` | Profile logic — Follow button, Add Friend / Accept / Chat, statistics & editing About |
| `chat.html` | **Private chat** page between two friends — `chat?v=<friend uid>` |
| `js/chat.js` | Real-time chat logic (onSnapshot) — send & display messages |
| `settings.html` | **Profile settings** page for the signed-in owner — name, photo, username, about |
| `js/settings.js` | Settings logic — form validation, photo upload/resize, saving to `users` |
| `js/firebase-config.js` | **You fill in** the project configuration here |
| `js/komuniti-auth.js` | Sign up / sign in / Google / log out (two modes) |
| `js/komuniti-comments.js` | Display, send & delete comments (Firestore / demo) |
| `js/ai-logic.js` | Ask Jelajah AI → Gemini through Firebase AI Logic (ES modules, Step 5) |
| `firestore.rules` | Firestore security rules (paste into the Console — Step 4) |
| `destinations-korea.json` | Backup copy of the 68-place database |

## Data that is stored

- **Firebase mode:** collections in Firestore
  - `comments` → `{ uid, name, photo, text, replyTo, replyName, createdAt }` — real-time updates (no reload). `replyTo`/`replyName` are empty (`''`) for ordinary comments; filled with the original ID & name when replying.
  - `likes` → `{ commentId, uid, createdAt }` — one document per like; the document ID must be `<commentId>_<uid>` so a member can like only once (and can undo it).
  - `users` → public profile of each account: `{ uid, name, photo, about, username, createdAt }` — created automatically during sign up/sign in; the **Username** field on the Sign up form is **required** (3–20 characters: lowercase letters, numbers, `_`, `.`) and is saved here as `username`. For Google sign-in a handle is derived from the email and can be changed in Settings. `about` and the profile photo (uploaded file, stored as a `data:image/...` string, or an image link) can be edited later by the owner through the **⚙ Settings** button on the profile page (the `settings.html` page). Email is not stored here (privacy — this document is publicly readable).
  - `follows` → `{ follower, following }` — document ID `follower_following`; used for the Follower/Following counts.
  - `friendRequests` → `{ from, to, status }` — ID `sender_receiver`; status `pending` / `accepted`.
  - `friends` → `{ participants: [uidA, uidB] sorted a-z, reqId }` — proof of friendship; ID = `uidA_uidB`.
  - `chats/<pairId>/messages` → `{ from, to, text, createdAt }` — private chat, only between the two friends.
- **Demo Mode:** browser `localStorage` (`km-demo-user`, `km-demo-comments`).

## Common questions

| Problem | Cause / solution |
|---|---|
| `auth/unauthorized-domain` | Open through `http://localhost:8000`, or add your domain in Authentication → Settings → Authorized domains |
| `permission-denied` when submitting | The Firestore rules have not been published yet (Step 4) |
| Comments do not appear | Check that you are using the correct project in `js/firebase-config.js`; open the Console (F12) for errors |
| `auth/operation-not-allowed` | Enable the Email/Password or Google method in Authentication |
| Forgot password | Click "Forgot password?" — a reset link is sent to your email |
