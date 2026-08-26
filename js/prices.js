/* 每日活豬數據頁 */
renderChrome("prices.html");

var PIG = Store.getPig();

/* ---------- 今日 / 明日數據 ---------- */
function renderToday() {
  PIG = Store.getPig();
  var LATEST = PIG[PIG.length - 1];
  var PREV = PIG[PIG.length - 2];
  document.getElementById("today-stats").innerHTML =
    stat("供應總數", Store.num(LATEST.total), "頭（內地 " + Store.num(LATEST.mainland) + "／本地 " + Store.num(LATEST.local) + "）", true) +
    stat("拍賣均價", "$" + Store.num(LATEST.avg), "每擔｜" + stripTags(changeBadge(LATEST.avg, PREV.avg)), true) +
    stat("最高價", "$" + Store.num(LATEST.high), "每擔（黑毛豬）", false) +
    stat("最低價", "$" + Store.num(LATEST.low), "每擔", false);
  document.getElementById("today-note").textContent =
    "日期：" + Store.fmtDate(LATEST.date) + (LATEST.note ? "｜" + LATEST.note : "");

  var f = SITE_DATA.pigForecast;
  document.getElementById("forecast-stats").innerHTML =
    stat("內地進口", Store.num(f.mainland), "頭", false) +
    stat("本地", Store.num(f.local), "頭", false) +
    stat("預計總數", Store.num(f.total), "頭（" + Store.fmtDate(f.date) + "）", true);

  function stat(label, value, unit, hl) {
    return '<div class="stat' + (hl ? " highlight" : "") + '">' +
      '<div class="label">' + label + '</div>' +
      '<div class="value">' + value + '</div>' +
      '<div class="unit">' + unit + "</div></div>";
  }
  function stripTags(h) { var d = document.createElement("div"); d.innerHTML = h; return d.textContent; }
}
renderToday();

/* scraper 數據載入完成後重新渲染 */
document.addEventListener("pigdata", function () {
  renderToday();
  renderChart();
  renderTable();
});

/* ---------- 走勢圖（純 SVG，無外部依賴） ---------- */
var rangeDays = 30;

function renderChart() {
  var rows = PIG.slice(-rangeDays);
  var W = 1000, H = 380, padL = 70, padR = 20, padT = 20, padB = 50;
  var iw = W - padL - padR, ih = H - padT - padB;

  var vals = [];
  rows.forEach(function (r) { vals.push(r.avg, r.high, r.low); });
  var min = Math.floor(Math.min.apply(null, vals) / 100) * 100 - 50;
  var max = Math.ceil(Math.max.apply(null, vals) / 100) * 100 + 50;

  function x(i) { return padL + iw * (i / (rows.length - 1)); }
  function y(v) { return padT + ih * (1 - (v - min) / (max - min)); }
  function path(key) {
    return rows.map(function (r, i) {
      return (i === 0 ? "M" : "L") + x(i).toFixed(1) + "," + y(r[key]).toFixed(1);
    }).join(" ");
  }

  var grid = "";
  var step = (max - min) / 5;
  for (var g = 0; g <= 5; g++) {
    var v = min + step * g;
    grid += '<line x1="' + padL + '" y1="' + y(v) + '" x2="' + (W - padR) + '" y2="' + y(v) + '" stroke="#d4e4ef" stroke-width="1"/>' +
      '<text x="' + (padL - 10) + '" y="' + (y(v) + 6) + '" text-anchor="end" font-size="16" fill="#666">$' + Math.round(v) + "</text>";
  }
  var labels = "";
  var labEvery = Math.ceil(rows.length / 8);
  rows.forEach(function (r, i) {
    if (i % labEvery === 0 || i === rows.length - 1) {
      labels += '<text x="' + x(i) + '" y="' + (H - padB + 30) + '" text-anchor="middle" font-size="15" fill="#666">' +
        r.date.slice(5).replace("-", "/") + "</text>";
    }
  });
  var dots = rows.map(function (r, i) {
    return '<circle cx="' + x(i) + '" cy="' + y(r.avg) + '" r="4" fill="#0e6ba8"><title>' +
      Store.fmtDate(r.date) + " 均價 $" + r.avg + "（高 $" + r.high + "／低 $" + r.low + "）</title></circle>";
  }).join("");

  document.getElementById("chart").innerHTML =
    '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" role="img" aria-label="拍賣均價走勢圖">' + grid +
    '<path d="' + path("high") + '" fill="none" stroke="#9db8c9" stroke-width="2" stroke-dasharray="6,4"/>' +
    '<path d="' + path("low") + '" fill="none" stroke="#c3d5e2" stroke-width="2" stroke-dasharray="6,4"/>' +
    '<path d="' + path("avg") + '" fill="none" stroke="#0e6ba8" stroke-width="4" stroke-linejoin="round"/>' +
    labels + dots + "</svg>";
}

document.getElementById("range-bar").addEventListener("click", function (e) {
  if (e.target.tagName !== "BUTTON") return;
  this.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("on"); });
  e.target.classList.add("on");
  rangeDays = parseInt(e.target.dataset.days, 10);
  renderChart();
});
renderChart();

/* ---------- 歷史數據表 ---------- */
function renderTable() {
  var q = document.getElementById("q-date").value.trim();
  var rows = PIG.slice().reverse();
  if (q) {
    rows = rows.filter(function (r) {
      var disp = Store.fmtDate(r.date); // dd/mm/yyyy
      return disp.indexOf(q) >= 0 || r.date.indexOf(q) >= 0;
    });
  }
  var html = rows.map(function (r, i) {
    var prev = PIG[PIG.indexOf(r) - 1];
    var chg = prev ? changeBadge(r.avg, prev.avg) : '<span class="flat">—</span>';
    return "<tr><td><strong>" + Store.fmtDate(r.date) + "</strong></td><td>" + Store.num(r.mainland) +
      "</td><td>" + Store.num(r.local) + "</td><td>" + Store.num(r.total) +
      "</td><td>$" + Store.num(r.high) + "</td><td>$" + Store.num(r.low) +
      '</td><td><strong>$' + Store.num(r.avg) + "</strong></td><td>" + chg + "</td></tr>";
  }).join("");
  document.getElementById("history-body").innerHTML =
    html || '<tr><td colspan="8" style="padding:30px;">找不到符合「' + q + "」的記錄</td></tr>";
}
function resetTable() { document.getElementById("q-date").value = ""; renderTable(); }
renderTable();
