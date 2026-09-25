// POST /api/subscribe: the free Spotter Card signup (called from worker/index.js).
// Flow: same-origin check -> validate email -> verify Turnstile token
// -> add the address to a MailerLite group. The MailerLite automation on that group sends the card.
//
// Secrets (Cloudflare > Workers & Pages > taghunter Worker > Settings > Variables and Secrets):
//   MAILERLITE_API_KEY   MailerLite API token (secret)
//   MAILERLITE_GROUP_ID  numeric id of the group the welcome automation listens to
//   TURNSTILE_SECRET     Turnstile widget secret key (secret)
// None of these may ever appear in public/ or in the repo.

const MAX_BODY = 2048;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// _headers does not apply to Function responses, so set the safe ones here.
const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: HEADERS });

export async function onRequestPost({ request, env }) {
  // Same-origin only: the browser always sends Origin on a cross-site POST.
  const origin = request.headers.get("Origin");
  if (origin !== new URL(request.url).origin) return reply(403, { error: "origin" });

  if (!(request.headers.get("Content-Type") || "").toLowerCase().startsWith("application/json")) {
    return reply(415, { error: "type" });
  }
  if (!env.MAILERLITE_API_KEY || !env.MAILERLITE_GROUP_ID || !env.TURNSTILE_SECRET) {
    const missing = ["MAILERLITE_API_KEY", "MAILERLITE_GROUP_ID", "TURNSTILE_SECRET"].filter((k) => !env[k]);
    console.error("subscribe: missing configuration: " + missing.join(", "));
    return reply(503, { error: "config" });
  }

  let raw;
  try { raw = await request.text(); } catch { return reply(400, { error: "body" }); }
  if (raw.length > MAX_BODY) return reply(413, { error: "size" });

  let data;
  try { data = JSON.parse(raw); } catch { return reply(400, { error: "body" }); }
  if (!data || typeof data !== "object") return reply(400, { error: "body" });

  // Honeypot: report success so a bot learns nothing.
  if (typeof data.website === "string" && data.website !== "") return reply(200, { ok: true });

  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return reply(400, { error: "email" });

  const token = typeof data.token === "string" ? data.token : "";
  if (!token || token.length > 2048) return reply(403, { error: "captcha" });

  // 1. Turnstile: the token must be valid, unused and issued for one of our widgets.
  try {
    const form = new FormData();
    form.append("secret", env.TURNSTILE_SECRET);
    form.append("response", token);
    const ip = request.headers.get("CF-Connecting-IP");
    if (ip) form.append("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(8000),
    });
    const out = await res.json();
    if (!out || out.success !== true) {
      const codes = out && Array.isArray(out["error-codes"]) ? out["error-codes"].slice(0, 5) : [];
      console.error("subscribe: turnstile rejected: " + codes.join(","));
      return reply(403, { error: "captcha", codes }); // codes are Cloudflare's public error names, e.g. "timeout-or-duplicate"
    }
  } catch {
    console.error("subscribe: turnstile verification failed to run");
    return reply(502, { error: "upstream", stage: "turnstile" });
  }

  // 2. MailerLite: create the subscriber (or update the existing one) and put them in the group.
  //    Adding to the group is what starts the welcome automation. An address that is already in the
  //    group does not trigger it again, so repeat submissions never send the card twice.
  try {
    const res = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + env.MAILERLITE_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email, groups: [String(env.MAILERLITE_GROUP_ID)], status: "active" }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 200 || res.status === 201) return reply(200, { ok: true });
    // 422 = MailerLite rejected the address (invalid, blocked or bounced): tell the visitor.
    if (res.status === 422) return reply(400, { error: "email" });
    console.error("subscribe: mailerlite status " + res.status); // status only, never the address
    return reply(502, { error: "upstream", stage: "mailerlite", status: res.status });
  } catch {
    console.error("subscribe: mailerlite request failed");
    return reply(502, { error: "upstream", stage: "mailerlite" });
  }
}

// Anything but POST: no.
export function onRequest() {
  return new Response(JSON.stringify({ error: "method" }), { status: 405, headers: { ...HEADERS, Allow: "POST" } });
}
