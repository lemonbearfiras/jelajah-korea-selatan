# Jelajah Korea Selatan 🇰🇷

An interactive English-language website for planning a trip to South Korea — a destination directory, a budget planner, live data (weather & exchange rates), and a traveller community.

**Live demo:**
- GitHub Pages — https://lemonbearfiras.github.io/jelajah-korea-selatan/
- Qoder Sites (private) — https://jelajah-korea-qodzbckpyph.qoder.website

---

## Key features

| Section | Function |
|---|---|
| 🌤️ **Destinations** | 6 region cards with **live** weather for each city (Open-Meteo): temperature, feels-like temperature, min–max, humidity, wind, chance of rain |
| 🗺️ **Korea Map** | Interactive SVG map with the real KTX rail routes + city pins |
| 💰 **Budget Planner** | **Live ECB** exchange rates (1 day–1 year chart, each point = 1 day, hover crosshair), RM↔₩ converter, budget estimates by rate/season/theme + Generate a daily itinerary; Korean economy info cards |
| 📚 **Database** | 68 places (Seoul, Busan, Jeju, Gyeongju, Jeolla, Gangwon, etc.) with search + details modal |
| 🤖 **Ask Jelajah AI** | Free-text questions → live Gemini answers (Firebase AI Logic in the browser, then the Qoder Sites Function), with a local matching engine as a fallback when offline |
| 👥 **Community** | Sign up/sign in (email + Google) through Firebase, public comments, profile pages, following & friends, and real-time chat |

## Tech stack

- **Frontend:** plain HTML + CSS + JavaScript — no build step, no framework. All the main styles and scripts live in `index.html`; external scripts are in `js/`.
- **Community backend:** Firebase (Auth + Firestore, compat SDK via CDN).
- **Live data:** [Open-Meteo](https://open-meteo.com) (weather), [Frankfurter](https://api.frankfurter.dev) (ECB MYR→KRW rates).
- **AI:** two routes to Gemini — Firebase AI Logic called from the browser (`js/ai-logic.js`, authorised by the Firebase project identity, no key in the page) and the Deno edge Function (`functions/index.ts`, keys held as application Secrets) with an OpenAI-compatible gateway (MiniMax/DeepSeek) and Qoder Cloud Agents as automatic backups. No secret is ever shipped to the browser or committed to this repository.
- **Hosting:** GitHub Pages (static) + Qoder Sites (static + Function).

## Folder structure

```
├── index.html            # Home page (all main CSS/JS + the destination database)
├── profile.html          # Public member profile page
├── settings.html         # Profile settings for the signed-in member
├── chat.html             # Real-time chat between friends
├── js/
│   ├── live.js           # Live weather + ECB rate chart + hover/tooltip
│   ├── firebase-config.js# Firebase project config (fill it in yourself — see README-FIREBASE.md)
│   ├── komuniti-auth.js  # Sign up/sign in/Google (Firebase Auth, offline demo mode)
│   ├── komuniti-comments.js # Firestore comments
│   ├── profile.js        # Profile, following/friends
│   ├── settings.js       # Settings form + photo upload/resize
│   └── chat.js           # Real-time chat
├── functions/
│   ├── index.ts          # AI endpoint: /functions/v1/app?action=ask|health
│   └── cloud-agents.mjs  # Qoder Cloud Agents client
├── firestore.rules       # Firestore security rules
├── dist/                 # Copy ready to publish (Qoder Sites)
└── README-FIREBASE.md    # Full Firebase setup guide
```

## Running locally

1. Clone or download this folder.
2. Serve the folder with a static server, for example:
   ```bash
   npx serve .          # or
   python -m http.server 8000
   ```
3. Open `http://localhost:8000`. Weather & rates work straight away (cloud APIs, no key).
4. Community: if `js/firebase-config.js` has not been filled in yet, the site automatically uses **Demo Mode** (localStorage). For real Firebase, follow [README-FIREBASE.md](README-FIREBASE.md). `localhost` is authorised by Firebase by default; for a hosted domain add it under *Authentication → Settings → Authorized domains*.
5. "Ask Jelajah AI" tries three tiers: Firebase AI Logic (Gemini) straight from the browser → the Qoder Sites Function → the local matching engine. Only the first tier is available on GitHub Pages and localhost, so the answer you see depends on where the page is hosted.

## Publishing

- **GitHub Pages:** push to `main` — Pages publishes from the repository root.
- **Qoder Sites:** `dist/` + `functions/` are prepared and published through Qoder (edge Function runtime).

## AI (three tiers)

**Tier 1 — Firebase AI Logic (Gemini) from the browser** (`js/ai-logic.js`, ES modules from the Firebase CDN v12.9.0, a separate Firebase app named `jelajah-ai`; `js/firestore.js` can attach App Check to that same app but is deliberately left unconfigured — see [README-FIREBASE.md](README-FIREBASE.md) Step 5, because AI Logic rejects Google Cloud Fraud Defense tokens). This is the only tier that works on GitHub Pages, so it is what real visitors use. It needs no API key in this repository: the project's own Firebase identity authorises the call. Models are tried in order — `gemini-3.8-flash`, then the `gemini-flash-latest` alias — because Google retires model names periodically (`gemini-2.5-flash` is already closed to new projects). The free tier caps this at roughly 20 requests/day per model and a single answer can take ~30 s, so `dbReply()` runs tier 1 and (after 8 s of silence) tier 2 **in parallel** and shows whichever replies first; when both fail it falls through to tier 3 instead of erroring.

**Tier 2 — the Qoder Sites Function** (`functions/index.ts`), which tries its providers in this order and moves to the next one on any failure. Keys are application Secrets read only inside the Function — they never reach the browser or this repository:

1. **Gemini** — Secret `GEMINI_API_KEY` (`https://generativelanguage.googleapis.com/v1beta`, model discovered from `/v1beta/models`, `gemini-3.8-flash` preferred).
2. **Gateway** — Secret `A2AGENT_API_KEY` (`https://api.a2agent.me/v1`, model discovered from `/v1/models`, MiniMax preferred).
3. **Qoder Cloud Agents** — the platform-managed `QODER_PAT`, no key for you to supply.

**Tier 3 — the local matching engine** in `index.html`: scores the question against the 68-place database. Fully offline, always the fallback.

To add or replace a tier-2 key:

1. Create the key at its source (Gemini: [AI Studio → Get API key](https://aistudio.google.com/apikey)).
2. Open the Qoder Sites portal for this site → **Settings** → **Secrets**.
3. Add the Secret with the exact name above, paste the value, save, and wait until it shows as synchronised.
4. Publish the site again so the running Function sees it.

Keep key values private: pasting one into a chat, the code, or this repository exposes it to everyone, and anyone who finds it can spend your quota.

## Data & credits

- Weather: Open-Meteo (no API key required).
- Exchange rates: the latest live rates from [exchangerate.fun](https://api.exchangerate.fun/latest); daily series via the European Central Bank (Frankfurter API).
- Economic facts: Bank of Korea, KDI, OECD (as of October 2026).
- Images: Wikimedia Commons (1280/1920px thumbnails).
- Designed and built as a student assessment project.

## License

Licensed under [LICENSE](LICENSE).
