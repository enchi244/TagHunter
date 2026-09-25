// Pre-deploy checks for public/. No dependencies.
// Usage: node scripts/preflight.mjs           (checks the site is safe to ship)
//        node scripts/preflight.mjs --launch  (also fails if any YOUR-... placeholder is left)
//
// The site's CSP forbids inline scripts, inline event handlers and inline style attributes.
// These checks keep it that way, so a well-meaning edit can't quietly break (or weaken) the policy.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../public", import.meta.url)));
const launch = process.argv.includes("--launch");
const errors = [];
const warns = [];
const fail = (f, m) => errors.push(`${relative(ROOT, f) || f}: ${m}`);

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const files = walk(ROOT);
const htmlFiles = files.filter((f) => f.endsWith(".html"));

for (const f of htmlFiles) {
  const src = readFileSync(f, "utf8");

  // 1. Inline <script> (script with no src). JSON data blocks are allowed.
  for (const m of src.matchAll(/<script\b([^>]*)>/gi)) {
    if (!/\bsrc=/.test(m[1]) && !/type=["']application\/(ld\+)?json["']/.test(m[1])) fail(f, "inline <script> (blocked by CSP)");
  }
  // 2. Inline event handlers: onclick=, onload=, ...
  if (/\son[a-z]+\s*=\s*["']/i.test(src.replace(/<!--[\s\S]*?-->/g, ""))) fail(f, "inline event handler attribute (blocked by CSP)");
  // 3. Inline style attributes / <style> blocks.
  if (/\sstyle\s*=\s*["']/i.test(src)) fail(f, "inline style attribute (move it into main.css)");
  if (/<style\b/i.test(src)) fail(f, "<style> block (move it into main.css)");
  // 4. javascript: URLs.
  if (/(?:href|src|action)\s*=\s*["']\s*javascript:/i.test(src)) fail(f, "javascript: URL");
  // 5. Script/stylesheet origins must be on the CSP allowlist.
  for (const m of src.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["'](https?:)?\/\/([^/"']+)/gi)) {
    const host = m[2];
    if (host !== "assets.lemonsqueezy.com" && host !== "challenges.cloudflare.com" && !/rel=["']canonical/.test(m[0]) && !/rel=["'](?:canonical|alternate)/.test(m[0])) {
      if (/<script/i.test(m[0]) || /stylesheet|preload/.test(m[0])) fail(f, `loads from ${host}, which the CSP does not allow`);
    }
  }
  // 6. Off-site links that open new tabs need rel=noopener.
  for (const m of src.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/gi)) {
    if (!/rel=["'][^"']*noopener/.test(m[0])) fail(f, `target=_blank without rel=noopener: ${m[0].slice(0, 80)}`);
  }
  // 7. Local references must exist.
  for (const m of src.matchAll(/(?:href|src)=["'](\/[^"'#?]*)/g)) {
    const ref = m[1];
    if (ref.startsWith("//")) continue;
    let target = join(ROOT, ref);
    if (ref.endsWith("/")) target = join(target, "index.html");
    if (!existsSync(target)) fail(f, `broken local reference ${ref}`);
  }
  // 8. Launch placeholders.
  if (/YOUR-STORE|YOUR-PRODUCT/.test(src)) (launch ? fail : (a, b) => warns.push(`${relative(ROOT, a)}: ${b}`))(f, "checkout URL placeholder still present");
  if (/YOUR-TURNSTILE-SITE-KEY/.test(src)) (launch ? fail : (a, b) => warns.push(`${relative(ROOT, a)}: ${b}`))(f, "Turnstile site key placeholder still present");
  if (/support@taghunterhq\.com/.test(src) && launch) warns.push(`${relative(ROOT, f)}: confirm support@taghunterhq.com is a real, monitored inbox`);
}

// _headers must exist and carry the essentials.
const hp = join(ROOT, "_headers");
if (!existsSync(hp)) fail(hp, "missing");
else {
  const h = readFileSync(hp, "utf8");
  for (const need of ["Content-Security-Policy", "Strict-Transport-Security", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "frame-ancestors", "object-src 'none'", "base-uri 'none'"]) {
    if (!h.includes(need)) fail(hp, `missing ${need}`);
  }
  if (/script-src[^;]*'unsafe-(inline|eval)'/.test(h)) fail(hp, "script-src must never allow unsafe-inline or unsafe-eval");
  if (/(?:default|script)-src[^;]*\s\*(\s|;|$)/.test(h)) fail(hp, "wildcard source in CSP");
}

// Secrets / junk that must never be in the web root.
for (const f of files) {
  // Long JWT-style tokens (MailerLite keys) or Turnstile secret keys (0x4... 30+ chars) must never be published.
  if (/\.(html|js|css|json|txt|xml)$/i.test(f)) {
    const t = readFileSync(f, "utf8");
    if (/eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,}/.test(t) || /0x4[A-Za-z0-9_-]{30,}/.test(t)) fail(f, "looks like a secret key: keys belong in Cloudflare secrets, never in public/");
  }
  const n = f.toLowerCase();
  if (/(^|[\\/])(\.env|\.git|node_modules)([\\/]|$)|\.(pem|key|map|bak|zip|sql|pdf)$/.test(n)) fail(f, "should not be deployed");
  if (extname(f) === ".pdf") fail(f, "product PDF must not be in the web root (it would be publicly downloadable)");
}

for (const w of warns) console.log("WARN  " + w);
if (errors.length) {
  for (const e of errors) console.error("FAIL  " + e);
  console.error(`\n${errors.length} problem(s). Not safe to ship.`);
  process.exit(1);
}
console.log(`OK    ${htmlFiles.length} pages checked. CSP rules hold${launch ? ", launch placeholders cleared." : "."}`);
