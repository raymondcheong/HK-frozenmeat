/* =====================================================
   行業資訊頁
   功能：分類/搜尋/地區篩選、發布時間倒序、分頁載入、
   容錯載入（資料檔失敗可重試）、資料時間戳、已讀標記
   ===================================================== */
renderChrome("news.html");

var NEWS = [];
var CATS = [];
var curCat = "全部";
var curQ = "";
var curRegion = "全部";
var PAGE_SIZE = 20;   /* 每頁顯示則數：避免一次渲染全部條目（含大量連結檢測）拖慢手機 */
var shown = PAGE_SIZE;

/* ---------- 已讀狀態（localStorage 持久保存，刷新不清除） ---------- */
var ReadStore = {
  KEY: "hkmeat_read_news_v1",
  get: function () {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
    catch (e) { return []; }
  },
  has: function (id) { return this.get().indexOf(id) >= 0; },
  mark: function (id) {
    var a = this.get();
    if (a.indexOf(id) < 0) {
      a.push(id);
      try { localStorage.setItem(this.KEY, JSON.stringify(a)); } catch (e) {}
    }
  },
  /* 清除已不存在資訊的已讀記錄（過期緩存清理） */
  prune: function (validIds) {
    var a = this.get().filter(function (id) { return validIds.indexOf(id) >= 0; });
    try { localStorage.setItem(this.KEY, JSON.stringify(a)); } catch (e) {}
  }
};

/* ---------- 刷新時間戳 ---------- */
var RefreshMeta = {
  KEY: "hkmeat_news_refreshed_v1",
  save: function () {
    try { localStorage.setItem(this.KEY, new Date().toISOString()); } catch (e) {}
  },
  get: function () {
    try { return localStorage.getItem(this.KEY); } catch (e) { return null; }
  }
};

function fmtRefreshTime(iso) {
  if (!iso) return "";
  var d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear() +
    " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

/* ---------- 地區篩選（內地新聞／國際新聞分頁） ---------- */
var REGIONS = [
  { key: "全部", label: "全部地區" },
  { key: "內地新聞", label: "內地新聞" },
  { key: "國際新聞", label: "國際新聞" }
];
function regionOf(n) { return n.region === "國際" ? "國際新聞" : "內地新聞"; }
function renderRegionBar() {
  document.getElementById("region-bar").innerHTML = REGIONS.map(function (r) {
    return '<button class="chip' + (r.key === curRegion ? " on" : "") + '" data-region="' + r.key + '">' + r.label + "</button>";
  }).join("");
}
document.getElementById("region-bar").addEventListener("click", function (e) {
  if (e.target.tagName !== "BUTTON") return;
  curRegion = e.target.dataset.region;
  shown = PAGE_SIZE;
  renderRegionBar();
  renderList();
});

/* ---------- 分類按鈕 ---------- */
function renderCatBar() {
  var all = ["全部"].concat(CATS);
  document.getElementById("cat-bar").innerHTML = all.map(function (c) {
    return '<button class="chip' + (c === curCat ? " on" : "") + '" data-cat="' + c + '">' + c + "</button>";
  }).join("");
}
document.getElementById("cat-bar").addEventListener("click", function (e) {
  if (e.target.tagName !== "BUTTON") return;
  curCat = e.target.dataset.cat;
  shown = PAGE_SIZE;
  renderCatBar();
  renderList();
});

/* ---------- 列表 ---------- */
var CAT_BADGE = {
  "價格行情": "badge-red", "政策法規": "badge-blue", "關稅動態": "badge-gold",
  "供應變化": "badge-green", "新技術應用": "badge-grey"
};

function sourceBlock(n) {
  var link = n.sourceUrl
    ? '<a class="source-link" data-check href="' + n.sourceUrl + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">查看原文 ↗</a>'
    : '<span class="source-dead">原文連結暫缺</span>';
  return '<div class="source-line">資料來源：<strong>' + (n.source || "本站") + "</strong>｜" + link + "</div>";
}

/* 嵌入對應資訊下方的市場影響分析子區塊 */
function analysisBlock(newsId) {
  var related = Store.getAnalysis().filter(function (a) { return a.newsId === newsId; });
  if (!related.length) return "";
  return related.map(function (a) {
    return '<div class="related-analysis">' +
      '<div class="ra-head">相關市場影響分析' +
      '<span class="badge badge-gold">' + a.type + "</span>" +
      '<span class="ra-date">' + Store.fmtDate(a.date) + "</span></div>" +
      "<h4>" + a.title + "</h4>" +
      '<div class="impact"><strong>影響評估：</strong>' + a.impact + "</div>" +
      '<div class="analysis-body">' + String(a.content).replace(/\n/g, "<br>") + "</div>" +
      '<span class="toggle-btn" onclick="event.stopPropagation();toggleSubAnalysis(this)">閱讀分析全文 ▼</span></div>';
  }).join("");
}

function toggleSubAnalysis(btn) {
  var box = btn.parentElement;
  box.classList.toggle("open");
  btn.textContent = box.classList.contains("open") ? "收起分析 ▲" : "閱讀分析全文 ▼";
}

function renderList() {
  var listBox = document.getElementById("news-list");
  var countBox = document.getElementById("result-count");

  /* 情況一：完全沒有資料（載入失敗或資料檔為空）→ 明確空狀態，不留白 */
  if (!NEWS.length) {
    countBox.innerHTML = dataStampHTML(null, 0);
    listBox.innerHTML = emptyStateHTML(
      "暫未載入任何資訊",
      "可能是網絡連線問題或資料檔未更新。請按下方按鈕重新載入，或稍後再試。",
      "btn-empty-retry", "重新載入資訊");
    var rb = document.getElementById("btn-empty-retry");
    if (rb) rb.addEventListener("click", refreshNews);
    return;
  }

  /* Store.getNews() 已按發布日期倒序；同日期以 id 遞減，確保最新條目優先 */
  var rows = NEWS.filter(function (n) {
    var okRegion = curRegion === "全部" || regionOf(n) === curRegion;
    var okCat = curCat === "全部" || n.category === curCat;
    var okQ = !curQ || (n.title + n.summary + n.content + n.region + n.source).indexOf(curQ) >= 0;
    return okRegion && okCat && okQ;
  });

  countBox.innerHTML = dataStampHTML(DataLoader.latestNewsDate(), NEWS.length) +
    '<span class="result-detail">篩選結果 ' + rows.length + " 則" +
    (curRegion !== "全部" ? "｜" + curRegion : "") +
    (curCat !== "全部" ? "｜" + curCat : "") +
    (curQ ? "｜關鍵字：" + curQ : "") +
    (rows.length > shown ? "｜已顯示最新 " + shown + " 則" : "") + "</span>";

  /* 情況二：有資料但篩選無結果 → 引導調整條件 */
  if (!rows.length) {
    listBox.innerHTML = emptyStateHTML(
      "找不到符合條件的資訊",
      "請嘗試其他關鍵字，或將地區／分類切換回「全部」。",
      "btn-clear-filter", "清除篩選條件");
    var cb = document.getElementById("btn-clear-filter");
    if (cb) cb.addEventListener("click", function () {
      curQ = ""; curCat = "全部"; curRegion = "全部"; shown = PAGE_SIZE;
      document.getElementById("q").value = "";
      renderRegionBar(); renderCatBar(); renderList();
    });
    return;
  }

  var unread = 0;
  var html = rows.slice(0, shown).map(function (n) {
    var badge = CAT_BADGE[n.category] || "badge-grey";
    var isRead = ReadStore.has(n.id);
    if (!isRead) unread++;
    return '<div class="news-item' + (isRead ? " read" : "") + '" data-id="' + n.id + '" onclick="toggleNews(this)">' +
      '<div class="meta"><span class="badge ' + badge + '">' + n.category + "</span>" +
      '<span class="badge badge-region">' + n.region + "</span>" +
      "<span>發佈：" + Store.fmtDate(n.date) + "</span>" +
      (isRead ? '<span class="badge badge-read">已讀</span>' : "") + "</div>" +
      "<h3>" + n.title + "</h3>" +
      sourceBlock(n) +
      "<p>" + n.summary + "</p>" +
      '<div class="analysis-body">' + String(n.content).replace(/\n/g, "<br>") + analysisBlock(n.id) + "</div>" +
      '<span class="toggle-btn">閱讀全文 ▼</span></div>';
  }).join("");

  if (rows.length > shown) {
    html += '<div class="load-more-wrap"><button class="btn btn-gold" id="btn-more">載入更多（尚有 ' +
      (rows.length - shown) + " 則）</button></div>";
  }

  listBox.innerHTML = html;

  var more = document.getElementById("btn-more");
  if (more) more.addEventListener("click", function () {
    shown += PAGE_SIZE;
    renderList();
    var anchor = document.getElementById("btn-more");
    if (anchor) anchor.scrollIntoView({ block: "center" });
  });

  document.getElementById("unread-count").textContent =
    unread > 0 ? "未讀 " + unread + " 則" : "全部已讀";

  /* 只檢測已渲染的連結，避免一次發出上百個請求拖慢頁面 */
  checkSourceLinks();
}

function toggleNews(el) {
  el.classList.toggle("open");
  /* 不用 :scope（部分舊版流動瀏覽器不支援），改為只取直接子節點 */
  var btn = null;
  for (var i = 0; i < el.children.length; i++) {
    if (el.children[i].className && el.children[i].className.indexOf("toggle-btn") >= 0) {
      btn = el.children[i];
      break;
    }
  }
  if (btn) btn.textContent = el.classList.contains("open") ? "收起 ▲" : "閱讀全文 ▼";
  /* 展開閱讀即標記已讀（狀態保存於 localStorage，刷新後保留） */
  if (el.classList.contains("open")) {
    var id = el.getAttribute("data-id");
    if (id && !ReadStore.has(id)) {
      ReadStore.mark(id);
      el.classList.add("read");
      var meta = el.querySelector(".meta");
      if (meta) meta.insertAdjacentHTML("beforeend", '<span class="badge badge-read">已讀</span>');
      updateUnreadCount();
    }
  }
}

function updateUnreadCount() {
  var unread = NEWS.filter(function (n) { return !ReadStore.has(n.id); }).length;
  document.getElementById("unread-count").textContent =
    unread > 0 ? "未讀 " + unread + " 則" : "全部已讀";
}

/* ---------- 手動刷新 ---------- */
function setLoading(on) {
  var btn = document.getElementById("btn-refresh");
  btn.disabled = on;
  btn.classList.toggle("loading", on);
  btn.textContent = on ? "更新中…" : "重新整理資訊";
}

function showError(msg) {
  var box = document.getElementById("news-error");
  document.getElementById("news-error-msg").textContent = msg;
  box.style.display = "flex";
}
function hideError() {
  document.getElementById("news-error").style.display = "none";
}

function showRefreshStatus() {
  var latest = DataLoader.latestNewsDate();
  var t = fmtRefreshTime(RefreshMeta.get());
  var parts = [];
  if (latest) parts.push("資料日期 " + Store.fmtDate(latest));
  if (t) parts.push("最後檢查 " + t);
  document.getElementById("refresh-status").textContent = parts.join("｜");
}

function refreshNews() {
  if (!window.fetch && !document.createElement) {
    showError("此瀏覽器不支援即時更新，請重新載入頁面。");
    return;
  }
  setLoading(true);
  hideError();
  /* 以 <script> 重新載入 data.js 並加時間戳，強制越過 HTTP 快取 */
  DataLoader.load(function (err) {
    setLoading(false);
    if (err || !DataLoader.ready()) {
      showError("資訊更新失敗：" + (err ? err.message : "資料格式異常") + "。請檢查網絡連線後按「重試」。");
      return;
    }
    NEWS = Store.getNews();
    CATS = Store.getCategories();
    shown = PAGE_SIZE;
    ReadStore.prune(NEWS.map(function (n) { return n.id; }));
    RefreshMeta.save();
    renderRegionBar();
    renderCatBar();
    renderList();
    showRefreshStatus();
  });
}

document.getElementById("btn-refresh").addEventListener("click", refreshNews);
document.getElementById("btn-retry").addEventListener("click", refreshNews);

/* ---------- 搜尋 ---------- */
document.getElementById("btn-search").addEventListener("click", function () {
  curQ = document.getElementById("q").value.trim();
  shown = PAGE_SIZE;
  renderList();
});
document.getElementById("q").addEventListener("keydown", function (e) {
  if (e.key === "Enter") { curQ = this.value.trim(); shown = PAGE_SIZE; renderList(); }
});

/* ---------- 啟動：先確認資料就緒，未就緒則自動補載 ---------- */
(function boot() {
  var listBox = document.getElementById("news-list");

  function paint() {
    NEWS = Store.getNews();
    CATS = Store.getCategories();
    renderRegionBar();
    renderCatBar();
    renderList();
    showRefreshStatus();
  }

  if (DataLoader.ready()) {
    paint();
    RefreshMeta.save();
    /* 資料落後於今日 → 背景靜默更新一次（例如瀏覽器快取了昨日的 data.js） */
    DataLoader.ensureFresh(function (updated) {
      if (!updated) return;
      NEWS = Store.getNews();
      CATS = Store.getCategories();
      shown = PAGE_SIZE;
      renderRegionBar();
      renderCatBar();
      renderList();
      showRefreshStatus();
    });
    return;
  }

  /* 首次載入失敗（SITE_DATA 不存在）→ 顯示載入中並自動重試一次 */
  listBox.innerHTML = loadingStateHTML("正在載入最新資訊…");
  document.getElementById("result-count").innerHTML = "";
  DataLoader.load(function (err) {
    if (err || !DataLoader.ready()) {
      NEWS = []; CATS = [];
      renderList();
      showError("資料檔載入失敗：" + (err ? err.message : "內容為空") + "。請按「重試」重新載入。");
      return;
    }
    paint();
    RefreshMeta.save();
  });
})();

/* ---------- 新聞來源清單（結構化渲染） ---------- */
(function () {
  if (!window.NEWS_SOURCE_REGISTRY) return;
  var REGIONS = ["香港", "中國內地", "南美洲", "北美洲", "歐洲"];
  var body = document.getElementById("sources-body");
  if (!body) return;

  body.innerHTML =
    '<p style="font-size:.82rem;color:#666;margin-bottom:14px;">每日采編任務按此清單選材。非中文來源已標示原文語言，引用時譯為繁體中文並註明原始出處。</p>' +
    REGIONS.map(function (r) {
      var items = NEWS_SOURCE_REGISTRY.filter(function (s) { return s.region === r; });
      if (!items.length) return "";
      return '<div class="src-region"><h3>' + r + '</h3>' +
        items.map(function (s) {
          return '<div class="src-item">' +
            '<div class="src-name"><a href="' + s.url + '" target="_blank" rel="noopener noreferrer">' + s.name + " ↗</a>" +
            (s.status === "new" ? '<span class="badge badge-green" style="margin-left:8px;">新增</span>' : "") + "</div>" +
            '<div class="src-meta">' +
            '<span class="badge badge-blue">' + s.tier + "</span>" +
            '<span class="badge badge-grey">' + s.language + "</span>" +
            '<span class="badge badge-gold">' + s.freq + "</span></div>" +
            '<div class="src-fields">' + s.fields + "</div></div>";
        }).join("") + "</div>";
    }).join("");

  document.getElementById("sources-toggle").addEventListener("click", function () {
    var open = body.style.display !== "none";
    body.style.display = open ? "none" : "block";
    document.getElementById("sources-arrow").textContent = open ? "展開 ▼" : "收起 ▲";
  });
})();
