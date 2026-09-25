# Spotter Card email sequence (MailerLite)

Reference copy of the two emails. The live versions are built in MailerLite (Automations).
No fake urgency, no invented claims. Keep it that way when editing.

Both emails need MailerLite's footer: your postal address and the unsubscribe link (US law requires both).
MailerLite adds them from Account > Settings; check they are filled in.

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
(Swap for the live-mode link when Lemon Squeezy goes live. See PROJECT-STATUS.md section 3.)

---

## MailerLite setup checklist

1. **Sender:** Account > Domains: authenticate `taghunterhq.com` (adds DKIM/SPF records in Cloudflare DNS).
   Do this before sending real emails, or they land in spam. Set the sender address to `support@taghunterhq.com`.
   If you already edited SPF for Gmail "Send mail as", merge it: one SPF record only, adding `include:_spf.mailerlite.com`.
2. **Group:** Subscribers > Groups > create "Spotter Card". Note its numeric id (the number in the group's URL).
3. **Single opt-in:** Account > Subscribers settings: make sure double opt-in is OFF for API/integrations
   (otherwise new subscribers arrive "unconfirmed" and the automation waits).
4. **API token:** Integrations > MailerLite API > generate a token.
5. **Automation:** trigger "Subscriber joins a group" = Spotter Card.
   Step 1: send Email 1 (immediately). Step 2: delay 3 days. Step 3: send Email 2.
6. **Card PDF link:** put the PDF somewhere with a long link (your choice), paste it into Email 1's button.
   Never commit the PDF to this repo.
7. **Test:** subscribe with your own address on the live site, check Email 1 arrives fast and the button works.
   For Email 2, temporarily set the delay to 1 minute, test, then set it back to 3 days.
