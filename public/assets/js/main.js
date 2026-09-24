/* Tag Hunter — main.js
   No dependencies, no eval, no innerHTML. Everything user-visible is set with textContent
   so nothing typed by a visitor can ever be interpreted as markup. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pageLoadedAt = Date.now();

  /* ---------- Checkout: overlay on phones/tablets, full Lemon Squeezy page on desktop ----------
     Every buy button is a normal link to the hosted checkout, and lemon.js turns the click into
     an overlay. On wide screens we stop lemon.js from seeing the click, so the link just opens
     the hosted page. Capture phase on document runs before lemon.js's own button listeners. */
  (function checkoutMode() {
    var desktop = window.matchMedia ? window.matchMedia("(min-width: 960px)") : null;
    if (!desktop) return;
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

    function say(msg, state) {
      status.textContent = msg;
      status.setAttribute("data-state", state || "");
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

      var endpoint = form.getAttribute("data-endpoint") || "";
      if (endpoint.indexOf("https://") !== 0) {
        say("Sign-up isn't switched on yet. Please check back soon.", "error");
        return;
      }

      button.disabled = true;
      say("Sending…", "");
      var ctrl = "AbortController" in window ? new AbortController() : null;
      var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 10000) : null;

      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, source: "spotter-card" }),
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (res) {
        if (!res.ok) throw new Error("bad status");
        say("Check your inbox for the Spotter Card.", "ok");
        form.reset();
      }).catch(function () {
        say("Something went wrong. Please try again in a moment.", "error");
      }).then(function () {
        if (timer) clearTimeout(timer);
        button.disabled = false;
      });
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

  /* ---------- Dev safety net: shout if a checkout URL was never filled in ---------- */
  document.querySelectorAll("a.lemonsqueezy-button").forEach(function (a) {
    if (/YOUR-STORE|YOUR-PRODUCT/.test(a.getAttribute("href") || "")) {
      console.warn("Tag Hunter: buy button still points at the placeholder checkout URL. See README.");
    }
  });
})();
