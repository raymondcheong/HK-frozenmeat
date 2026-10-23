/* =====================================================
   五豐行情 — 公共腳本
   負責：頁首頁尾渲染、資料存取層（種子數據 + 後台修改合併）
   ===================================================== */

var Store = {
  KEY: "hkmeat_admin_v1",

  /* 後台儲存的自訂內容（localStorage） */
  _custom: function () {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || {}; }
    catch (e) { return {}; }
  },
  saveCustom: function (obj) {
    localStorage.setItem(this.KEY, JSON.stringify(obj));
  },

  /* 合併後的新聞列表（後台新增/修改優先） */
  getNews: function () {
    var c = this._custom();
    var base = ((window.SITE_DATA && window.SITE_DATA.news) || []).filter(function (n) {
      return (c.deletedNews || []).indexOf(n.id) < 0;
    });
    var edited = base.map(function (n) {
      return (c.editedNews && c.editedNews[n.id]) ? Object.assign({}, n, c.editedNews[n.id]) : n;
    });
    return edited.concat(c.newNews || []).sort(function (a, b) {
      /* 發布日期倒序；同日期按 id 遞減（n0xx 越大越新），確保最新條目優先 */
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return String(a.id) < String(b.id) ? 1 : -1;
    });
  },

  getAnalysis: function () {
    var c = this._custom();
    var base = ((window.SITE_DATA && window.SITE_DATA.analysis) || []).filter(function (a) {
      return (c.deletedAnalysis || []).indexOf(a.id) < 0;
    });
    var edited = base.map(function (a) {
      return (c.editedAnalysis && c.editedAnalysis[a.id]) ? Object.assign({}, a, c.editedAnalysis[a.id]) : a;
    });
    return edited.concat(c.newAnalysis || []).sort(function (a, b) {
      return a.date < b.date ? 1 : -1;
    });
  },

  getPig: function () {
    var c = this._custom();
    var base = ((window.SITE_DATA && window.SITE_DATA.pig) || []).slice();
    (c.pigRows || []).forEach(function (row) {
      var idx = -1;
      base.forEach(function (r, i) { if (r.date === row.date) idx = i; });
      if (idx >= 0) base[idx] = row; else base.push(row);
    });
    return base.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  },

  getCategories: function () {
    var c = this._custom();
    if (c.categories && c.categories.length) return c.categories;
    return ((window.SITE_DATA && window.SITE_DATA.newsCategories) || []).slice();
  },

  getAnalysisTypes: function () {
    var c = this._custom();
    if (c.analysisTypes && c.analysisTypes.length) return c.analysisTypes;
    return ((window.SITE_DATA && window.SITE_DATA.analysisTypes) || []).slice();
  },

  fmtDate: function (iso) {
    var p = iso.split("-");
    return p[2] + "/" + p[1] + "/" + p[0];
  },
  num: function (n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
};

/* ---------- 資料載入層（容錯 ＋ 自動更新） ---------- */
/* 背景：data.js 以 <script> 直接載入時受 HTTP 快取（GitHub Pages max-age=600）
   及瀏覽器磁碟快取影響，可能載入舊資料；若載入失敗，SITE_DATA 為 undefined，
   頁面會整段腳本報錯而變成空白。此層負責：偵測是否就緒、偵測是否過期、
   以 cache-busting 重新載入，並提供統一的空狀態／錯誤提示。 */
var DataLoader = {
  DATA_URL: "js/data.js",
  _busy: false,

  todayISO: function () {
    var d = new Date();
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  },

  ready: function () {
    return !!(window.SITE_DATA && window.SITE_DATA.news && window.SITE_DATA.news.length);
  },

  /* 資料內最新一則資訊的日期（YYYY-MM-DD） */
  latestNewsDate: function () {
    if (!this.ready()) return null;
    var max = "";
    window.SITE_DATA.news.forEach(function (n) { if (n.date && n.date > max) max = n.date; });
    return max || null;
  },

  /* 資料是否明顯落後（落後超過一日才算過時；早上未發布當日新聞屬正常，
     避免每次載入都誤判為「未更新」） */
  isStale: function () {
    var d = this.latestNewsDate();
    if (!d) return false;
    var t = new Date();
    t.setDate(t.getDate() - 1);
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    var cutoff = t.getFullYear() + "-" + pad(t.getMonth() + 1) + "-" + pad(t.getDate());
    return d < cutoff;
  },

  /* 十分鐘內只自動檢查一次，避免每次開頁都重抓資料 */
  CHECK_KEY: "hkmeat_data_checked_v1",
  recentlyChecked: function () {
    try {
      var t = parseInt(localStorage.getItem(this.CHECK_KEY), 10);
      return !!t && (Date.now() - t) < 10 * 60 * 1000;
    } catch (e) { return false; }
  },
  markChecked: function () {
    try { localStorage.setItem(this.CHECK_KEY, String(Date.now())); } catch (e) {}
  },

  /* 以時間戳重新載入 data.js（繞過 HTTP 快取） */
  load: function (cb) {
    if (this._busy) { cb(new Error("資料正在載入，請稍候")); return; }
    this._busy = true;
    var self = this;
    var s = document.createElement("script");
    s.src = this.DATA_URL + "?ts=" + Date.now();
    s.async = true;
    s.onload = function () { self._busy = false; self.markChecked(); cb(null); };
    s.onerror = function () { self._busy = false; cb(new Error("無法載入資料檔 js/data.js")); };
    document.head.appendChild(s);
  },

  /* 資料過期時才重新載入；cb(updated) 表示是否真的更新過 */
  ensureFresh: function (cb) {
    if (!this.isStale() || this.recentlyChecked()) { cb(false); return; }
    var self = this;
    this.load(function (err) { cb(!err && self.ready()); });
  }
};

/* ---------- 空狀態 / 載入中 / 資料時間戳（全站共用） ---------- */
function emptyStateHTML(title, desc, btnId, btnText) {
  return '<div class="card empty-state">' +
    '<div class="empty-icon">◌</div>' +
    '<h3>' + title + "</h3>" +
    (desc ? "<p>" + desc + "</p>" : "") +
    (btnId ? '<button class="btn btn-sm" id="' + btnId + '">' + (btnText || "重新載入") + "</button>" : "") +
    "</div>";
}

function loadingStateHTML(text) {
  return '<div class="card empty-state loading-state">' +
    '<div class="empty-icon spin">◌</div>' +
    "<h3>" + (text || "資料載入中…") + "</h3>" +
    "<p>正在讀取最新行業資訊，請稍候。</p></div>";
}

/* 資料時間戳：讓用戶一眼看到資料是否最新 */
function dataStampHTML(latestDate, count) {
  if (!latestDate) return '<span class="data-stamp stale">資料日期未明</span>';
  var stale = DataLoader.isStale();
  return '<span class="data-stamp' + (stale ? " stale" : "") + '">資料更新至 ' +
    Store.fmtDate(latestDate) + (typeof count === "number" ? "｜共 " + count + " 則" : "") +
    (stale ? "（可能未更新，請按「重新整理資訊」）" : "") + "</span>";
}

/* ---------- 頁首 / 頁尾 ---------- */
function renderChrome(active) {
  var pages = [
    ["index.html", "首頁"],
    ["prices.html", "每日活豬數據"],
    ["news.html", "行業資訊"],
    ["admin.html", "後台管理"]
  ];
  var nav = pages.map(function (p) {
    return '<a href="' + p[0] + '"' + (p[0] === active ? ' class="active"' : '') + '>' + p[1] + "</a>";
  }).join("");

  document.getElementById("site-header").innerHTML =
    '<div class="topbar"><div class="topbar-inner">' +
    '<a class="logo" href="index.html"><span class="mark">' +
    '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v20M4 6l16 12M20 6L4 18M12 6l-3-2M12 6l3-2M12 18l-3 2M12 18l3 2"/></svg>' +
    '</span><span class="logo-text">五豐行情<small>五豐行 NG FUNG HONG</small></span></a>' +
    '<span class="tagline">香港凍肉・水產行業資訊平台｜服務肉檔檔主及凍肉貿易商</span>' +
    "</div></div>" +
    '<nav class="navbar"><div class="navbar-inner">' + nav + "</div></nav>";

  document.getElementById("site-footer").innerHTML =
    '<div class="footer-inner">' +
    "<p><strong>五豐行情</strong>（五豐行旗下資訊平台）｜每日活豬數據來源：<a href='https://www.fehd.gov.hk/tc_chi/sh/data/supply_tw.html' target='_blank'>香港食物環境衞生署</a></p>" +
    '<p>訂貨詳情請聯繫：WhatsApp：<a href="https://wa.me/8618825146113" target="_blank" rel="noopener">+86 18825146113</a>｜郵件：<a href="mailto:zhangkailiang12@nfh.hk">zhangkailiang12@nfh.hk</a></p>' +
    '<p class="disclaimer">免責聲明：本網站所載資料按「現狀」提供，僅作一般參考用途，並不構成任何投資或採購建議。活豬拍賣價以食物環境衞生署公佈為準。</p>' +
    "</div>";
}

/* ---------- 原文鏈接有效性檢測（降級處理） ---------- */
/* 404/5xx → 標記為失效並改為純文字；網絡/CORS 錯誤 → 保留鏈接但標示「未能預先驗證」 */
function checkSourceLinks() {
  if (!window.fetch) return;
  document.querySelectorAll("a.source-link[data-check]").forEach(function (a) {
    fetch(a.href, { method: "HEAD", mode: "cors", cache: "no-store" }).then(function (r) {
      if (r.status >= 400) markDead(a);
    }).catch(function () {
      a.title = "未能預先驗證連結，點擊後如無法開啟，可能是原文已移除。";
      a.classList.add("unverified");
    });
  });
  function markDead(a) {
    var span = document.createElement("span");
    span.className = "source-dead";
    span.textContent = a.textContent + "（原文連結已失效）";
    a.parentNode.replaceChild(span, a);
  }
}

/* ---------- 升跌標示 ---------- */
function changeBadge(today, yesterday) {
  var diff = today - yesterday;
  if (diff > 0) return '<span class="up">▲ 加 $' + diff + "</span>";
  if (diff < 0) return '<span class="down">▼ 跌 $' + Math.abs(diff) + "</span>";
  return '<span class="flat">— 持平</span>';
}

/* ---------- 載入 scraper 每日更新的活豬數據（如有） ---------- */
/* scraper/fetch_pigs.py 每日輸出 js/pig_daily.json；載入成功後觸發 "pigdata" 事件 */
(function () {
  if (!window.fetch) return;
  fetch("js/pig_daily.json", { cache: "no-store" }).then(function (r) {
    if (!r.ok) return null;
    return r.json();
  }).then(function (rows) {
    if (!rows || !rows.length) return;
    rows.forEach(function (row) {
      var idx = -1;
      SITE_DATA.pig.forEach(function (r, i) { if (r.date === row.date) idx = i; });
      var clean = { date: row.date, mainland: row.mainland, local: row.local,
        total: row.total, high: row.high, low: row.low, avg: row.avg };
      if (idx >= 0) SITE_DATA.pig[idx] = Object.assign({}, SITE_DATA.pig[idx], clean);
      else SITE_DATA.pig.push(clean);
      if (row.forecast) {
        var d = new Date(row.date); d.setDate(d.getDate() + 1);
        SITE_DATA.pigForecast = { date: d.toISOString().slice(0, 10),
          mainland: row.forecast.mainland, local: row.forecast.local, total: row.forecast.total };
      }
    });
    SITE_DATA.pig.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    document.dispatchEvent(new CustomEvent("pigdata"));
  }).catch(function () { /* 離線或 file:// 開啟時靜默略過 */ });
})();
