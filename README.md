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
scripts/           dev server + preflight checker (never deployed)
```

## Run locally

```
node scripts/dev-server.mjs        # http://localhost:5173, applies _headers like production
node scripts/preflight.mjs         # safety checks; add --launch to also fail on unfilled placeholders
```

## Hosting: use Cloudflare Pages (not GitHub Pages)

Security headers (CSP, HSTS, etc.) can only be set with `_headers`, which Cloudflare Pages supports and GitHub Pages does not.
Create a Pages project, build command empty, **build output directory `public`**. Point taghunterhq.com at it, then cancel Shopify.

## Before launch (placeholders to fill)

1. **Checkout URL.** Three buttons in `public/index.html` use `https://YOUR-STORE.lemonsqueezy.com/checkout/buy/YOUR-PRODUCT-UUID`.
   Replace all three with your real Lemon Squeezy checkout link (Share > Checkout Overlay). Keep `class="lemonsqueezy-button"`.
2. **Support email.** `support@taghunterhq.com` is an assumed address (pages, `security.txt`). Change it or create it.
3. **Email capture.** The Spotter Card form has `data-endpoint=""`, so it shows "not switched on yet".
   Pick a provider, set `data-endpoint` to its https form/API URL, and add that origin to `connect-src` in `_headers`.
   Never put a secret API key in this site: anything in `public/` is readable by everyone. Use the provider's public form endpoint.
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
| Email form | Client validation, honeypot, too-fast-submit trap, 10s timeout, `credentials: omit`, output via `textContent` only. |
| `preflight.mjs` | Blocks deploys that add inline scripts/handlers/styles, unknown script hosts, broken links, missing headers, or a PDF in the web root. |
| `security.txt`, robots, sitemap | Disclosure contact; thank-you kept out of search. |

Known trade-offs:
- `lemon.js` writes inline styles, so the CSP allows `unsafe-inline` for **style attributes/elements only** (never scripts). This is the narrowest setting that works.
- `lemon.js` is third-party and has no SRI hash (Lemon Squeezy updates it in place). It is the one external script; that's the accepted risk.
- HSTS has no `preload`. Add it only once every subdomain of taghunterhq.com is HTTPS-only.
- Bot protection on the form is basic. If spam appears, add Cloudflare Turnstile (needs CSP additions) or use the provider's built-in protection.
- Analytics: none yet. Cloudflare Web Analytics is cookieless; enabling it needs `https://static.cloudflareinsights.com` in `script-src` and `https://cloudflareinsights.com` in `connect-src`.

## Still to test with real values
- Full checkout on a real phone inside the YouTube app (Apple Pay in an in-app browser), and that the CSP does not block anything once your real checkout URL is in.
- Sales-tax display at checkout ("plus tax where applicable" is on the page).
