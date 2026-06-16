<?php
// ── Security Headers ──────────────────────────────────────────────────────────
header("X-Frame-Options: DENY");
header("X-Content-Type-Options: nosniff");
header("X-XSS-Protection: 1; mode=block");
header("Referrer-Policy: no-referrer");
header("Permissions-Policy: camera=(), microphone=(), geolocation=()");
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none';");
header("Strict-Transport-Security: max-age=31536000; includeSubDomains");

// Prevent caching of HTML
header("Cache-Control: no-store, no-cache, must-revalidate, private");
header("Pragma: no-cache");

// Simple bot / scraper detection
$ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
$bot_keywords = ['curl', 'wget', 'python', 'scrapy', 'bot', 'spider', 'crawl', 'http-client', 'java/', 'perl/', 'ruby/', 'go-http', 'okhttp', 'axios', 'fetch/', 'libwww'];
foreach ($bot_keywords as $kw) {
    if (stripos($ua, $kw) !== false) {
        http_response_code(403);
        exit('403 Forbidden');
    }
}

// Block empty UA
if (empty(trim($ua))) {
    http_response_code(403);
    exit('403 Forbidden');
}
?>
<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>TestPass — Mock Tests for India</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap" rel="stylesheet">
  <meta name="referrer" content="no-referrer">
  <meta name="theme-color" content="#0a0a0a">
  <meta name="color-scheme" content="dark">
  <meta name="robots" content="noindex, nofollow">
  <link rel="stylesheet" href="/static/css/style.css?v=18">
  <noscript><style>body{background:#000;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;}.ns{text-align:center;padding:40px;}</style><div class="ns"><p>JavaScript enable karo is app ke liye.</p></div></noscript>
</head>
<body>

<!-- ── Splash Screen ─────────────────────────────────────────────────────── -->
<div id="splashScreen" class="splash">
  <div class="splash-inner">
    <div class="splash-logo-wrap">
      <div class="splash-logo-icon">
        <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="14" fill="white"/>
          <path d="M12 34 L18 14 L24 28 L30 18 L36 34" stroke="#000" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <circle cx="24" cy="28" r="2.5" fill="#000"/>
        </svg>
      </div>
      <span class="splash-logo-text">TestPass</span>
    </div>
    <div class="splash-tagline">India's Smart Mock Test Platform</div>
    <div class="splash-progress">
      <div class="splash-progress-bar" id="splashBar"></div>
    </div>
    <div class="splash-sub">SSC · UPSC · Defence · State Exams</div>
  </div>
</div>

<!-- ── Main App Shell ────────────────────────────────────────────────────── -->
<div id="appShell" class="app-shell hidden">

  <!-- Header -->
  <header class="app-header">
    <div class="header-inner">
      <div class="header-row">
        <button id="backBtn" class="icon-btn hidden" aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div class="header-brand">
          <div class="header-logo">
            <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="12" fill="white"/>
              <path d="M12 34 L18 14 L24 28 L30 18 L36 34" stroke="#000" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            </svg>
            <span class="header-logo-name">TestPass</span>
          </div>
          <p id="breadcrumb" class="breadcrumb">Explore</p>
        </div>
        <div class="header-actions">
          <div class="header-badge" id="onlineDot" title="Live"></div>
        </div>
      </div>

      <div id="searchWrap" class="search-wrap">
        <div class="search-box">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input id="searchInput" type="search" placeholder="Exam dhundo... SSC, UPSC, Defence" autocomplete="off" spellcheck="false">
          <kbd class="search-kbd hidden-mobile">⌘K</kbd>
        </div>
      </div>
    </div>
  </header>

  <!-- Home Hero (shown only on categories view) -->
  <div id="homeHero" class="home-hero">
    <div class="hero-content">
      <div class="hero-eyebrow">
        <span class="hero-dot"></span>
        <span>Live Mock Tests</span>
      </div>
      <h2 class="hero-title">Practice Smart,<br><span class="hero-accent">Rank Higher</span></h2>
      <p class="hero-sub">SSC, UPSC, Defence, State PSC — sab ek jagah</p>
      <div class="hero-stats">
        <div class="hstat"><span class="hstat-val" id="heroTotalTests">—</span><span class="hstat-lbl">Tests</span></div>
        <div class="hstat-div"></div>
        <div class="hstat"><span class="hstat-val" id="heroTotalCats">—</span><span class="hstat-lbl">Categories</span></div>
        <div class="hstat-div"></div>
        <div class="hstat"><span class="hstat-val">Free</span><span class="hstat-lbl">Many Tests</span></div>
      </div>
    </div>
    <div class="hero-visual">
      <div class="hero-card-float hcard-1">
        <div class="hcard-icon">📊</div>
        <div class="hcard-txt"><strong>SSC CGL</strong><span>200 Questions</span></div>
      </div>
      <div class="hero-card-float hcard-2">
        <div class="hcard-icon">⚔️</div>
        <div class="hcard-txt"><strong>NDA 2024</strong><span>Hindi + English</span></div>
      </div>
      <div class="hero-card-float hcard-3">
        <div class="hcard-icon">🏛️</div>
        <div class="hcard-txt"><strong>UPSC Pre</strong><span>Free Test</span></div>
      </div>
    </div>
  </div>

  <main class="app-main">
    <div id="tabBar" class="tab-bar hidden">
      <button class="tab-btn active" data-tab="explore">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        Explore
      </button>
      <button class="tab-btn" data-tab="free">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        Free Tests
      </button>
    </div>

    <div id="seriesHero" class="series-hero hidden"></div>
    <p id="sectionLabel" class="section-label hidden"></p>
    <div id="list" class="card-grid"></div>
    <div id="empty" class="empty-state hidden">
      <div class="empty-icon">📭</div>
      <p id="emptyText">Koi data nahi mila</p>
    </div>
  </main>

  <footer class="app-footer">
    <p>TestPass &copy; <?= date('Y') ?> · <span>Smart Preparation Platform</span></p>
  </footer>
</div>

<!-- ── Exam Screen ───────────────────────────────────────────────────────── -->
<div id="examScreen" class="exam-screen hidden">
  <div id="examLoading" class="exam-loading">
    <div class="loader-ring-wrap">
      <div class="loader-ring"></div>
      <div class="loader-logo">
        <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="white"/>
          <path d="M12 34 L18 14 L24 28 L30 18 L36 34" stroke="#000" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      </div>
    </div>
    <p>Paper load ho raha hai...</p>
  </div>

  <div id="examTaking" class="hidden">
    <div class="exam-top-sticky">
      <div class="exam-header">
        <div class="exam-header-info">
          <div id="examTitle" class="exam-title"></div>
          <div id="examProgress" class="exam-progress"></div>
        </div>
        <div id="examTimer" class="exam-timer">00:00</div>
      </div>
      <div class="exam-progress-bar">
        <div id="examProgressFill" class="exam-progress-fill"></div>
      </div>
      <div id="examPaletteWrap" class="exam-palette-wrap hidden">
        <p class="exam-palette-label">Questions</p>
        <div id="examPalette" class="exam-palette"></div>
      </div>
    </div>
    <div id="examQuestion" class="exam-question"></div>
    <div id="examOptions" class="exam-options"></div>
    <div class="exam-footer">
      <button id="examPrev" class="btn btn-outline btn-sm">← Prev</button>
      <button id="examPaletteBtn" class="btn btn-outline btn-sm">Q List</button>
      <button id="examNext" class="btn btn-primary btn-sm">Next →</button>
      <button id="examSubmit" class="btn btn-danger btn-block">Submit Test</button>
    </div>
  </div>

  <div id="examResult" class="hidden exam-result-wrap">
    <div class="result-header">
      <div class="result-score-ring" id="resultScoreRing">0%</div>
      <h2>Test Complete!</h2>
      <p class="result-sub">Aapka performance summary</p>
    </div>
    <div id="resultCards" class="result-grid"></div>
    <div class="result-actions">
      <button id="reviewBtn" class="btn btn-primary btn-block">Review Answers</button>
      <button id="exitExamBtn" class="btn btn-outline btn-block">Back to Tests</button>
    </div>
  </div>

  <div id="examPaletteBackdrop" class="exam-palette-backdrop hidden"></div>
  <div id="examPalettePanel" class="exam-palette-panel hidden">
    <div class="exam-palette-panel-head">
      <span>Question List</span>
      <button type="button" id="examPaletteClose" class="btn btn-outline btn-sm">Close</button>
    </div>
    <div id="examPalettePanelGrid" class="exam-palette-panel-grid"></div>
  </div>

  <div id="examReview" class="hidden">
    <div class="review-top">
      <h2>Answer Review</h2>
      <button id="closeReviewBtn" class="btn btn-outline btn-sm">Back</button>
    </div>
    <div id="reviewList" class="review-list"></div>
  </div>
</div>

<script src="/static/js/security.js?v=18"></script>
<script src="/static/js/exam.js?v=18"></script>
<script src="/static/js/app.js?v=18"></script>
</body>
</html>
