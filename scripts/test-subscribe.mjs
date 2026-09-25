// Tests for worker/subscribe.js with a fake fetch (no network, no real keys).
// Usage: node scripts/test-subscribe.mjs
import assert from "node:assert/strict";
import { onRequestPost, onRequest } from "../worker/subscribe.js";

const ORIGIN = "https://taghunterhq.com";
const ENV = { MAILERLITE_API_KEY: "ml-test-key", MAILERLITE_GROUP_ID: "12345", TURNSTILE_SECRET: "ts-test-secret" };

let calls, turnstile, mailerlite, logs;
globalThis.fetch = async (url, init) => {
  calls.push({ url: String(url), init });
  if (String(url).includes("turnstile")) return Response.json(turnstile.body, { status: turnstile.status ?? 200 });
  if (String(url).includes("mailerlite")) return Response.json({}, { status: mailerlite.status });
  throw new Error("unexpected fetch " + url);
};
console.error = (...a) => logs.push(a.join(" "));

function post(body, { origin = ORIGIN, type = "application/json", env = ENV, raw } = {}) {
  const headers = {};
  if (origin) headers.Origin = origin;
  if (type) headers["Content-Type"] = type;
  const request = new Request(ORIGIN + "/api/subscribe", { method: "POST", headers, body: raw ?? JSON.stringify(body) });
  return onRequestPost({ request, env });
}
function reset() {
  calls = []; logs = [];
  turnstile = { body: { success: true } };
  mailerlite = { status: 201 };
}

const tests = [];
const test = (name, fn) => tests.push([name, fn]);
const good = { email: "Hunter@Example.com ", token: "tok" };

test("valid signup: verifies Turnstile then adds the lowercased address to the group", async () => {
  const res = await post(good);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /challenges\.cloudflare\.com\/turnstile\/v0\/siteverify/);
  assert.equal(calls[0].init.body.get("secret"), "ts-test-secret");
  assert.equal(calls[0].init.body.get("response"), "tok");
  assert.equal(calls[1].url, "https://connect.mailerlite.com/api/subscribers");
  assert.equal(calls[1].init.headers.Authorization, "Bearer ml-test-key");
  assert.deepEqual(JSON.parse(calls[1].init.body), { email: "hunter@example.com", groups: ["12345"], status: "active" });
});
test("existing subscriber (MailerLite 200) is still success", async () => {
  mailerlite.status = 200;
  assert.equal((await post(good)).status, 200);
});
test("response carries no-store and nosniff", async () => {
  const res = await post(good);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  assert.equal(res.headers.get("X-Content-Type-Options"), "nosniff");
});
test("cross-site Origin is refused before anything else", async () => {
  const res = await post(good, { origin: "https://evil.example" });
  assert.equal(res.status, 403);
  assert.equal(calls.length, 0);
});
test("missing Origin is refused", async () => {
  assert.equal((await post(good, { origin: null })).status, 403);
  assert.equal(calls.length, 0);
});
test("non-JSON content type is refused (form-post CSRF)", async () => {
  assert.equal((await post(good, { type: "text/plain" })).status, 415);
  assert.equal(calls.length, 0);
});
test("missing secrets -> 503, nothing is called", async () => {
  assert.equal((await post(good, { env: {} })).status, 503);
  assert.equal(calls.length, 0);
});
test("invalid emails are rejected without calling out", async () => {
  for (const email of ["", "nope", "a@b", "a b@c.com", "x".repeat(250) + "@a.com", 42, null, ["a@b.co"]]) {
    const res = await post({ email, token: "tok" });
    assert.equal(res.status, 400, JSON.stringify(email));
  }
  assert.equal(calls.length, 0);
});
test("malformed and oversized bodies", async () => {
  assert.equal((await post(null, { raw: "{not json" })).status, 400);
  assert.equal((await post(null, { raw: "null" })).status, 400);
  assert.equal((await post(null, { raw: JSON.stringify({ email: "a@b.co", token: "t", pad: "x".repeat(3000) }) })).status, 413);
  assert.equal(calls.length, 0);
});
test("honeypot filled: fake success, nothing sent", async () => {
  const res = await post({ ...good, website: "http://spam" });
  assert.equal(res.status, 200);
  assert.equal(calls.length, 0);
});
test("missing token -> 403, Turnstile and MailerLite never called", async () => {
  assert.equal((await post({ email: "a@b.co" })).status, 403);
  assert.equal((await post({ email: "a@b.co", token: "" })).status, 403);
  assert.equal((await post({ email: "a@b.co", token: {} })).status, 403);
  assert.equal(calls.length, 0);
});
test("Turnstile says no -> 403 and MailerLite is not called", async () => {
  turnstile.body = { success: false, "error-codes": ["invalid-input-response"] };
  const res = await post(good);
  assert.equal(res.status, 403);
  assert.deepEqual(await res.json(), { error: "captcha" });
  assert.equal(calls.length, 1);
});
test("Turnstile unreachable -> 502", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("network"); };
  try { assert.equal((await post(good)).status, 502); } finally { globalThis.fetch = real; }
});
test("MailerLite 422 (bad address) -> 400 email", async () => {
  mailerlite.status = 422;
  const res = await post(good);
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: "email" });
});
test("MailerLite errors -> 502, and the log never contains the address or keys", async () => {
  for (const status of [401, 429, 500]) {
    reset();
    mailerlite.status = status;
    assert.equal((await post(good)).status, 502);
    const all = logs.join("\n");
    assert.ok(all.includes(String(status)));
    assert.ok(!/example\.com|ml-test-key|ts-test-secret/.test(all), "log leaked: " + all);
  }
});
test("other methods -> 405 with Allow: POST", async () => {
  const res = onRequest({});
  assert.equal(res.status, 405);
  assert.equal(res.headers.get("Allow"), "POST");
});

let failed = 0;
for (const [name, fn] of tests) {
  reset();
  try { await fn(); console.log("ok    " + name); }
  catch (e) { failed++; console.log("FAIL  " + name + "\n      " + (e.message || e).split("\n").join("\n      ")); }
}
console.log(failed ? `\n${failed} of ${tests.length} failed.` : `\nAll ${tests.length} passed.`);
process.exit(failed ? 1 : 0);
