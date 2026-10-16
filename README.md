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
| 📚 **Database** | 126 places (deep Seoul + Busan coverage, then Jeju, Gyeongju, Jeolla, Gangwon, etc.) with search + details modal |
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
│   ├── ai-logic.js       # Tier 1: Gemini through Firebase AI Logic, in the browser
│   ├── firestore.js      # App Check bootstrap (inert by design — see README-FIREBASE.md Step 5)
│   └── chat.js           # Real-time chat
├── functions/
│   ├── index.ts          # AI endpoint: /functions/v1/app?action=ask|health
│   └── cloud-agents.mjs  # Qoder Cloud Agents client
├── worker/
│   └── ai-proxy.js       # Tier 0: CORS proxy for GitHub Pages (deployed Cloudflare Worker)
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
5. "Ask Jelajah AI" tries up to four tiers: an optional CORS proxy → Firebase AI Logic (Gemini) straight from the browser → the Qoder Sites Function → the local matching engine. Which tiers are live depends on where the page is hosted and on `DB_PROXY_URL` — see **AI** below.

## Publishing

- **GitHub Pages:** push to `main` — Pages publishes from the repository root.
- **Qoder Sites:** `dist/` + `functions/` are prepared and published through Qoder (edge Function runtime).

## AI (up to four tiers)

**Tier 0 — the AI proxy** (`worker/ai-proxy.js`, **live** at `https://jelajah-korea-ai.firas12346haaha-e0d.workers.dev`, wired through `DB_PROXY_URL` in `index.html`): a Cloudflare Worker that holds an API key as a server-side Secret and answers `POST /ask {q}` → `{ok:true,answer}` with CORS limited to this site's own origins. It calls the Gemini Developer API (`GEMINI_API_KEY`) or, as backup, the same MiniMax gateway as tier 2 (`A2AGENT_API_KEY`), discovering the model list instead of hardcoding a name — and because free-tier quota is counted per model, a `429` makes it move to the next candidate rather than giving up. Because it is not a Firebase endpoint it is **not** affected by Google's rule that App Check becomes mandatory (and un-un-enforceable) for Firebase AI Logic on **2 November 2026** — which is what keeps a real AI answer available on GitHub Pages after that date. Deploy/re-deploy steps: [README-FIREBASE.md](README-FIREBASE.md) Step 5b.

**Tier 1 — Firebase AI Logic (Gemini) from the browser** (`js/ai-logic.js`, ES modules from the Firebase CDN v12.9.0, a separate Firebase app named `jelajah-ai`; `js/firestore.js` can attach App Check to that same app but is deliberately left unconfigured — see [README-FIREBASE.md](README-FIREBASE.md) Step 5, because AI Logic rejects Google Cloud Fraud Defense tokens). It needs no API key in this repository: the project's own Firebase identity authorises the call. Models are tried in order — `gemini-3.8-flash`, then the `gemini-flash-latest` alias — because Google retires model names periodically (`gemini-2.5-flash` is already closed to new projects). The free tier caps this at roughly 20 requests/day per model and a single answer can take ~30 s, so `dbReply()` never cancels a tier it has started: the first tier that replies wins, a tier that fails immediately hands over to the next one, and after 8 s of silence the next tier is started in parallel. If every live tier fails, it falls through to tier 3 instead of erroring.

**Tier 2 — the Qoder Sites Function** (`functions/index.ts`), which tries its providers in this order and moves to the next one on any failure. Keys are application Secrets read only inside the Function — they never reach the browser or this repository. This tier exists only on the Qoder host: GitHub Pages has no server, so the same-origin call there fails instantly.

1. **Gemini** — Secret `GEMINI_API_KEY` (`https://generativelanguage.googleapis.com/v1beta`, model discovered from `/v1beta/models`, `gemini-3.8-flash` preferred).
2. **Gateway** — Secret `A2AGENT_API_KEY` (`https://api.a2agent.me/v1`, model discovered from `/v1/models`, MiniMax preferred).
3. **Qoder Cloud Agents** — the platform-managed `QODER_PAT`, no key for you to supply.

**Tier 3 — the local matching engine** in `index.html`: scores the question against the 126-place database. Fully offline, always the fallback.

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
