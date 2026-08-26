/* 首頁 */
renderChrome("index.html");

function renderHomeStats() {
var PIG = Store.getPig();
var LATEST = PIG[PIG.length - 1];
var PREV = PIG[PIG.length - 2];
var FC = SITE_DATA.pigForecast;

document.getElementById("home-stats").innerHTML =
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
renderHomeStats();
document.addEventListener("pigdata", renderHomeStats);

/* 最新 5 則資訊 */
document.getElementById("home-news").innerHTML = Store.getNews().slice(0, 5).map(function (n) {
  return '<a class="news-item" href="news.html" style="padding:12px 14px;margin-bottom:10px;">' +
    '<div class="meta"><span class="badge badge-red">' + n.category + "</span><span>" + Store.fmtDate(n.date) + "</span></div>" +
    "<h3 style='font-size:.95rem;'>" + n.title + "</h3></a>";
}).join("");

/* 最新 3 篇分析 */
document.getElementById("home-analysis").innerHTML = Store.getAnalysis().slice(0, 3).map(function (a) {
  return '<a class="news-item" href="news.html" style="padding:12px 14px;margin-bottom:10px;border-left:6px solid #0e6ba8;">' +
    '<div class="meta"><span class="badge badge-gold">' + a.type + "</span><span>" + Store.fmtDate(a.date) + "</span></div>" +
    "<h3 style='font-size:.95rem;'>" + a.title + "</h3>" +
    "<p style='font-size:.8rem;'>" + a.summary + "</p></a>";
}).join("");
