/* 行業資訊頁 */
renderChrome("news.html");

var NEWS = Store.getNews();
var CATS = Store.getCategories();
var curCat = "全部";
var curQ = "";

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
  var rows = NEWS.filter(function (n) {
    var okCat = curCat === "全部" || n.category === curCat;
    var okQ = !curQ || (n.title + n.summary + n.content + n.region + n.source).indexOf(curQ) >= 0;
    return okCat && okQ;
  });
  document.getElementById("result-count").textContent =
    "共 " + rows.length + " 則資訊" + (curCat !== "全部" ? "｜分類：" + curCat : "") + (curQ ? "｜關鍵字：" + curQ : "");

  document.getElementById("news-list").innerHTML = rows.map(function (n) {
    var badge = CAT_BADGE[n.category] || "badge-grey";
    return '<div class="news-item" onclick="toggleNews(this)">' +
      '<div class="meta"><span class="badge ' + badge + '">' + n.category + "</span>" +
      "<span>" + n.region + "</span><span>｜</span>" +
      "<span>" + Store.fmtDate(n.date) + "</span></div>" +
      "<h3>" + n.title + "</h3>" +
      sourceBlock(n) +
      "<p>" + n.summary + "</p>" +
      '<div class="analysis-body">' + String(n.content).replace(/\n/g, "<br>") + analysisBlock(n.id) + "</div>" +
      '<span class="toggle-btn">閱讀全文 ▼</span></div>';
  }).join("") || '<div class="card" style="text-align:center;padding:40px;">找不到相關資訊，請嘗試其他關鍵字或分類。</div>';

  checkSourceLinks();
}

function toggleNews(el) {
  el.classList.toggle("open");
  var btn = el.querySelector(":scope > .toggle-btn");
  btn.textContent = el.classList.contains("open") ? "收起 ▲" : "閱讀全文 ▼";
}

document.getElementById("btn-search").addEventListener("click", function () {
  curQ = document.getElementById("q").value.trim();
  renderList();
});
document.getElementById("q").addEventListener("keydown", function (e) {
  if (e.key === "Enter") { curQ = this.value.trim(); renderList(); }
});

renderCatBar();
renderList();

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
