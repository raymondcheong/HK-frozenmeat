/* =====================================================
   行業資訊頁
   功能：分類/搜尋篩選、發布時間倒序、手動刷新（載入狀態＋
   錯誤重試）、已讀標記（跨刷新保留）、過期緩存清理
   ===================================================== */
renderChrome("news.html");

var NEWS = Store.getNews();
var CATS = Store.getCategories();
var curCat = "全部";
var curQ = "";

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
  /* Store.getNews() 已按發布日期倒序；同日期以 id 遞減，確保最新條目優先 */
  var rows = NEWS.filter(function (n) {
    var okCat = curCat === "全部" || n.category === curCat;
    var okQ = !curQ || (n.title + n.summary + n.content + n.region + n.source).indexOf(curQ) >= 0;
    return okCat && okQ;
  });
  document.getElementById("result-count").textContent =
    "共 " + rows.length + " 則資訊" + (curCat !== "全部" ? "｜分類：" + curCat : "") + (curQ ? "｜關鍵字：" + curQ : "");

  var unread = 0;
  var html = rows.map(function (n) {
    var badge = CAT_BADGE[n.category] || "badge-grey";
    var isRead = ReadStore.has(n.id);
    if (!isRead) unread++;
    return '<div class="news-item' + (isRead ? " read" : "") + '" data-id="' + n.id + '" onclick="toggleNews(this)">' +
      '<div class="meta"><span class="badge ' + badge + '">' + n.category + "</span>" +
      "<span>" + n.region + "</span><span>｜</span>" +
      "<span>發佈：" + Store.fmtDate(n.date) + "</span>" +
      (isRead ? '<span class="badge badge-read">已讀</span>' : "") + "</div>" +
      "<h3>" + n.title + "</h3>" +
      sourceBlock(n) +
      "<p>" + n.summary + "</p>" +
      '<div class="analysis-body">' + String(n.content).replace(/\n/g, "<br>") + analysisBlock(n.id) + "</div>" +
      '<span class="toggle-btn">閱讀全文 ▼</span></div>';
  }).join("") || '<div class="card" style="text-align:center;padding:40px;">找不到相關資訊，請嘗試其他關鍵字或分類。</div>';

  document.getElementById("news-list").innerHTML = html;
  document.getElementById("unread-count").textContent =
    unread > 0 ? "未讀 " + unread + " 則" : "全部已讀";

  checkSourceLinks();
}

function toggleNews(el) {
  el.classList.toggle("open");
  var btn = el.querySelector(":scope > .toggle-btn");
  btn.textContent = el.classList.contains("open") ? "收起 ▲" : "閱讀全文 ▼";
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

function showRefreshStatus(fresh) {
  var t = fmtRefreshTime(RefreshMeta.get());
  document.getElementById("refresh-status").textContent =
    t ? "最後更新：" + t : "";
}

function refreshNews() {
  if (!window.fetch) {
    showError("此瀏覽器不支援即時更新，請重新載入頁面。");
    return;
  }
  setLoading(true);
  hideError();
  /* cache-busting + no-store：強制越過 HTTP 緩存取最新 data.js */
  fetch("js/data.js?ts=" + Date.now(), { cache: "no-store" }).then(function (r) {
    if (!r.ok) throw new Error("伺服器回應 " + r.status);
    return r.text();
  }).then(function (code) {
    /* 重新執行數據文件，更新 SITE_DATA */
    new Function(code)();
    if (!window.SITE_DATA || !SITE_DATA.news || !SITE_DATA.news.length) {
      throw new Error("資料格式異常");
    }
    NEWS = Store.getNews();
    CATS = Store.getCategories();
    /* 清除過期緩存：剔除已下架資訊的已讀記錄，避免殘留舊內容 */
    ReadStore.prune(NEWS.map(function (n) { return n.id; }));
    RefreshMeta.save();
    renderCatBar();
    renderList();
    showRefreshStatus(true);
    setLoading(false);
  }).catch(function (err) {
    setLoading(false);
    showError("資訊更新失敗：" + err.message + "。請檢查網絡連線後按「重試」。");
  });
}

document.getElementById("btn-refresh").addEventListener("click", refreshNews);
document.getElementById("btn-retry").addEventListener("click", refreshNews);

/* ---------- 搜尋 ---------- */
document.getElementById("btn-search").addEventListener("click", function () {
  curQ = document.getElementById("q").value.trim();
  renderList();
});
document.getElementById("q").addEventListener("keydown", function (e) {
  if (e.key === "Enter") { curQ = this.value.trim(); renderList(); }
});

renderCatBar();
renderList();
showRefreshStatus(false);

/* ---------- 新聞來源清單（結構化渲染） ---------- */
(function () {
  if (!window.NEWS_SOURCE_REGISTRY) return;
  var REGIONS = ["香港", "中國內地", "南美洲", "北美洲", "歐洲"];
  var body = document.getElementById("sources-body");

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
