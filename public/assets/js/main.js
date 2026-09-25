/* Tag Hunter — main.js
   No dependencies, no eval, no innerHTML. Everything user-visible is set with textContent
   so nothing typed by a visitor can ever be interpreted as markup. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pageLoadedAt = Date.now();

  /* ---------- Checkout: overlay on phones/tablets, full Lemon Squeezy page on desktop ----------
     Each buy button is a normal link. Its href is the overlay link (lemon.js turns the click into
     an overlay on narrow screens). On wide screens we (1) stop lemon.js from seeing the click and
     (2) swap the href to data-desktop-href, so the button opens the hosted checkout page and
     open-in-new-tab / copy-link also give the desktop URL. Only https links on our own
     Lemon Squeezy store host are ever swapped in. */
  (function checkoutMode() {
    var desktop = window.matchMedia ? window.matchMedia("(min-width: 960px)") : null;
    if (!desktop) return;
    var links = Array.prototype.slice.call(document.querySelectorAll("a.lemonsqueezy-button"));
    var SAFE = /^https:\/\/[a-z0-9-]+\.lemonsqueezy\.com\/checkout\//;

    function sync() {
      links.forEach(function (a) {
        if (!a.getAttribute("data-mobile-href")) a.setAttribute("data-mobile-href", a.getAttribute("href"));
        var want = desktop.matches ? a.getAttribute("data-desktop-href") : a.getAttribute("data-mobile-href");
        if (want && SAFE.test(want)) a.setAttribute("href", want);
      });
    }
    sync();
    if (desktop.addEventListener) desktop.addEventListener("change", sync);
    else if (desktop.addListener) desktop.addListener(sync);

    document.addEventListener("click", function (e) {
      var a = e.target && e.target.closest ? e.target.closest("a.lemonsqueezy-button") : null;
      if (a && desktop.matches) e.stopPropagation(); // default navigation still happens
    }, true);
  })();

  /* ---------- Sticky bar: hidden until the hero button scrolls out of view ---------- */
  (function stickyBar() {
    var bar = document.getElementById("sticky-bar");
    var heroBtn = document.getElementById("hero-buy");
    if (!bar || !heroBtn || !("IntersectionObserver" in window)) return;

    var wiggled = false;
    var io = new IntersectionObserver(function (entries) {
      var e = entries[0];
      // Only show once the button has left through the TOP (user scrolled past it).
      var scrolledPast = !e.isIntersecting && e.boundingClientRect.top < 0;
      bar.classList.toggle("is-on", scrolledPast);
      if (scrolledPast && !wiggled && !reduceMotion) {
        wiggled = true;
        var btn = bar.querySelector(".btn--buy");
        if (btn) {
          btn.classList.add("is-wiggle");
          btn.addEventListener("animationend", function () { btn.classList.remove("is-wiggle"); }, { once: true });
        }
      }
    });
    io.observe(heroBtn);
  })();

  /* ---------- Live tag checker (tabs) ---------- */
  (function tagChecker() {
    var list = document.querySelector('.checker [role="tablist"]');
    if (!list) return;
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));

    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(tab, false); });
      tab.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
        else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === "Home") next = tabs[0];
        else if (e.key === "End") next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); select(next, true); }
      });
    });
  })();

  /* ---------- Page preview lightbox (links work without JS) ---------- */
  (function lightbox() {
    var dlg = document.getElementById("lightbox");
    if (!dlg || typeof dlg.showModal !== "function") return;
    var big = dlg.querySelector("img");
    var close = dlg.querySelector(".lightbox__close");

    document.querySelectorAll("a[data-lightbox]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        var thumb = a.querySelector("img");
        var src = a.getAttribute("href");
        // Same-origin images only.
        if (!src || src.charAt(0) !== "/" || src.charAt(1) === "/") return;
        e.preventDefault();
        big.src = src;
        big.alt = thumb ? thumb.alt : "";
        dlg.showModal();
      });
    });
    close.addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); }); // backdrop tap
    dlg.addEventListener("close", function () { big.removeAttribute("src"); });
  })();

  /* ---------- Free Spotter Card email capture ---------- */
  (function spotterForm() {
    var form = document.getElementById("spotter-form");
    if (!form) return;
    var status = document.getElementById("spotter-status");
    var input = form.elements.email;
    var trap = form.elements.website;
    var button = form.querySelector('button[type="submit"]');
    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    // Only our own /api/ path, or an https URL, is ever used as the endpoint.
    var endpoint = form.getAttribute("data-endpoint") || "";
    var endpointOk = /^\/api\/[a-z0-9\/_-]+$/i.test(endpoint) || endpoint.indexOf("https://") === 0;
    var sitekey = form.getAttribute("data-sitekey") || "";
    var sitekeyOk = /^[0-9A-Za-z_-]{8,64}$/.test(sitekey) && sitekey.indexOf("YOUR-") !== 0;

    /* Cloudflare Turnstile: bot check. Loaded only when a visitor first touches the form, so people
       who never use it never load a third-party script. In "interaction-only" mode nothing is shown
       unless Cloudflare is unsure the visitor is human. */
    var widgetId = null;
    var token = "";
    var loadingTs = false;
    var waiting = false; // visitor pressed the button before the check finished

    function say(msg, state) {
      status.textContent = msg;
      status.setAttribute("data-state", state || "");
    }

    function renderTurnstile() {
      if (widgetId !== null || !window.turnstile) return;
      widgetId = window.turnstile.render("#spotter-turnstile", {
        sitekey: sitekey,
        appearance: "interaction-only",
        callback: function (t) {
          token = t;
          if (waiting) { waiting = false; send(); }
        },
        "expired-callback": function () { token = ""; },
        "error-callback": function () {
          token = "";
          if (waiting) { waiting = false; button.disabled = false; }
          say("The security check didn't load. Please refresh the page and try again.", "error");
        }
      });
    }

    function loadTurnstile() {
      if (loadingTs || !sitekeyOk) return;
      loadingTs = true;
      var s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = renderTurnstile;
      s.onerror = function () {
        loadingTs = false;
        if (waiting) {
          waiting = false;
          button.disabled = false;
          say("The security check didn't load. Please refresh the page and try again.", "error");
        }
      };
      document.head.appendChild(s);
    }

    input.addEventListener("focus", loadTurnstile);
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { io.disconnect(); loadTurnstile(); }
      }, { rootMargin: "300px" });
      io.observe(form);
    }

    function resetCheck() {
      token = "";
      if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId);
    }

    function send() {
      var email = (input.value || "").trim();
      button.disabled = true;
      say("Sending…", "");
      var ctrl = "AbortController" in window ? new AbortController() : null;
      var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 10000) : null;

      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, token: token }),
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (res) {
        if (res.ok) {
          say("Check your inbox for the Spotter Card.", "ok");
          form.reset();
          return;
        }
        return res.json().catch(function () { return {}; }).then(function (body) {
          if (body.error === "email") say("That email address doesn't look right. Please check it and try again.", "error");
          else if (body.error === "captcha") say("The security check didn't pass. Please try again.", "error");
          else say("Something went wrong. Please try again in a moment.", "error");
        });
      }).catch(function () {
        say("Something went wrong. Please try again in a moment.", "error");
      }).then(function () {
        if (timer) clearTimeout(timer);
        button.disabled = false;
        resetCheck(); // a Turnstile token works once
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = (input.value || "").trim();

      if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
        say("Please enter a valid email address.", "error");
        input.focus();
        return;
      }

      // Bots: filled honeypot, or submitted faster than a human can type.
      // Pretend it worked so they learn nothing.
      if ((trap && trap.value) || Date.now() - pageLoadedAt < 2500) {
        say("Check your inbox for the Spotter Card.", "ok");
        form.reset();
        return;
      }

      if (!endpointOk || !sitekeyOk) {
        say("Sign-up isn't switched on yet. Please check back soon.", "error");
        return;
      }

      if (!token) {
        // Security check still running: hold the click and send as soon as it finishes.
        waiting = true;
        button.disabled = true;
        say("Checking that you're human…", "");
        loadTurnstile();
        renderTurnstile();
        return;
      }
      send();
    });
  })();

  /* ---------- Thank-you page: copy the share link ---------- */
  (function copyLink() {
    var btn = document.getElementById("copy-link");
    if (!btn) return;
    var out = document.getElementById("copy-status");
    var url = btn.getAttribute("data-url") || "";
    if (url.indexOf("https://") !== 0) return;

    btn.addEventListener("click", function () {
      function done(ok) { out.textContent = ok ? "Link copied. Send it to a friend." : "Couldn't copy. Long-press to copy: " + url; }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); });
      } else {
        done(false);
      }
    });
  })();

  /* ---------- Thank-you page: put the order number in the support email subject ----------
     The Lemon Squeezy confirmation button can pass ?o=[order_id]. Only a plain number or UUID is
     accepted; anything else is ignored. The value is URL-encoded into a mailto subject and is
     never shown on the page or inserted as markup. */
  (function supportOrderNumber() {
    var link = document.getElementById("support-mail");
    if (!link) return;
    var o = new URLSearchParams(window.location.search).get("o") || "";
    var ok = /^[0-9]{1,12}$/.test(o) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(o);
    if (!ok) return;
    link.href = "mailto:support@taghunterhq.com?subject=" + encodeURIComponent("[TH-K7Q4] Handbook help - order " + o);
  })();

  /* ---------- Dev safety net: shout if a checkout URL was never filled in ---------- */
  document.querySelectorAll("a.lemonsqueezy-button").forEach(function (a) {
    if (/YOUR-STORE|YOUR-PRODUCT/.test(a.getAttribute("href") || "")) {
      console.warn("Tag Hunter: buy button still points at the placeholder checkout URL. See README.");
    }
  });
})();
