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
  projectId:         "jelajah-korea",
  storageBucket:     "jelajah-korea.appspot.com",
  messagingSenderId: "123456789012",
  appId:             "1:123456789012:web:abc123"
};
```

5. Save the file. As soon as the values are filled in, the site switches from Demo Mode to Firebase automatically.

## Step 3 — Enable Authentication

1. Left menu: **Build → Authentication → Get started**.
2. **Sign-in method** tab → enable:
   - **Email/Password** → Enable → Save
   - **Google** → Enable → enter the project support email → Save

> **Google sign-in note:** Google is only allowed from registered domains.
> `file://` (opening index.html directly) is **not** allowed — use `localhost`
> (Step 5). Email/password work both through `file://` and through localhost.

## Step 4 — Create the Firestore database + rules

1. Left menu: **Build → Firestore Database → Create database**.
2. Choose a location (e.g. `asia-southeast1` — Singapore) → **Production** mode → Create.
3. **Rules** tab → **delete all** the old text → open the **`firestore.rules`** file in
   this project folder → **Ctrl+A then Ctrl+C** (copy ALL of its contents) →
   paste it in the Rules tab → click **Publish**.

> ⚠️ This version of the rules adds new collections: `follows`, `friendRequests`,
> `friends`, `chats`, plus the optional `username` field (≤ 20 characters) and the editable
> `about` field (≤ 500 characters) in `users`. Without publishing them, the profile page still
> loads (name, comments, date)
> but the Followers / Following / Friends counts show "—" and the Follow / Add Friend / Chat
> buttons fail.

What the rules mean in short:

- `comments` — anyone can read; only signed-in members can write; you can delete only your own.
- `users` — public profile (name, photo, `about` ≤ 500 characters, `username` ≤ 20 characters, `createdAt`); only the owner can edit/delete. Email is not stored here. Can be updated through the **settings.html** page (the ⚙ Settings button on your own profile). The photo is either an image link or an **uploaded photo** stored as a `data:image/...` text (up to 120,000 characters) — the rules must allow that length or saving a new photo is rejected.
- `follows` — one document per follow, `ID = follower_following`; anyone can read the counts; only the follower can create or delete their own follow.
- `friendRequests` — `ID = sender_receiver`; only the two people involved can read; only the recipient can accept (pending → accepted).
- `friends` — `ID = the two uids sorted a-z`; anyone can read (proof of friendship); created only by the recipient after the request is accepted.
- `chats` — messages in `chats/<pairId>/messages`; only the two friends involved can read or send; text 1–1000 characters; you can delete only your own messages.

## Step 5 — Open the site through localhost (recommended)

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
| `firestore.rules` | Firestore security rules (paste into the Console — Step 4) |
| `destinations-korea.json` | Backup copy of the 68-place database |

## Data that is stored

- **Firebase mode:** collections in Firestore
  - `comments` → `{ uid, name, photo, text, replyTo, replyName, createdAt }` — real-time updates (no reload). `replyTo`/`replyName` are empty (`''`) for ordinary comments; filled with the original ID & name when replying.
  - `likes` → `{ commentId, uid, createdAt }` — one document per like; the document ID must be `<commentId>_<uid>` so a member can like only once (and can undo it).
  - `users` → public profile of each account: `{ uid, name, photo, about, username, createdAt }` — created automatically during sign up/sign in; the **Username** field on the Sign up form is optional (max 20 characters: lowercase letters, numbers, `_`, `.`) and is saved here as `username`. `about`, `username` and the profile photo (uploaded file, stored as a `data:image/...` string, or an image link) can be edited later by the owner through the **⚙ Settings** button on the profile page (the `settings.html` page). Email is not stored here (privacy — this document is publicly readable).
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
