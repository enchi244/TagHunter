# Tag Hunter: project status and next steps

Last updated: 25 September 2026
Site: https://taghunterhq.com (single-page sales site for the *TJ Maxx Clearance Hunter Handbook*, $24.95 PDF)
Repo: `enchi244/TagHunter` (GitHub). Deploys from `main` to Cloudflare as a **Worker with static assets** named `taghunter` (Workers Builds, not Pages). `wrangler.jsonc` serves `public/` and runs `worker/` code only for `/api/*`.

Legend: ✅ done and verified in this project · 🟡 done by you, not verified by me · ⏳ open

---

## 1. Where we are

The site is built, deployed on the real domain, and takes payment through Lemon Squeezy. The free **Spotter Card email signup** is built but not switched on yet (section 6).

### What was built ✅
| Area | State |
|---|---|
| Sales page | All sections from wireframe v3: hero, cost of guessing, live tag checker, what's inside, page previews (pp. 10, 18, 23), trust, who it's for, FAQ, final CTA, Spotter Card signup, footer |
| Layouts | Mobile first (390px), tablet step (720px+), full desktop layout (960px+). No horizontal overflow from 320px to 1920px |
| Other pages | Thank-you (noindex), Refunds, Privacy, Terms, Contact, 404 |
| Brand | Real logo (recoloured lockups for dark and red surfaces), favicon set, Open Graph share image with the real book cover |
| Real assets | Book cover PNG, pages 10/18/23 rendered from the handbook PDF, Spotter Card preview (cropped and faded so the bottom half is never sent to the browser) |
| Performance | Self-hosted fonts, WebP images, no carousel, no third-party scripts except Lemon Squeezy |

### Decisions taken
- **Yellow is reserved for buy buttons** (plus the "Yellow says now" line in the tag rule panel).
- **No fake urgency, no fake strike-through price, no invented testimonials or reviews.**
- **Checkout is split by screen:** phones and tablets (under 960px) use the Lemon Squeezy overlay; desktop opens the hosted checkout page. Each button carries both links (`href` = overlay link, `data-desktop-href` = plain link).
- **Delivery is by the Lemon Squeezy receipt email.** The thank-you page tells buyers to check their email and has a "Haven't got it yet?" box. The PDF is never at a public URL. No direct download button.
- **The handbook PDF and Spotter Card PDF are never committed** (`*.pdf` is in `.gitignore`, and `preflight` fails if a PDF is in `public/`).

---

## 2. Security ✅

Defined in `public/_headers` (Cloudflare applies it) and enforced by `scripts/preflight.mjs`.

- **Content-Security-Policy:** only own files, Lemon Squeezy's script (`assets.lemonsqueezy.com`) and its checkout iframe. No inline scripts, no `eval`. Tested: injected script, eval, foreign iframe/image/fetch are all blocked.
- HSTS, `nosniff`, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy, COOP (`same-origin-allow-popups` so PayPal/3-D Secure pop-ups work).
- Thank-you page: `noindex`, `no-store`, no-referrer.
- CSS/JS use `no-cache` so a deploy never mixes new HTML with old styles.
- Known trade-offs: `lemon.js` needs `unsafe-inline` for styles only (never scripts); it has no SRI hash (Lemon Squeezy updates it in place); HSTS has no `preload` yet.

Before every push: `node scripts/preflight.mjs --launch` must print OK.

---

## 3. Checkout and delivery

- **Store:** `taghunterhq.lemonsqueezy.com`. Product checkout link:
  - Phones/tablets: `…/checkout/buy/f7de4a5c-14d9-4010-8e3f-99ba0575250a?logo=0&desc=0`
  - Desktop: `…/checkout/buy/f7de4a5c-14d9-4010-8e3f-99ba0575250a`
- **Confirmation button link (set in Lemon Squeezy):** `https://taghunterhq.com/thank-you/?o=[order_identifier]`. The thank-you page puts a valid order ID (number or UUID) into the support-email subject; anything else is ignored.
- **Suggested confirmation modal text:** message "Payment received. Your receipt, with a Download button for the handbook, is on its way to your inbox."; button "See what's next".
- 🟡 Store name changed from "Xepharus Online Store" to Tag Hunter; confirmation modal text updated.
- 🟡 Payment flow tested in **test mode** through to the thank-you page.
- 🟡 **Live mode:** you confirmed the checkout link is the live one (no test-mode banner on the checkout page when I opened it). Not verified with a real sale yet.
- ⏳ Do **not** buy your own product and refund it (self-purchase can look like fraud). The first genuine sale is the live check. Watch it closely.
- ⏳ Check that the PDF is attached to the product and that receipt emails include the Download button.
- ⏳ Test on a real phone inside the YouTube app (Apple Pay / Google Pay behave differently in in-app browsers).

---

## 4. Domain, hosting and email

- ✅ **Hosting:** Cloudflare (project `taghunter`), auto-deploys from GitHub `main`. The Git connection dropped once ("disconnected from your Git account"); fixed by re-authorising the Cloudflare GitHub app on the repo. If builds stop again, check that banner first.
- ✅ **Domain:** `taghunterhq.com` registered and DNS-hosted on Cloudflare. Old Shopify DNS records removed, custom domain attached to the project.
- ✅ **www → bare domain:** 301 redirect rule, with a proxied placeholder `A` record for `www` (`192.0.2.1`, needed so the rule can fire).
- ✅ **Support email:** Cloudflare Email Routing forwards `support@taghunterhq.com` to your Gmail (MX, DKIM and SPF records added by Cloudflare; catch-all left off).
- ✅ **Replying as support@:** Gmail "Send mail as" via `smtp.gmail.com:587` with an App Password (named `TagHunter support` in the Google account; revoke it there if ever needed). Replies default to the address a message was sent to. SPF is now `v=spf1 include:_spf.mx.cloudflare.net include:_spf.google.com ~all` (single record). Test message sent as support@ arrived (in Promotions, not spam).
- **Support subject code:** every "email us" link prefills `[TH-K7Q4] …`. Gmail filter idea: `to:support@taghunterhq.com -subject:"TH-K7Q4"` → label "Unverified", skip inbox. The code is public, so it filters junk but does not authenticate. Verify the order number in Lemon Squeezy before acting on a refund. Security reports (security.txt) will also land in "Unverified".
- 🟡 Cloudflare setting for preview builds left on, Cloudflare Access left off.
- ℹ️ The GitHub repo is **Public** on purpose for now (easy updates). Nothing secret is in it: keys live only as Worker secrets.

---

## 5. SEO

- ✅ Title "TJ Maxx Clearance Hunter Handbook | Read Tags & Markdowns" (57 chars), 135-char description, canonical, Open Graph and Twitter tags, `robots.txt` (thank-you left crawlable so its noindex is seen), sitemap with dates.
- ✅ Structured data: Organization, WebSite, Product (price $24.95 USD, 30-day return policy, free instant delivery) and FAQPage generated from the visible FAQ. Google's live test shows Product snippets and Merchant listings valid. Remaining notes are optional: `review`, `aggregateRating`, `returnMethod`. **Do not add fake reviews**; add real ones later.
- 🟡 Google Search Console verified (Domain property), homepage indexed, sitemap submitted, indexing requested. Bing Webmaster imported and URLs submitted.
- ⏳ Check Search Console **Pages** and **Enhancements** in 1–2 weeks. Expect old Shopify URLs to show as not found; add redirects if any matter.
- ⏳ **Biggest SEO lever:** guide pages (e.g. "What do TJ Maxx tag colors mean?", "TJ Maxx yellow sticker meaning", "TJ Maxx markdown schedule"), each ending with the Spotter Card signup. Paid detail stays in the book.

---

## 6. Free Spotter Card signup: connected, waiting for the first live test

**Decisions taken:** Brevo, single opt-in, Cloudflare Turnstile, card delivered as a Google Drive "anyone with the link" download (sharing accepted; PDF never in the repo). Email copy is in `emails/spotter-card-sequence.md`.

**History:** the first provider, MailerLite, suspended the new account automatically within hours, so we switched to Brevo. Kit's free plan lost automations on 3 Sep 2026, so it was ruled out.

**Done**
- Form posts to `/api/subscribe` (`worker/subscribe.js`, routed by `worker/index.js`): same-origin check, Turnstile check, then adds the address to the Brevo list. 17 tests pass (`node scripts/test-subscribe.mjs`).
- Brevo: domain authenticated, sender `support@taghunterhq.com` verified, list `Spotter Card` (ID 3), automation switched on (Email 1 now, 3-day wait, Email 2), re-entry off.
- Worker secrets `BREVO_API_KEY`, `BREVO_LIST_ID`, `TURNSTILE_SECRET` set with `npx wrangler secret put`. **Lesson:** secrets typed into the dashboard's Variables and Secrets box did NOT reach the running Worker. Use the wrangler command (and `wrangler login`/`logout` around it), also when rotating.
- ✅ MailerLite fully removed from the Worker and from DNS (verification TXT deleted, SPF restored to `v=spf1 include:_spf.mx.cloudflare.net ~all`). The suspended MailerLite account itself can simply be left alone.

**Tested ✅** Live signup works end to end: Email 1 arrived in the inbox with a working card link; Email 2 arrived (in Promotions, which is normal). Wait time set back to 3 days. Both emails have a designed footer with unsubscribe link and `Zamboanga City, Philippines 7000` (city-level address: a PO box or full street address would be the stronger choice for CAN-SPAM).

**Still open**
- Optional: Cloudflare rate-limiting rule for `/api/subscribe`.
- ✅ Cloudflare Web Analytics allowed in the CSP (script + connect) and described on the Privacy page (was a blocked beacon before). Check the numbers in Cloudflare > Web Analytics after a few days.

## 7. Other open items

**Before real sales**
- [ ] Live-mode checkout link swapped in (section 3).
- [ ] Have the Privacy and Terms pages reviewed. They are drafts, not legal advice.
- [x] Verified against the book (25 Sep 2026): FAQ, section descriptions, tag-checker wording and page previews now match. Fixed: Marshalls/HomeGoods answer, US-only answer, "The System" contents (observation sheet is in The Timing, p. 18).
- [x] Handbook revised to revision 3 (25 Sep 2026): US English, US-only and sister-banner scope statements, page 24 returns table checked against TJ Maxx's official US pages (40-day online window, $11.99 mail fee, PayPal credit rules, not-eligible-in-store list, gift receipts), certainty softened on reported figures, unconfirmed marker on the re-ticket claim, 25 bookmarks and 25 contents links. Only the page 23 preview needed refreshing (done). Pages 1, 10, 12 and 18 are unchanged.
- [ ] **Upload the revised PDF to Lemon Squeezy** (replace the product file). Keep the file name `Clearance-Hunter-Handbook.pdf`. Old versions in Downloads: `Clearance Hunter Handbook.pdf` is the original (do not upload), `...pdf.pdf` is revision 2.
- [ ] Confirm tax display at real checkout ("Plus tax where applicable" is on the page).

**After launch**
- [x] Visit tracking: Cloudflare Web Analytics, allowed in the CSP and on the Privacy page.
- [ ] Redirects for old Shopify page addresses if Search Console shows any that matter.
- [ ] Cancel Shopify only after the new site has worked on the real domain for a few days.
- [ ] Guide pages for SEO (section 5).
- [ ] Add real reviews to the page and the structured data once you have them.
- [ ] Parked from the plan: testimonials (after 10–20 sales), Marshalls/HomeGoods edition, longer email sequence, deeper analytics.

---

## 8. How to work on the site

```
node scripts/dev-server.mjs        # http://localhost:5173 (applies _headers like production)
node scripts/preflight.mjs         # safety checks; --launch also fails on placeholders
git add -A && git commit -m "…" && git push     # Cloudflare deploys automatically
```

- Site root is `public/`. Styles: `public/assets/css/main.css`. Script: `public/assets/js/main.js` (no dependencies, no `innerHTML`).
- The CSP forbids inline scripts, inline event handlers and inline `style=""` attributes. `preflight` fails if one is added.
- Images live in `public/assets/img/` (cover, previews, logo lockups). Keep file names and sizes when replacing.
- To change the support subject code, tell Claude: it appears in several pages, `main.js` and the Gmail filter.
- After changing CSS/JS, hard-refresh (Ctrl+Shift+R) once if a browser still shows the old version.
