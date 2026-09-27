/* Tag Hunter — ga.js
   GA4 bootstrap. The CSP blocks inline scripts, so this file (not an inline snippet) queues
   commands into dataLayer; the gtag.js library itself loads from Google via a <script src> tag
   in <head>. Cross-domain linking is on so a visit that continues to the Lemon Squeezy checkout
   (a different domain) still counts as the same GA4 session. */
(function () {
  "use strict";
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", "G-E7GNDDPZ1X", {
    linker: { domains: ["taghunterhq.lemonsqueezy.com"] }
  });
})();
