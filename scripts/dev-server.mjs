// Local dev server for public/. No dependencies.
// Applies public/_headers the way Cloudflare Pages does, so CSP problems show up locally.
// It also runs worker/*.js handlers for /api/*. Their secrets come from a git-ignored
// .dev.vars file in the project root (KEY=value lines), like Cloudflare's own local tooling.
// Usage: node scripts/dev-server.mjs [port]
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../public", import.meta.url)));
const PROJECT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PORT = Number(process.argv[2]) || 5173;

async function loadVars() {
  const vars = {};
  try {
    for (const line of (await readFile(join(PROJECT, ".dev.vars"), "utf8")).split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch { /* no .dev.vars: the function answers "config" */ }
  return vars;
}

// /api/name -> worker/name.js. Mirrors worker/index.js: onRequestPost for POST, else onRequest.
async function runFunction(req, res, pathname) {
  const name = pathname.replace(/^\/api\//, "");
  if (!/^[a-z0-9_-]+$/i.test(name)) { res.writeHead(404).end("Not found"); return; }
  let mod;
  try { mod = await import(pathToFileURL(join(PROJECT, "worker", name + ".js")).href + "?t=" + Date.now()); }
  catch { res.writeHead(404).end("Not found"); return; }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const request = new Request("http://" + req.headers.host + req.url, {
    method: req.method,
    headers: req.headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks),
  });
  const handler = (req.method === "POST" && mod.onRequestPost) || mod.onRequest;
  const out = handler ? await handler({ request, env: await loadVars() }) : new Response("Not found", { status: 404 });
  res.writeHead(out.status, Object.fromEntries(out.headers)).end(Buffer.from(await out.arrayBuffer()));
}

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png",
  ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml",
  ".webp": "image/webp", ".json": "application/json",
};

// Parse _headers: a path pattern line, then indented "Name: value" lines. Same-name headers merge with ", ".
async function loadRules() {
  let text = "";
  try { text = await readFile(join(ROOT, "_headers"), "utf8"); } catch { return []; }
  const rules = [];
  let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    if (!/^\s/.test(raw)) { cur = { pattern: raw.trim(), headers: [] }; rules.push(cur); continue; }
    const i = raw.indexOf(":");
    if (cur && i > 0) cur.headers.push([raw.slice(0, i).trim(), raw.slice(i + 1).trim()]);
  }
  return rules;
}
const toRegex = (p) => new RegExp("^" + p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");

createServer(async (req, res) => {
  const rules = await loadRules(); // re-read each request so edits apply instantly
  const url = new URL(req.url, "http://localhost");
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.startsWith("/api/")) { await runFunction(req, res, pathname); return; }

  const merged = new Map();
  for (const r of rules) {
    if (!toRegex(r.pattern).test(pathname)) continue;
    for (const [k, v] of r.headers) merged.set(k, merged.has(k) ? merged.get(k) + ", " + v : v);
  }
  // Dev only: don't force HTTPS on plain http://localhost.
  merged.delete("Strict-Transport-Security");
  merged.set("Cache-Control", "no-store"); // dev only: always show the latest edits
  if (merged.has("Content-Security-Policy")) {
    merged.set("Content-Security-Policy", merged.get("Content-Security-Policy").replace(/;?\s*upgrade-insecure-requests/, ""));
  }

  let file = normalize(join(ROOT, pathname));
  if (file !== ROOT && !file.startsWith(ROOT + sep)) { res.writeHead(403).end("Forbidden"); return; }
  if (pathname.endsWith("/")) file = join(file, "index.html");
  let status = 200;
  try {
    const s = await stat(file);
    if (s.isDirectory()) { res.writeHead(301, { Location: pathname + "/" }).end(); return; }
  } catch {
    status = 404;
    file = join(ROOT, "404.html");
  }
  // Never serve the headers file itself.
  if (file.endsWith(sep + "_headers")) { status = 404; file = join(ROOT, "404.html"); }

  try {
    const body = await readFile(file);
    const headers = Object.fromEntries(merged);
    headers["Content-Type"] = TYPES[extname(file)] || "application/octet-stream";
    res.writeHead(status, headers).end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(PORT, () => console.log(`Tag Hunter dev server: http://localhost:${PORT}  (serving ${ROOT})`));
