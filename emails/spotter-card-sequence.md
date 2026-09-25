# Spotter Card email sequence (Brevo)

Reference copy of the two emails. The live versions are built in Brevo (Automations).
No fake urgency, no invented claims. Keep it that way when editing.

Both emails need a footer with your postal address and the unsubscribe link (US law requires both).
Brevo adds them from your company info; check they are filled in.

---

## Email 1: welcome (sent immediately)

**From:** Tag Hunter `<support@taghunterhq.com>`
**Subject:** Your Tag Hunter Spotter Card

Here's your card: **[Download the Spotter Card]** (button, link to the card PDF)

Save it to your phone. It's built to be read in two seconds at the rack. It covers the tag signals and the spotter tip.

One thing to know: I'll send you one more email in a few days, then that's it. Hit reply if you have a question.

— Tag Hunter

---

## Email 2: follow-up (sent 3 days after email 1)

**From:** Tag Hunter `<support@taghunterhq.com>`
**Subject:** Here's what the card doesn't cover

The card tells you what a tag says. It doesn't tell you when to buy, or when to wait.

The full handbook is 28 pages in four parts: the tags (including Compare At, which is not a discount), the timing of markdowns and how to find your store's day, the 14-minute hunt route, and a checklist and tracker to run it yourself.

$24.95, instant PDF, 30-day refund if it doesn't help. **[See the handbook]** (button, link below)

— Tag Hunter

Buy button link (use the desktop checkout page; it works on phones too):
`https://taghunterhq.lemonsqueezy.com/checkout/buy/f7de4a5c-14d9-4010-8e3f-99ba0575250a`

---

## Brevo setup (done)

1. Domain `taghunterhq.com` authenticated via Cloudflare (Senders, domains & dedicated IPs > Domains). Adds a brevo-code TXT, two `_domainkey` CNAMEs, a `_dmarc` record (p=none) and `r`/`img` CNAMEs.
2. Sender `Tag Hunter <support@taghunterhq.com>` verified (the code arrives via Cloudflare forwarding in Gmail).
3. Contact list `Spotter Card` (ID 3).
4. API key `taghunter-site`, stored only as the Worker secret `BREVO_API_KEY`. List id is `BREVO_LIST_ID`.
5. Automation "Spotter Card": trigger Contact added to list > Email 1 > wait 3 days > Email 2. Re-entry is OFF so nobody gets the card twice.
6. The card link in Email 1 is a Google Drive "anyone with the link" file. Never commit the PDF to this repo.
