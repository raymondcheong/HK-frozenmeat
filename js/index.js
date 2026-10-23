/* 首頁 */
renderChrome("index.html");

function renderHomeStats() {
  var box = document.getElementById("home-stats");
  var PIG = Store.getPig();
  var FC = (window.SITE_DATA && window.SITE_DATA.pigForecast) || null;

  if (!PIG.length || !FC) {
    box.innerHTML = '<div class="stat"><div class="label">活豬數據</div>' +
      '<div class="value" style="font-size:1.1rem;">暫未載入</div>' +
      '<div class="unit">請稍後重新整理</div></div>';
    document.getElementById("home-date").textContent = "";
    return;
  }

  var LATEST = PIG[PIG.length - 1];
  var PREV = PIG.length > 1 ? PIG[PIG.length - 2] : LATEST;

  box.innerHTML =
    '<div class="stat highlight"><div class="label">今日拍賣均價（每擔）</div>' +
    '<div class="value">$' + Store.num(LATEST.avg) + "</div>" +
    '<div class="unit">' + changeBadge(LATEST.avg, PREV.avg) + "</div></div>" +
    '<div class="stat"><div class="label">今日供應總數</div>' +
    '<div class="value">' + Store.num(LATEST.total) + "</div>" +
    '<div class="unit">頭（內地 ' + Store.num(LATEST.mainland) + "／本地 " + Store.num(LATEST.local) + "）</div></div>" +
    '<div class="stat"><div class="label">最高／最低價</div>' +
    '<div class="value" style="font-size:1.3rem;">$' + Store.num(LATEST.high) + " / $" + Store.num(LATEST.low) + "</div>" +
    '<div class="unit">每擔｜最高價屬黑毛豬</div></div>' +
    '<div class="stat highlight"><div class="label">明日預計供應</div>' +
    '<div class="value">' + Store.num(FC.total) + "</div>" +
    '<div class="unit">頭（' + Store.fmtDate(FC.date) + "）</div></div>";
  document.getElementById("home-date").textContent = "更新日期：" + Store.fmtDate(LATEST.date);
}

/* 最新 5 則資訊（含資料時間戳與空狀態） */
function renderHomeNews() {
  var box = document.getElementById("home-news");
  var NEWS = Store.getNews();

  if (!NEWS.length) {
    box.innerHTML = emptyStateHTML(
      "暫未載入行業資訊",
      "資料檔可能未更新或網絡連線中斷。",
      "btn-home-reload", "重新載入資訊");
    var btn = document.getElementById("btn-home-reload");
    if (btn) btn.addEventListener("click", function () {
      box.innerHTML = loadingStateHTML("正在載入最新資訊…");
      DataLoader.load(function (err) {
        if (err || !DataLoader.ready()) {
          box.innerHTML = emptyStateHTML("載入失敗", "請檢查網絡連線後再試。", "btn-home-reload", "重新載入資訊");
          var b2 = document.getElementById("btn-home-reload");
          if (b2) b2.addEventListener("click", renderHomeNews);
          return;
        }
        renderHomeStats();
        renderHomeNews();
      });
    });
    return;
  }

  box.innerHTML =
    '<div class="data-line">' + dataStampHTML(DataLoader.latestNewsDate(), NEWS.length) + "</div>" +
    NEWS.slice(0, 5).map(function (n) {
      return '<a class="news-item" href="news.html" style="padding:12px 14px;margin-bottom:10px;">' +
        '<div class="meta"><span class="badge badge-red">' + n.category + "</span><span>" + Store.fmtDate(n.date) + "</span></div>" +
        "<h3 style='font-size:.95rem;'>" + n.title + "</h3></a>";
    }).join("");
}

/* 最新 3 篇分析 */
function renderHomeAnalysis() {
  var box = document.getElementById("home-analysis");
  var rows = Store.getAnalysis();
  if (!rows.length) {
    box.innerHTML = '<p style="font-size:.9rem;color:var(--ink-soft);">暫無分析文章。</p>';
    return;
  }
  box.innerHTML = rows.slice(0, 3).map(function (a) {
    return '<a class="news-item" href="news.html" style="padding:12px 14px;margin-bottom:10px;border-left:6px solid #0e6ba8;">' +
      '<div class="meta"><span class="badge badge-gold">' + a.type + "</span><span>" + Store.fmtDate(a.date) + "</span></div>" +
      "<h3 style='font-size:.95rem;'>" + a.title + "</h3>" +
      "<p style='font-size:.8rem;'>" + a.summary + "</p></a>";
  }).join("");
}

function renderHome() {
  renderHomeStats();
  renderHomeNews();
  renderHomeAnalysis();
}

renderHome();
document.addEventListener("pigdata", renderHomeStats);

/* 資料落後於今日 → 背景靜默更新一次（避免瀏覽器快取昨日資料） */
DataLoader.ensureFresh(function (updated) {
  if (updated) renderHome();
});
