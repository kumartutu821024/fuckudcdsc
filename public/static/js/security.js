/**
 * TestPass Security Layer v18
 * - Developer Tools detection (PC + Mobile)
 * - Anti-scraping / API protection
 * - Right-click / keyboard shortcut blocking
 * - Continuous monitoring
 */
(function () {
  "use strict";

  // ── Config ───────────────────────────────────────────────────────────────
  const CONFIG = {
    CHECK_INTERVAL_MS: 800,    // How often to check devtools
    SIZE_THRESHOLD: 160,       // px diff to detect devtools
    BLUR_CLASS: "sec-blur",
    WARN_DELAY_MS: 1500,       // Warn before blocking
    MAX_WARNINGS: 2,
  };

  let _warnCount = 0;
  let _blocked = false;
  let _devToolsOpen = false;
  let _devtoolsCheckInterval = null;

  // ── Create overlay ───────────────────────────────────────────────────────
  const overlay = document.createElement("div");
  overlay.id = "secOverlay";
  Object.assign(overlay.style, {
    display: "none",
    position: "fixed",
    inset: "0",
    zIndex: "99999",
    background: "#000",
    color: "#fff",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Inter, system-ui, sans-serif",
    textAlign: "center",
    padding: "32px",
    userSelect: "none",
  });
  overlay.innerHTML = `
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style="margin-bottom:20px">
      <rect width="48" height="48" rx="14" fill="white"/>
      <path d="M12 34 L18 14 L24 28 L30 18 L36 34" stroke="#000" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>
    <h2 style="font-size:1.3rem;font-weight:900;letter-spacing:-0.03em;margin-bottom:10px">Access Restricted</h2>
    <p style="font-size:0.85rem;color:#888;max-width:280px;line-height:1.6">
      Developer tools band karo aur page reload karo.<br>TestPass ke content ko copy/scrape karna prohibited hai.
    </p>
    <button id="secReloadBtn" style="margin-top:24px;padding:12px 28px;background:#fff;color:#000;border:none;border-radius:12px;font-size:0.9rem;font-weight:700;cursor:pointer;font-family:inherit;">
      Reload Page
    </button>
  `;

  document.addEventListener("DOMContentLoaded", () => {
    document.body.appendChild(overlay);
    document.getElementById("secReloadBtn")?.addEventListener("click", () => {
      location.reload();
    });
  });

  function showOverlay() {
    overlay.style.display = "flex";
    _blocked = true;
  }

  function hideOverlay() {
    overlay.style.display = "none";
    _blocked = false;
  }

  // ── DevTools detection: window size method ───────────────────────────────
  function checkBySize() {
    const widthDiff  = window.outerWidth  - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;
    return widthDiff > CONFIG.SIZE_THRESHOLD || heightDiff > CONFIG.SIZE_THRESHOLD;
  }

  // ── DevTools detection: debugger timing ─────────────────────────────────
  function checkByTiming() {
    const start = performance.now();
    // eslint-disable-next-line no-debugger
    debugger; // Takes longer if devtools open
    const elapsed = performance.now() - start;
    return elapsed > 100;
  }

  // ── DevTools detection: console getter trick ─────────────────────────────
  let _consoleDetected = false;
  const _devImage = new Image();
  Object.defineProperty(_devImage, "id", {
    get: function () {
      _consoleDetected = true;
    },
  });

  function checkByConsole() {
    _consoleDetected = false;
    console.log(_devImage);   // DevTools logs this, triggering getter
    console.clear();
    return _consoleDetected;
  }

  // ── Main devtools check ──────────────────────────────────────────────────
  function isDevToolsOpen() {
    try {
      if (checkBySize()) return true;
      if (checkByTiming()) return true;
      return false;
    } catch (e) {
      return false;
    }
  }

  function handleDevTools(open) {
    if (open === _devToolsOpen) return; // no change
    _devToolsOpen = open;

    if (open) {
      _warnCount++;
      if (_warnCount > CONFIG.MAX_WARNINGS) {
        showOverlay();
      } else {
        // First warn
        if (_warnCount === 1) {
          setTimeout(() => {
            if (_devToolsOpen) showOverlay();
          }, CONFIG.WARN_DELAY_MS);
        }
      }
    } else {
      // DevTools closed
      if (_blocked) hideOverlay();
    }
  }

  // ── Continuous polling ───────────────────────────────────────────────────
  function startMonitor() {
    if (_devtoolsCheckInterval) return;
    _devtoolsCheckInterval = setInterval(() => {
      handleDevTools(isDevToolsOpen());
    }, CONFIG.CHECK_INTERVAL_MS);
  }

  startMonitor();

  // ── Window resize: devtools open on side ────────────────────────────────
  window.addEventListener("resize", () => {
    handleDevTools(isDevToolsOpen());
  });

  // ── Block right-click ───────────────────────────────────────────────────
  document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    return false;
  });

  // ── Block keyboard shortcuts ─────────────────────────────────────────────
  document.addEventListener("keydown", function (e) {
    // F12
    if (e.key === "F12") { e.preventDefault(); return false; }
    // Ctrl/Cmd + Shift + I, J, C, K
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["I", "J", "C", "K", "i", "j", "c", "k"].includes(e.key)) {
      e.preventDefault(); return false;
    }
    // Ctrl/Cmd + U (view source)
    if ((e.ctrlKey || e.metaKey) && (e.key === "u" || e.key === "U")) {
      e.preventDefault(); return false;
    }
    // Ctrl/Cmd + S (save page)
    if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
      e.preventDefault(); return false;
    }
    // Ctrl/Cmd + A (select all)
    if ((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A")) {
      e.preventDefault(); return false;
    }
    // Ctrl/Cmd + P (print)
    if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
      e.preventDefault(); return false;
    }
  });

  // ── Block drag ───────────────────────────────────────────────────────────
  document.addEventListener("dragstart", function (e) {
    e.preventDefault(); return false;
  });

  // ── Block copy/cut/paste ─────────────────────────────────────────────────
  document.addEventListener("copy",  function (e) { e.preventDefault(); });
  document.addEventListener("cut",   function (e) { e.preventDefault(); });

  // ── Disable text selection ────────────────────────────────────────────────
  document.addEventListener("selectstart", function (e) {
    // Allow selection inside inputs / textareas
    const tag = e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    e.preventDefault();
  });

  // ── Anti iframe embedding ─────────────────────────────────────────────────
  if (window.self !== window.top) {
    try { window.top.location = window.self.location; } catch (e) {}
    document.body.innerHTML = "<h1 style='color:#fff;background:#000;padding:40px;font-family:sans-serif'>Embedding not allowed.</h1>";
  }

  // ── Console banner ────────────────────────────────────────────────────────
  console.log(
    "%cTestPass Security Alert",
    "color:#000;background:#fff;font-size:1.2rem;font-weight:900;padding:10px 18px;border-radius:8px"
  );
  console.log(
    "%cIs console ka use karna prohibited hai. API endpoints aur content protected hain.",
    "color:#888;font-size:0.9rem;padding:4px 0"
  );

  // ── Override fetch/XHR to add CSRF token & block external calls ──────────
  const _originalFetch = window.fetch;
  window.fetch = function (input, init) {
    // Only allow same-origin requests from this app
    const url = typeof input === "string" ? input : input.url;
    if (url.startsWith("http") && !url.startsWith(location.origin)) {
      // Block external requests silently
      return Promise.reject(new Error("External requests blocked"));
    }
    const headers = new Headers(init?.headers || {});
    headers.set("X-Requested-With", "TestPass-App");
    headers.set("X-Security-Token", btoa(document.cookie || navigator.userAgent || "tp"));
    return _originalFetch.call(this, input, { ...init, headers });
  };

  // ── Expose minimal API ────────────────────────────────────────────────────
  window.__TP_SEC = { version: 18 };

})();
