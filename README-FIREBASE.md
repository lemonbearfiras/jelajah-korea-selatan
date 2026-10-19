# Firebase Guide — Community Space (Sign In + Comments + Profile + Friends + Chat)

The Community Space on this site is connected to **Firebase** (Authentication + Cloud Firestore).
Before the configuration is filled in, the site runs in **Demo Mode** — every feature can be tried,
but accounts & comments are stored only in your browser.

---

## Step 1 — Create a Firebase project (2 minutes)

1. Open <https://console.firebase.google.com> and log in with a Google account.
2. Click **Create a project / Add project**.
3. Project name: e.g. `jelajah-korea` → continue (Google Analytics can be turned off).

## Step 2 — Copy the configuration into `js/community/firebase-config.js`

1. On the project's main page, click the **Web** icon `</>` (Add app → Web).
2. Type a nickname, e.g. `jelajah-korea-web` → **Register app**.
3. Firebase shows a `const firebaseConfig = {...}` block — **copy every value**.
4. Open the **`js/community/firebase-config.js`** file and replace every placeholder value (they all start with `MASUKKAN_`) with the value Firebase shows you:

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

> ⚠️ Publish this file again after every change — the Console keeps using the last version you
> pasted, not the copy in this folder.
>
> This revision of the rules **locks down ownership**: comments can no longer be edited at all
> (only deleted by their author, because an owner-only update rule would still let a member
> rewrite `uid` and hand their comment to someone else), follows and friend requests must use
> their canonical document ID (so one account cannot write many copies of the same pair and
> inflate public counts), a request can only be addressed to an account that really exists, and
> `friends`/`chats` are unchanged. It also means **every member you follow or befriend must
> already have a profile document** in `users`; the site creates one at sign-up and rebuilds it
> automatically if that write ever failed.
>
> Collections covered: `comments`, `likes`, `users`, `follows`, `friendRequests`,
> `friends`, `chats`, the required `username` field (3–20 characters, `^[a-z0-9._]{3,20}$`) and the editable
> `about` field (≤ 500 characters) in `users`. Without publishing them, the profile page still
> loads (name, comments, date)
> but the Followers / Following / Friends counts show "—" and the Follow / Add Friend / Chat
> buttons fail.

What the rules mean in short:

- `comments` — anyone can read; only signed-in members can write; **no editing**, you can delete only your own.
- `users` — public profile (name, photo, `about` ≤ 500 characters, required `username` of 3–20 characters matching `^[a-z0-9._]{3,20}$`, `createdAt`); only the owner can edit/delete. Email is not stored here. Members without a username yet must set one in **settings.html** before any other change can be saved. Can be updated through the **settings.html** page (the ⚙ Settings button on your own profile). The photo is either an image link or an **uploaded photo** stored as a `data:image/...` text (up to 120,000 characters) — the rules must allow that length or saving a new photo is rejected.
- `follows` — one document per follow, **ID exactly `follower_following`**; anyone can read the counts; only the follower can create or delete their own follow; the account being followed must exist in `users`.
- `friendRequests` — **ID exactly `sender_receiver`**, recipient must exist in `users`; only the two people involved can read; only the recipient can accept (pending → accepted), and only once.
- `friends` — `ID = the two uids sorted a-z`; anyone can read (proof of friendship); created only by the recipient after the request is accepted.
- `chats` — messages in `chats/<pairId>/messages`; only the two friends involved can read or send; text 1–1000 characters; you can delete only your own messages.

> 🔒 **Privacy decision, recorded:** `follows` and `friends` stay publicly readable on purpose —
> the profile page counts followers / following / friends by querying those collections, and
> Firestore can only count documents the caller is allowed to read. The documents contain
> nothing but a pair of opaque Firebase UIDs (no name, no email). Making them private means
> moving the three numbers onto `users/{uid}` as counters and then restricting the reads; the
> counters would then be written by the browser, so any member could inflate their own numbers.
> Friend requests, chat messages and the email address are not public in any of these designs.

## Step 5 — Enable the AI answers (Firebase AI Logic)

"Ask Jelajah AI" calls Gemini through **Firebase AI Logic** straight from the browser (`js/community/ai-logic.js`), so it works on GitHub Pages too — no API key is ever put in the code. It uses the same project as Step 2.

1. Open [the Firebase console](https://console.firebase.google.com) and pick **jelajah-korea**.
2. In the left menu, under **Build**, click **Gemini AI** (it may be labelled *AI Logic* / *Vertex AI in Firebase*), then click **Get started** / **Enable**.
3. Choose the **Gemini Developer API** free tier when it asks which backend to use. Confirmation appears after a minute or two; the site then answers for visitors immediately — nothing to publish again.
4. **App Check — leave it NOT enforced for this project.** This is the part that cost the most debugging, so here is the verified state (2026-10-15):
   - Google retired **reCAPTCHA Classic (v3)**, so the Firebase console only offers **Google Cloud Fraud Defense**, which is reCAPTCHA **Enterprise**. Console → **App Check → Apps**: App ID `1:950161795507:web:97df07773ed36a387043c6` shows provider **Fraud Defense**.
   - With that provider, the token exchange itself **succeeds** (`…:exchangeReCaptchaEnterpriseToken` → 200, `provider:"recaptcha_enterprise"`), but **Firebase AI Logic rejects any request carrying that token**: `generateContent` → `[401] Firebase App Check token is invalid` — for regular *and* limited-use tokens, and even after enforcement is switched off. A request that carries **no** token is accepted.
   - So: **Console → App Check → Enforcement → Not enforced**, and keep **`APP_CHECK_SITE_KEY = ''`** in `js/community/firestore.js`. That is the working configuration; the file's header comment explains why, and `ReCaptchaEnterpriseProvider` is already wired for the day Google accepts Fraud Defense tokens on AI Logic (then just paste the public site key back in).
   - If enforcement is switched back **on**, AI Logic answers 401 and the ask box silently drops to tier 2 (the Qoder Function) or the offline engine — on GitHub Pages that means **no real AI**, because Pages has no server Function.
   - ⚠️ Never put a **secret/API key** in this chat or in git. The reCAPTCHA site key is public by design; it is the only value this site ever needs.
5. **Free-tier limits and latency.** Google's free tier for this project allows about **20 Gemini requests per day per model**, plus a per-minute cap, and the counter resets after roughly 12 hours of usage. `gemini-2.5-flash` (the name in older guides) is no longer open to new projects, so `js/community/ai-logic.js` asks for `gemini-3.8-flash` and falls back to the `gemini-flash-latest` alias. A free-tier answer can take **~30 seconds**, so `dbReply()` does not cancel tier 1: after 8 s of silence it *also* asks tier 2 (the Qoder Sites Function on your MiniMax gateway credit) and shows whichever replies first, giving up at 40 s in favour of the offline matching engine. On GitHub Pages tier 2 fails instantly (there is no Function there), which is exactly why tier 1 is allowed to run long. If you want more quota for demo day, enable billing on the project — Google then charges per request instead of blocking at 20/day.

6. **This free tier has an expiry date: 2 November 2026.** Google announced that from that day *App Check enforcement is required to use Firebase AI Logic and cannot be un-enforced* — every request without a valid App Check token is blocked. Since this project's only registrable provider (Fraud Defense) produces a token AI Logic refuses (item 4), tier 1 will stop answering on **GitHub Pages** at that point; localhost and the Qoder site keep working through the server Function. There is nothing to fix in the Firebase console — the way to keep real AI on Pages is to stop calling Firebase for the answer, and that route (**Step 5b**, the tier-0 proxy) is already deployed and switched on, so nothing breaks on 2 November.

## Step 5b — Keep real AI on GitHub Pages after 2 November (the AI proxy)

`worker/ai-proxy.js` is a small **Cloudflare Worker**: an HTTPS endpoint that holds the API key server-side and answers `POST /ask {q, ctx}` with `{ok:true, answer}` — `q` is the question, `ctx` is the block of matching places from the site's own database (see *Answer grounding* below). It calls the Gemini Developer API first and, if that Secret is absent or fails, the same MiniMax gateway the Qoder Function uses. **No Firebase is involved, therefore no App Check requirement and no 2 November expiry.** Cloudflare's free plan covers this site easily, and the key-based free quota is far larger than the 20/day that Firebase's AI Logic tier gives; check [ai.google.dev/gemini-api/docs/rate-limits](https://ai.google.dev/gemini-api/docs/rate-limits) for the current numbers.

**This is now deployed and switched on** — the Worker runs at `https://jelajah-korea-ai.firas12346haaha-e0d.workers.dev` and `DB_PROXY_URL` in `js/main.js` points at it, so it is the *first* tier the ask box tries. If you ever move it, edit that one line (no trailing slash) and publish.

✅ **Grounded answers are live on GitHub Pages.** The Worker was re-pasted on 17 October and now reads the `ctx` field, appending the matching database entries to the prompt before calling the model. Verified with one real ask — *"How much does Everland cost to enter, and is booking online cheaper?"* — `POST /ask` returned 200 from the first tier with `₩59,000` gate / `±₩39,000` online plus the Q-Pass tip, all values taken from `KOREA_DB`, and the footnote read "answered from 6 matching entries in the 126-place database". If you later edit `worker/ai-proxy.js` it needs another paste + **Deploy and restart**; the URL and Secrets stay untouched.

How it behaves, because it matters when an answer looks slow:

- It never hardcodes a model name — it reads the provider's own model list, so a renamed model does not break it.
- Free-tier quota is counted **per model**, so one `429` does not mean the key is spent: the Worker moves on to the next candidate model, and then to the gateway Secret if you added one. A `401`/`403` (wrong key) stops immediately instead of retrying.
- Each attempt is capped at 14 s and the whole request at 28 s, so a hung model cannot block the fallbacks. If every provider fails you get `{ok:false, error:"gemini_429 …"}` and the page falls through to the offline engine.
- **Answer grounding (`ctx`)**: before asking, `index.html` scores your question against the 126-place database — region, category, free/cheap, season, and a strong bonus when a word matches a place *name* — and sends the best few entries (max 6, ~2 600 characters) as `name (city, entry ₩…, closed …, best season): description. Tip: …`. Every tier (proxy, Firebase, the Sites Function) receives the same block with the instruction to use it for names, fees, seasons and tips instead of guessing. That is why an answer can say "₩3,000, closed Tuesdays, free in hanbok" — those come from this site's data, not the model's memory. A question with no database match (for example "what is the weather today") sends an empty `ctx`, the prompt is exactly as it used to be, and the footnote under the answer tells you which case you are looking at.

Deploying it (or re-deploying after a code change) takes about two minutes:

1. [one.dash.cloudflare.com](https://one.dash.cloudflare.com) → **Workers & Pages** → click **`jelajah-ai-…`** → **Edit Code** (or *Code* tab).
2. Select everything in the editor, delete it, paste the whole current contents of `worker/ai-proxy.js`, then **Deploy and restart**. A code-only change keeps the same URL, so nothing else needs updating.
3. **Secrets** (first time only): that Worker page → **Settings** → **Variables and Secrets** → *Secrets* → **Add** → Name `GEMINI_API_KEY`, Value = a key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → **Save and deploy**. **Never paste a key into this chat, into git, or into any site file.** Adding `A2AGENT_API_KEY` as a second Secret gives you the MiniMax models as backup.

The Worker refuses any request whose `Origin` is not the site's own addresses (they are listed in its `ALLOW` set), so a stranger's web page cannot spend your quota from a browser. **That check alone is not enough, and the code does not rely on it**: a browser `Origin` header is easy to forge from a script, and the same is true of CORS. Both AI endpoints therefore carry their own request budget —

- `worker/ai-proxy.js`: **6 asks a minute and 120 a day per client IP**, counted in Cloudflare's edge cache under a SHA-256 hash of `cf-connecting-ip` (the IP itself is never stored). Over budget → `429 {ok:false, error:"rate_limited"}` with a `Retry-After: 60` header.
- `functions/index.ts`: the same shape, **6/min + 120/day**, kept in a small per-instance table keyed on the client address from `X-Forwarded-For`. A fresh instance starts a clean window and no client address is exposed by the browser call, so the caps are a ceiling on runaway scripts rather than an exact ledger; when the platform gives no address at all the budget becomes site-wide (40/min, 1000/day) so real visitors are never locked out.

The ask box treats a rate-limited tier as any other failure and tries the next one, so a single visitor spamming the box cannot exhaust all three tiers at once — and the keys stay server-side in both cases.

⚠️ If the key ever leaks into a public file or chat, delete it in AI Studio and make a new one — a leaked key lets anyone spend your quota, and Google can suspend the key.

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
| `js/pages/profile.js` | Profile logic — Follow button, Add Friend / Accept / Chat, statistics & editing About |
| `chat.html` | **Private chat** page between two friends — `chat?v=<friend uid>` |
| `js/pages/chat.js` | Real-time chat logic (onSnapshot) — send & display messages |
| `settings.html` | **Profile settings** page for the signed-in owner — name, photo, username, about |
| `js/pages/settings.js` | Settings logic — form validation, photo upload/resize, saving to `users` |
| `js/community/firebase-config.js` | **You fill in** the project configuration here |
| `js/community/community-auth.js` | Sign up / sign in / Google / log out (two modes) |
| `js/community/community-comments.js` | Display, send & delete comments (Firestore / demo) |
| `js/community/ai-logic.js` | Ask Jelajah AI → Gemini through Firebase AI Logic (ES modules, Step 5) |
| `js/community/firestore.js` | App Check bootstrap for the same Firebase app (reCAPTCHA Enterprise or debug token; **intentionally inert** — `APP_CHECK_SITE_KEY` stays empty, see Step 5) |
| `firestore.rules` | Firestore security rules (paste into the Console — Step 4) |
| `data/destinations-korea.json` | Backup copy of the 126-place database |

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
| Comments do not appear | Check that you are using the correct project in `js/community/firebase-config.js`; open the Console (F12) for errors |
| `auth/operation-not-allowed` | Enable the Email/Password or Google method in Authentication |
| Forgot password | Click "Forgot password?" — a reset link is sent to your email |
