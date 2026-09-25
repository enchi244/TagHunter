# Tag Hunter site

One-page sales site + thank-you page + legal pages. Plain HTML/CSS/JS, no build step, no dependencies.
Mobile first (390px), with a tablet step at 720px and a full desktop layout at 960px+ (all in `assets/css/main.css`; the mobile styles are never overridden by JS or separate files).

```
public/            <- the ONLY folder that gets deployed (Cloudflare "build output directory")
  index.html         sales page
  thank-you/         where the Lemon Squeezy confirmation button sends buyers (noindex)
  refunds/ privacy/ terms/ contact/   footer pages
  _headers           security headers + caching (Cloudflare Pages reads this)
  assets/            css, js, self-hosted fonts, images (logo, book cover, page previews)
worker/            Cloudflare Worker code: index.js routes /api/*, subscribe.js is the Spotter Card signup. Deployed with the site
wrangler.jsonc     Worker config: serves public/ as static assets, runs the Worker only for /api/*
emails/            reference copy of the Spotter Card emails + Brevo setup notes (never deployed)
scripts/           dev server, preflight checker, subscribe tests (never deployed)
```

## Run locally

```
node scripts/dev-server.mjs        # http://localhost:5173, applies _headers like production
node scripts/preflight.mjs         # safety checks; add --launch to also fail on unfilled placeholders
```

## Hosting: Cloudflare (not GitHub Pages)

Security headers (CSP, HSTS, etc.) can only be set with `_headers`, which Cloudflare Pages supports and GitHub Pages does not.
The live project is a Cloudflare **Worker with static assets** ("Workers Builds", deploys on push to `main`), configured by `wrangler.jsonc`. Pages Functions (`functions/`) do not run there. Point taghunterhq.com at it, then cancel Shopify.

## Before launch (placeholders to fill)

1. **Checkout URL.** Three buttons in `public/index.html` use `https://YOUR-STORE.lemonsqueezy.com/checkout/buy/YOUR-PRODUCT-UUID`.
   Replace all three with your real Lemon Squeezy checkout link (Share > Checkout Overlay). Keep `class="lemonsqueezy-button"`.
2. **Support email.** `support@taghunterhq.com` is an assumed address (pages, `security.txt`). Change it or create it.
3. **Email capture (Brevo + Turnstile).** The Spotter Card form posts to our own `/api/subscribe`
   (`worker/subscribe.js`, called from `worker/index.js`; the site runs on a Cloudflare Worker with static assets). It checks a Cloudflare Turnstile token, then adds the
   address to a Brevo list; a Brevo automation on that list sends the card and the follow-up
   (copy in `emails/spotter-card-sequence.md`, which also has the Brevo setup checklist).
   To switch it on:
   - Cloudflare > Turnstile > add a widget for `taghunterhq.com`. Put the **site key** (public) in `data-sitekey` on the form in `public/index.html`
     (replacing `YOUR-TURNSTILE-SITE-KEY`).
   - Cloudflare > Workers & Pages > the `taghunter` Worker > Settings > Variables and Secrets, add as **Secrets**:
     `BREVO_API_KEY`, `BREVO_LIST_ID`, `TURNSTILE_SECRET`. **Set them with `npx wrangler secret put NAME`** (run `npx wrangler login` first, `npx wrangler logout` after). Secrets typed into the dashboard's Variables and Secrets box did not reach the running Worker for this project.
   Never put a secret in `public/` or in the repo: `preflight` fails on key-shaped strings in `public/`.
   Local testing: put the same three names in a git-ignored `.dev.vars` file (`NAME=value` per line); `dev-server.mjs` runs the handler. `npx wrangler dev` runs the real Worker locally.
   Cloudflare's Turnstile test keys (site `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`) always pass.
4. **Thank-you download button** links to `https://app.lemonsqueezy.com/my-orders` on purpose. Putting the PDF at a public URL would let anyone share it.
   `preflight` fails if a `.pdf` ends up in `public/`. Set the LS confirmation button to `https://taghunterhq.com/thank-you/`.
5. **Images** are the real ones now: book cover (`cover.webp`), pages 10/18/23 (`preview-pNN-600.webp` thumbnail + `-1080.webp` for tap-to-enlarge) and the Spotter Card (`spotter-card.webp`), all rendered from the PDFs.
   To refresh them after editing the book, re-export the pages as WebP with the same names and sizes. Keep the PDFs OUT of `public/`.
5b. **Logo + favicon** come from the supplied TagHunter logo (background removed, recoloured for dark/red surfaces).
   `lockup-ink.webp` (cream + orange, dark bars/footer), `lockup-cream.webp` (all cream, red hero), `mark-ink.webp` (icon only, phone sticky bar).
   Favicons: `favicon.ico`, `favicon-32.png`, `favicon-192.png`, `favicon-512.png`, `apple-touch-icon.png` (white plate so it shows on light and dark browser tabs).
   To swap the logo later, rebuild those files and keep the same names. The tagline "Find & Secure" is not used on the site.
6. **Legal pages** are sensible starting drafts, not legal advice. Have them reviewed, especially Terms and Privacy.
7. **Copy to verify against the book:** FAQ answers (Marshalls/HomeGoods, US only, TikTok, out of date)
   and the meta description. (Tag-checker notes now use the book's own wording from pages 4 and 7-9.)
8. Run `node scripts/preflight.mjs --launch`. It must print OK.

## Security built in

| Layer | What it does |
|---|---|
| Content-Security-Policy | Only own files + `assets.lemonsqueezy.com` script + Lemon Squeezy checkout iframe. No inline JS, no `eval`, no `object`, `base-uri 'none'`, `frame-ancestors 'none'`. Tested: injected inline script, eval, foreign iframe/image/fetch are all blocked. |
| HSTS, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy, COOP | Force HTTPS, stop MIME sniffing and clickjacking, limit referrer leakage, switch off unused browser features. |
| No third-party fonts/CDNs/trackers | Fonts are self-hosted; the only external script is Lemon Squeezy's. |
| Thank-you page | `noindex`, `no-store`, no-referrer. |
| Cache safety | CSS/JS use `no-cache` so a deploy never mixes new HTML with old styles. |
| Email form | Client validation, honeypot, too-fast-submit trap, Cloudflare Turnstile (loaded only when the form is used), 10s timeout, `credentials: omit`, output via `textContent` only. Server side (`/api/subscribe`): same-origin check, JSON-only, body size cap, email re-validated, Turnstile token verified, Brevo key kept in a Cloudflare secret, errors logged without the address. Tested by `node scripts/test-subscribe.mjs`. |
| `preflight.mjs` | Blocks deploys that add inline scripts/handlers/styles, unknown script hosts, broken links, missing headers, or a PDF in the web root. |
| `security.txt`, robots, sitemap | Disclosure contact; thank-you kept out of search. |

Known trade-offs:
- `lemon.js` writes inline styles, so the CSP allows `unsafe-inline` for **style attributes/elements only** (never scripts). This is the narrowest setting that works.
- `lemon.js` is third-party and has no SRI hash (Lemon Squeezy updates it in place). It is the one external script; that's the accepted risk.
- HSTS has no `preload`. Add it only once every subdomain of taghunterhq.com is HTTPS-only.
- Turnstile's script comes from `challenges.cloudflare.com` (allowed in `script-src` and `frame-src`); it has no SRI hash because Cloudflare updates it in place.
- `/api/subscribe` has no rate limit of its own. Turnstile covers bots; if abuse appears, add a Cloudflare rate-limiting rule for `/api/subscribe`.
- Worker responses (`/api/*`) do not get `_headers` (Cloudflare applies it only to static files), so the handler sets its own `Cache-Control` and `nosniff`.
- Analytics: none yet. Cloudflare Web Analytics is cookieless; enabling it needs `https://static.cloudflareinsights.com` in `script-src` and `https://cloudflareinsights.com` in `connect-src`.

## Still to test with real values
- Full checkout on a real phone inside the YouTube app (Apple Pay in an in-app browser), and that the CSP does not block anything once your real checkout URL is in.
- Sales-tax display at checkout ("plus tax where applicable" is on the page).
