# Tag Hunter: project status and next steps

Last updated: 25 September 2026
Site: https://taghunterhq.com (single-page sales site for the *TJ Maxx Clearance Hunter Handbook*, $24.95 PDF)
Repo: `enchi244/TagHunter` (GitHub). Deploys from `main` to Cloudflare (project `taghunter`), output directory `public`.

Legend: ✅ done and verified in this project · 🟡 done by you, not verified by me · ⏳ open

---

## 1. Where we are

The site is built, deployed on the real domain, and takes payment through Lemon Squeezy. The one big functional gap is the **free Spotter Card email signup**, which is not connected yet (section 6).

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
- ⏳ **Go live:** complete Lemon Squeezy verification/payout details, publish the product in live mode, and give me the **live** checkout link to swap in (test-mode links do not take real payments).
- ⏳ Do **not** buy your own product and refund it (self-purchase can look like fraud). The first genuine sale is the live check. Watch it closely.
- ⏳ Check that the PDF is attached to the product and that receipt emails include the Download button.
- ⏳ Test on a real phone inside the YouTube app (Apple Pay / Google Pay behave differently in in-app browsers).

---

## 4. Domain, hosting and email

- ✅ **Hosting:** Cloudflare (project `taghunter`), auto-deploys from GitHub `main`. The Git connection dropped once ("disconnected from your Git account"); fixed by re-authorising the Cloudflare GitHub app on the repo. If builds stop again, check that banner first.
- ✅ **Domain:** `taghunterhq.com` registered and DNS-hosted on Cloudflare. Old Shopify DNS records removed, custom domain attached to the project.
- ✅ **www → bare domain:** 301 redirect rule, with a proxied placeholder `A` record for `www` (`192.0.2.1`, needed so the rule can fire).
- ✅ **Support email:** Cloudflare Email Routing forwards `support@taghunterhq.com` to your Gmail (MX, DKIM and SPF records added by Cloudflare; catch-all left off).
- ⏳ **Replying as support@** (Gmail "Send mail as" with an App Password) and the SPF edit to `v=spf1 include:_spf.mx.cloudflare.net include:_spf.google.com ~all`. Not confirmed done.
- **Support subject code:** every "email us" link prefills `[TH-K7Q4] …`. Gmail filter idea: `to:support@taghunterhq.com -subject:"TH-K7Q4"` → label "Unverified", skip inbox. The code is public, so it filters junk but does not authenticate. Verify the order number in Lemon Squeezy before acting on a refund. Security reports (security.txt) will also land in "Unverified".
- 🟡 Cloudflare setting for preview builds left on, Cloudflare Access left off.
- ⚠️ The GitHub repo is currently **Public**. Nothing secret is in it, but consider making it private (then confirm Cloudflare still has access).

---

## 5. SEO

- ✅ Title "TJ Maxx Clearance Hunter Handbook | Read Tags & Markdowns" (57 chars), 135-char description, canonical, Open Graph and Twitter tags, `robots.txt` (thank-you left crawlable so its noindex is seen), sitemap with dates.
- ✅ Structured data: Organization, WebSite, Product (price $24.95 USD, 30-day return policy, free instant delivery) and FAQPage generated from the visible FAQ. Google's live test shows Product snippets and Merchant listings valid. Remaining notes are optional: `review`, `aggregateRating`, `returnMethod`. **Do not add fake reviews**; add real ones later.
- 🟡 Google Search Console verified (Domain property), homepage indexed, sitemap submitted, indexing requested. Bing Webmaster imported and URLs submitted.
- ⏳ Check Search Console **Pages** and **Enhancements** in 1–2 weeks. Expect old Shopify URLs to show as not found; add redirects if any matter.
- ⏳ **Biggest SEO lever:** guide pages (e.g. "What do TJ Maxx tag colors mean?", "TJ Maxx yellow sticker meaning", "TJ Maxx markdown schedule"), each ending with the Spotter Card signup. Paid detail stays in the book.

---

## 6. NEXT: the free Spotter Card signup (the biggest gap)

**Current state:** the form on the page validates the email, has a honeypot and a too-fast-submit trap, and posts to `data-endpoint` if set. The endpoint is empty, so visitors see "Sign-up isn't switched on yet". Every not-ready-yet visitor is being lost.

**The goal (from the plan):** visitor enters email → gets the Spotter Card instantly → a few days later one follow-up email ("Here's what the card doesn't cover") linking to the buy button → optional one seasonal email (January clearance). Keep the sequence small until sales prove the product.

### Decisions needed
1. **Email provider.** Do you already use one? If not, a free plan is enough while the list is small. Candidates: MailerLite, Kit (ConvertKit), Buttondown, Mailchimp. Lemon Squeezy's own email marketing costs extra by subscriber count; compare against a free tier.
2. **How the site talks to the provider** (this is the security-critical part):

| Option | How it works | Pros | Cons |
|---|---|---|---|
| A. Server function (recommended) | A small Cloudflare function (`/api/subscribe`) receives the form post and calls the provider's API. The API key lives only as a secret environment variable in Cloudflare | Key never visible; no CSP change (calls stay on our own domain); room for Turnstile bot protection and rate limiting | Slightly more setup; need to confirm this project type runs functions |
| B. Provider's hosted form | The button sends people to the provider's own signup page | Zero code, no key | Leaves your site; less polished |
| C. Provider's public form endpoint straight from the browser | Form posts directly to the provider | Simple | Needs a CSP change (`connect-src`), varies by provider, weaker spam control |

**Rule: never put a secret API key in `public/`.** Everything there is readable by anyone.

3. **How the card gets delivered.** The PDF must not go in the repo. Options: the provider's welcome-email automation with the PDF attached or linked; or a public unguessable link (acceptable since the card is free, but the email gate can then be bypassed if the link leaks).
4. **Double opt-in or single?** Single is faster for conversion. Double opt-in is safer legally (EU/UK visitors) and for deliverability. Tell me who you expect to sign up.
5. **Bot protection:** add Cloudflare Turnstile now or wait until spam shows up?
6. **Copy:** confirmation message on the page, the welcome email (with the card), and the follow-up email a few days later (subject, body, button to the buy link).

### What I will do once decisions are made
- Connect the form (and add any needed CSP entry or function).
- Update the on-page success/error messages.
- Update the **Privacy page** to name the email provider (currently says "our email service provider").
- Draft the welcome email and the follow-up email.
- Add tests: valid email, invalid email, bot traps, provider error, and a check that the CSP still blocks everything unexpected.

---

## 7. Other open items

**Before real sales**
- [ ] Live-mode checkout link swapped in (section 3).
- [ ] Have the Privacy and Terms pages reviewed. They are drafts, not legal advice.
- [ ] Verify against the book: FAQ answers (Marshalls/HomeGoods, US only, TikTok, going out of date).
- [ ] Confirm tax display at real checkout ("Plus tax where applicable" is on the page).

**After launch**
- [ ] Visit tracking. Cloudflare Web Analytics is cookieless but needs `static.cloudflareinsights.com` in `script-src` and `cloudflareinsights.com` in `connect-src`, and a Privacy page update.
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
