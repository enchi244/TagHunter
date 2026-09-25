// Tag Hunter Worker. Static files come from public/ (the assets binding). Only /api/* reaches this code
// (see run_worker_first in wrangler.jsonc).
import { onRequestPost, onRequest } from "./subscribe.js";

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/subscribe") {
      return request.method === "POST" ? onRequestPost({ request, env }) : onRequest({ request, env });
    }
    // Any other /api/ path: plain 404, never the site's HTML.
    return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  },
};
