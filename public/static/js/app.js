/**
 * TestPass App v18
 * Navigation: Categories → Series → Subjects → Mock Tests
 * Includes: Splash screen, Home Hero stats, Tab bar
 */

// ── Splash Screen ─────────────────────────────────────────────────────────────
(function initSplash() {
  const splash = document.getElementById("splashScreen");
  const bar    = document.getElementById("splashBar");
  const shell  = document.getElementById("appShell");
  if (!splash || !bar || !shell) return;

  let progress = 0;
  const tick = setInterval(() => {
    progress += Math.random() * 18 + 8;
    if (progress >= 100) {
      progress = 100;
      bar.style.width = "100%";
      clearInterval(tick);
      setTimeout(() => {
        splash.style.transition = "opacity 0.5s ease";
        splash.style.opacity = "0";
        setTimeout(() => {
          splash.style.display = "none";
          shell.classList.remove("hidden");
        }, 500);
      }, 300);
    } else {
      bar.style.width = progress + "%";
    }
  }, 120);
})();

// ── State ────────────────────────────────────────────────────────────────────
const state = { view: "categories", category: null, series: null, subject: null };

// ── AppNav ────────────────────────────────────────────────────────────────────
const AppNav = {
  _ignorePop: false,

  init() {
    history.replaceState({ view: "categories", search: "" }, "");
    window.addEventListener("popstate", (e) => this.onPop(e.state));
  },

  push(data) { history.pushState(data, ""); },

  pushExamState(phase, questionIndex = 0) {
    history.pushState({ view: "exam", phase, questionIndex }, "");
  },

  pushExamQuestion(questionIndex) {
    const cur = history.state;
    if (cur?.view === "exam" && cur.phase === "taking" && cur.questionIndex === questionIndex) return;
    history.pushState({ view: "exam", phase: "taking", questionIndex }, "");
  },

  replaceExamPhase(phase) {
    history.replaceState({
      view: "exam", phase,
      questionIndex: history.state?.questionIndex ?? 0,
    }, "");
  },

  syncHistoryAfterExamExit() {
    if (history.state?.view === "exam") {
      this._ignorePop = true;
      history.back();
      this._ignorePop = false;
    }
  },

  onPop(st) {
    if (this._ignorePop) return;
    if (typeof Exam !== "undefined" && Exam.isActive()) {
      if (st?.view === "exam") { Exam.restorePhase(st.phase, st.questionIndex); return; }
      if (!Exam.confirmLeave()) {
        history.pushState({ view: "exam", phase: Exam.getPhase(), questionIndex: Exam.getQuestionIndex?.() ?? 0 }, "");
        return;
      }
      Exam.forceHide();
    }
    this.restore(st);
  },

  restore(st) {
    if (!st || st.view === "categories") {
      loadCategories(st?.search || "", true);
    } else if (st.view === "series") {
      loadSeries(st.category, true);
    } else if (st.view === "subjects") {
      loadSubjects(st.series, true);
    } else if (st.view === "tests") {
      state.category = st.category || null;
      state.series   = st.series   || null;
      loadTests(st.subject, true);
    }
  },
};

window.AppNav = AppNav;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
let list, empty, emptyText, breadcrumb, backBtn, searchWrap, searchInput,
    sectionLabel, seriesHero, homeHero, tabBar;

const CAT_SHADES = ["#fff","#e5e5e5","#ccc","#b3b3b3","#999","#808080","#666","#4d4d4d"];
const CAT_FG     = ["#000","#000","#000","#000","#000","#fff","#fff","#fff"];

// ── Utilities ─────────────────────────────────────────────────────────────────
function setGridLayout(mode) {
  if (!list) return;
  list.classList.toggle("grid-2", mode === "subjects" || mode === "tests");
}

function showSkeleton(count = 6) {
  empty.classList.add("hidden");
  list.innerHTML = Array.from({ length: count }, () => `
    <div class="skeleton-card">
      <div class="sk-block sk-avatar"></div>
      <div style="flex:1">
        <div class="sk-block sk-line lg"></div>
        <div class="sk-block sk-line sm"></div>
      </div>
    </div>
  `).join("");
}

async function fetchJSON(url) {
  const res  = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Request failed");
  return json;
}

function escapeHTML(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}

// ── Home Hero ─────────────────────────────────────────────────────────────────
function showHomeHero() { homeHero?.classList.remove("hidden"); }
function hideHomeHero() { homeHero?.classList.add("hidden"); }

async function loadHeroStats() {
  try {
    const json = await fetchJSON("/api/stats");
    const el_tests = document.getElementById("heroTotalTests");
    const el_cats  = document.getElementById("heroTotalCats");
    if (el_tests && json.data?.total_tests != null) {
      el_tests.textContent = json.data.total_tests > 999
        ? (json.data.total_tests / 1000).toFixed(1) + "K+"
        : json.data.total_tests + "+";
    }
    if (el_cats && json.data?.total_categories != null) {
      el_cats.textContent = json.data.total_categories + "+";
    }
  } catch (e) {
    // Stats are cosmetic, fail silently
  }
}

// ── Series Hero ───────────────────────────────────────────────────────────────
function hideSeriesHero() {
  seriesHero.classList.add("hidden");
  seriesHero.innerHTML = "";
}

function renderSeriesHero(series) {
  if (!series?.title) { hideSeriesHero(); return; }
  seriesHero.classList.remove("hidden");
  const banner = series.banner
    ? `<img class="series-hero-banner" src="${escapeHTML(series.banner)}" alt="" loading="lazy" onerror="this.remove()">`
    : `<div class="series-hero-banner series-hero-banner-fallback"></div>`;
  const logo = series.logo
    ? `<img class="series-hero-logo" src="${escapeHTML(series.logo)}" alt="" loading="lazy"
         onerror="this.outerHTML='<div class=\\'series-hero-logo-fallback\\'>📚</div>'">`
    : `<div class="series-hero-logo-fallback">📚</div>`;
  seriesHero.innerHTML = `
    ${banner}
    <div class="series-hero-body">
      ${logo}
      <div>
        <div class="series-hero-title">${escapeHTML(series.title)}</div>
        <div class="series-hero-meta">${escapeHTML(series.exam_name || state.category?.exam_name || "")}</div>
      </div>
    </div>`;
}

// ── Tab Bar ───────────────────────────────────────────────────────────────────
function initTabBar() {
  if (!tabBar) return;
  tabBar.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBar.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      if (btn.dataset.tab === "free") {
        loadFreeTests();
      } else {
        loadCategories("", false);
      }
    });
  });
}

async function loadFreeTests() {
  sectionLabel.textContent = "Free Mock Tests";
  sectionLabel.classList.remove("hidden");
  showSkeleton(6);
  try {
    const json = await fetchJSON("/api/free-tests");
    list.innerHTML = "";
    if (!json.data?.length) { showEmpty("Abhi koi free test available nahi hai"); return; }
    empty.classList.add("hidden");
    json.data.forEach((test) => list.appendChild(mockCard(test)));
  } catch (e) {
    showEmpty("Free tests load nahi hue: " + e.message);
  }
}

// ── Card builders ─────────────────────────────────────────────────────────────
function categoryCard(cat, idx) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "nav-card";
  const bg      = CAT_SHADES[idx % CAT_SHADES.length];
  const fg      = CAT_FG[idx % CAT_FG.length];
  const initial = (cat.exam_name || "?").charAt(0).toUpperCase();
  btn.innerHTML = `
    <div class="nav-card-icon cat" style="background:${bg};color:${fg};font-size:1.2rem">${initial}</div>
    <div class="nav-card-body">
      <div class="nav-card-title">${escapeHTML(cat.exam_name || "Unnamed")}</div>
      <div class="nav-card-meta">${cat.series_count || 0} test series available</div>
    </div>
    <span class="nav-card-chevron">›</span>`;
  btn.addEventListener("click", () => loadSeries(cat));
  return btn;
}

function seriesCard(s) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "series-card";
  const banner  = s.banner
    ? `<img class="series-card-cover" src="${escapeHTML(s.banner)}" alt="" loading="lazy" onerror="this.classList.add('hidden')">`
    : `<div class="series-card-cover series-card-cover-fallback"></div>`;
  const logoWrap = s.logo ? "" : " fallback";
  const logo     = s.logo
    ? `<img class="series-card-logo" src="${escapeHTML(s.logo)}" alt="" loading="lazy"
         onerror="this.closest('.series-card-logo-wrap').classList.add('fallback')">`
    : "";
  btn.innerHTML = `
    ${banner}
    <div class="series-card-body">
      <div class="series-card-logo-wrap${logoWrap}">
        ${logo}
        <div class="series-card-logo-fb">📚</div>
      </div>
      <div class="series-card-info">
        <div class="series-card-title">${escapeHTML(s.title)}</div>
        <div class="series-card-badges">
          ${s.exam_name ? `<span class="badge">${escapeHTML(s.exam_name)}</span>` : ""}
          ${s.free_flag === "1" ? `<span class="badge badge-free">FREE</span>` : ""}
        </div>
      </div>
    </div>`;
  btn.addEventListener("click", () => loadSubjects(s));
  return btn;
}

function subjectCard(sub) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "nav-card";
  const thumb = sub.logo
    ? `<img class="nav-card-thumb" src="${escapeHTML(sub.logo)}" alt="" loading="lazy"
         onerror="this.outerHTML='<div class=\\'nav-card-icon subject\\'>📖</div>'">`
    : `<div class="nav-card-icon subject">📖</div>`;
  btn.innerHTML = `
    ${thumb}
    <div class="nav-card-body">
      <div class="nav-card-title">${escapeHTML(sub.subject_name)}</div>
      <div class="nav-card-meta">Mock tests dekho →</div>
    </div>
    <span class="nav-card-chevron">›</span>`;
  btn.addEventListener("click", () => loadTests(sub));
  return btn;
}

function mockCard(test) {
  const en   = test.question_url_english;
  const hi   = test.question_url_hindi;
  const card = document.createElement("div");
  card.className = "mock-card";
  card.innerHTML = `
    <div class="mock-card-top">
      <div class="mock-card-icon">📝</div>
      <div class="mock-card-info">
        <div class="mock-card-title">${escapeHTML(test.title)}</div>
        <div class="mock-card-stats">
          ${test.free_flag === "1" ? `<span class="stat-chip free">FREE</span>` : ""}
          <span class="stat-chip">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            ${test.time || "?"} min
          </span>
          <span class="stat-chip">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
            ${test.questions || "?"} Q
          </span>
          <span class="stat-chip">${test.marks || "?"} marks</span>
        </div>
      </div>
    </div>
    <div class="mock-card-actions">
      <button type="button" class="btn-lang btn-lang-en" data-lang="english" ${en ? "" : "disabled"}>
        <span class="lang-flag">🇬🇧</span> English
      </button>
      <button type="button" class="btn-lang btn-lang-hi" data-lang="hindi" ${hi ? "" : "disabled"}>
        <span class="lang-flag">🇮🇳</span> हिंदी
      </button>
    </div>`;
  card.querySelectorAll(".btn-lang:not([disabled])").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (typeof Exam === "undefined") {
        alert("Exam module load nahi hua. Refresh karo.");
        return;
      }
      Exam.start(test, btn.dataset.lang);
    });
  });
  return card;
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function showEmpty(msg) {
  list.innerHTML = "";
  if (emptyText) emptyText.textContent = msg;
  else if (empty) empty.textContent = msg;
  empty.classList.remove("hidden");
}

function updateUI() {
  searchWrap.classList.toggle("hidden", state.view !== "categories");
  backBtn.classList.toggle("hidden", state.view === "categories");
  tabBar?.classList.toggle("hidden", state.view !== "categories");

  if (state.view === "categories") {
    showHomeHero();
  } else {
    hideHomeHero();
  }

  const crumbs = {
    categories: "Explore",
    series:     state.category?.exam_name || "Test Series",
    subjects:   state.series?.title || "Subjects",
    tests:      state.subject?.subject_name || "Mock Tests",
  };
  breadcrumb.textContent = crumbs[state.view] || "Explore";

  const labels = {
    categories: "Exam Categories",
    series:     "Test Series",
    subjects:   "Choose Subject",
    tests:      "Mock Tests",
  };
  const lbl = labels[state.view];
  sectionLabel.textContent = lbl || "";
  sectionLabel.classList.toggle("hidden", state.view === "categories");

  if (state.view === "subjects" || state.view === "tests") {
    renderSeriesHero(state.series);
  } else {
    hideSeriesHero();
  }

  setGridLayout(state.view);
}

// ── Loaders ───────────────────────────────────────────────────────────────────
async function loadCategories(search = "", fromHistory = false) {
  state.view = "categories";
  state.category = state.series = state.subject = null;
  updateUI();
  showSkeleton();
  loadHeroStats();
  const q    = search ? `?search=${encodeURIComponent(search)}` : "";
  const json = await fetchJSON(`/api/exam-categories${q}`);
  list.innerHTML = "";
  if (!json.data.length) { showEmpty("Koi category nahi mili"); return; }
  empty.classList.add("hidden");
  json.data.forEach((cat, i) => list.appendChild(categoryCard(cat, i)));
  if (!fromHistory) {
    const cur = history.state;
    if (cur?.view === "categories") {
      history.replaceState({ view: "categories", search }, "");
    } else {
      AppNav.push({ view: "categories", search });
    }
  }
}

async function loadSeries(category, fromHistory = false) {
  state.view     = "series";
  state.category = category;
  state.series = state.subject = null;
  updateUI();
  showSkeleton(5);
  const json = await fetchJSON(`/api/exam-categories/${category.exam_id}/test-series`);
  list.innerHTML = "";
  if (!json.data.length) { showEmpty("Koi test series nahi mili"); return; }
  empty.classList.add("hidden");
  json.data.forEach((s) => list.appendChild(seriesCard(s)));
  if (!fromHistory) AppNav.push({ view: "series", category });
}

async function loadSubjects(series, fromHistory = false) {
  state.view   = "subjects";
  state.series = series;
  state.subject = null;
  updateUI();
  showSkeleton(5);
  const json = await fetchJSON(`/api/test-series/${series.id}/subjects`);
  list.innerHTML = "";
  if (!json.data.length) { showEmpty("Koi subject nahi mila"); return; }
  empty.classList.add("hidden");
  json.data.forEach((sub) => list.appendChild(subjectCard(sub)));
  if (!fromHistory) AppNav.push({ view: "subjects", series });
}

async function loadTests(subject, fromHistory = false) {
  state.view    = "tests";
  state.subject = subject;
  updateUI();
  showSkeleton(5);
  const json = await fetchJSON(
    `/api/test-series/${state.series.id}/subjects/${subject.subject_id}/tests`
  );
  list.innerHTML = "";
  if (!json.data.length) { showEmpty("Koi mock test nahi mila"); return; }
  empty.classList.add("hidden");
  json.data.forEach((test) => list.appendChild(mockCard(test)));
  if (!fromHistory) AppNav.push({ view: "tests", subject, series: state.series, category: state.category });
}

function goBack() {
  if (state.view === "categories") return;
  history.back();
}

// ── Boot ──────────────────────────────────────────────────────────────────────
function bindUI() {
  list        = $("#list");
  empty       = $("#empty");
  emptyText   = $("#emptyText");
  breadcrumb  = $("#breadcrumb");
  backBtn     = $("#backBtn");
  searchWrap  = $("#searchWrap");
  searchInput = $("#searchInput");
  sectionLabel= $("#sectionLabel");
  seriesHero  = $("#seriesHero");
  homeHero    = $("#homeHero");
  tabBar      = $("#tabBar");

  if (!list || !empty) {
    document.body.insertAdjacentHTML("beforeend",
      '<div style="padding:24px;margin:16px;background:#1a1a1a;color:#fff;border:1px solid #333;border-radius:12px;font-family:sans-serif">' +
      '<strong>UI load error.</strong> Server restart karo.</div>');
    return false;
  }

  backBtn.addEventListener("click", goBack);
  initTabBar();

  let searchTimer;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadCategories(searchInput.value.trim()), 300);
  });

  // Keyboard shortcut Cmd/Ctrl+K for search focus
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      searchInput?.focus();
    }
  });

  return true;
}

function boot() {
  if (!bindUI()) return;
  AppNav.init();
  loadCategories("", true).catch((err) => showEmpty("Error: " + err.message));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
