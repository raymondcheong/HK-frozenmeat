/* 後台管理（localStorage 示範版 CMS） */
renderChrome("admin.html");

var PWD = "admin123"; // 示範密碼；正式部署請改用伺服器端驗證
var authed = sessionStorage.getItem("hkmeat_admin") === "1";

function $(id) { return document.getElementById(id); }
function notice(msg, isErr) {
  var n = $("admin-notice");
  n.textContent = msg;
  n.className = "notice" + (isErr ? " err" : "");
  n.style.display = "block";
  clearTimeout(notice._t);
  notice._t = setTimeout(function () { n.style.display = "none"; }, 4000);
}

/* ---------- 登入 ---------- */
function doLogin() {
  if ($("pwd").value === PWD) {
    sessionStorage.setItem("hkmeat_admin", "1");
    showPanel();
  } else {
    var n = $("login-notice");
    n.textContent = "密碼錯誤，請重試。";
    n.className = "notice err";
    n.style.display = "block";
  }
}
function doLogout() {
  sessionStorage.removeItem("hkmeat_admin");
  location.reload();
}
function showPanel() {
  $("login-panel").style.display = "none";
  $("admin-panel").style.display = "block";
  initPanel();
}
$("pwd").addEventListener("keydown", function (e) { if (e.key === "Enter") doLogin(); });

/* ---------- 分頁 ---------- */
document.querySelector(".admin-tabs").addEventListener("click", function (e) {
  if (e.target.tagName !== "BUTTON" || !e.target.dataset.tab) return;
  document.querySelectorAll(".admin-tabs button").forEach(function (b) { b.classList.remove("on"); });
  e.target.classList.add("on");
  document.querySelectorAll(".tab-pane").forEach(function (p) { p.style.display = "none"; });
  $("tab-" + e.target.dataset.tab).style.display = "block";
});

/* ---------- 初始化 ---------- */
function initPanel() {
  fillSelects();
  renderNewsAdmin();
  renderAnalysisAdmin();
  renderCats();
  var today = new Date().toISOString().slice(0, 10);
  ["nf-date", "af-date", "pf-date"].forEach(function (id) { if (!$(id).value) $(id).value = today; });
}
function fillSelects() {
  $("nf-cat").innerHTML = Store.getCategories().map(function (c) { return "<option>" + c + "</option>"; }).join("");
  $("af-type").innerHTML = Store.getAnalysisTypes().map(function (t) { return "<option>" + t + "</option>"; }).join("");
  $("af-newsid").innerHTML = '<option value="">（不關聯）</option>' + Store.getNews().map(function (n) {
    return '<option value="' + n.id + '">' + Store.fmtDate(n.date) + " " + n.title + "</option>";
  }).join("");
}

/* ---------- 資訊 CRUD ---------- */
function saveNews() {
  var id = $("nf-id").value;
  var title = $("nf-title").value.trim();
  var date = $("nf-date").value;
  var summary = $("nf-summary").value.trim();
  if (!title || !date || !summary) { notice("請填妥標題、日期及摘要。", true); return; }
  var obj = {
    category: $("nf-cat").value, region: $("nf-region").value,
    source: $("nf-source").value.trim() || "本站",
    sourceUrl: $("nf-sourceurl").value.trim(),
    title: title, date: date, summary: summary, content: $("nf-content").value.trim()
  };
  var c = Store._custom();
  if (id) {
    obj.id = id;
    c.editedNews = c.editedNews || {};
    c.editedNews[id] = obj;
    // 若是後台新增的項目，直接更新 newNews
    (c.newNews || []).forEach(function (n, i) { if (n.id === id) c.newNews[i] = obj; });
  } else {
    obj.id = "u" + Date.now();
    c.newNews = c.newNews || [];
    c.newNews.push(obj);
  }
  Store.saveCustom(c);
  clearNewsForm();
  renderNewsAdmin();
  notice("資訊已儲存發佈，前台即時生效。");
}
function clearNewsForm() {
  ["nf-id", "nf-title", "nf-source", "nf-sourceurl", "nf-summary", "nf-content"].forEach(function (id) { $(id).value = ""; });
  $("news-form-title").textContent = "發佈新資訊";
}
function editNews(id) {
  var n = Store.getNews().find(function (x) { return x.id === id; });
  if (!n) return;
  $("nf-id").value = n.id; $("nf-title").value = n.title; $("nf-date").value = n.date;
  $("nf-cat").value = n.category; $("nf-region").value = n.region;
  $("nf-source").value = n.source; $("nf-sourceurl").value = n.sourceUrl || "";
  $("nf-summary").value = n.summary;
  $("nf-content").value = n.content || "";
  $("news-form-title").textContent = "編輯資訊";
  document.querySelector('[data-tab="news-form"]').click();
  window.scrollTo(0, 0);
}
function delNews(id) {
  if (!confirm("確定刪除此資訊？")) return;
  var c = Store._custom();
  var isNew = (c.newNews || []).some(function (n) { return n.id === id; });
  if (isNew) c.newNews = c.newNews.filter(function (n) { return n.id !== id; });
  else { c.deletedNews = c.deletedNews || []; c.deletedNews.push(id); }
  Store.saveCustom(c);
  renderNewsAdmin();
  notice("資訊已刪除。");
}
function renderNewsAdmin() {
  $("news-admin-list").innerHTML = Store.getNews().map(function (n) {
    return '<div class="admin-list-item"><div><strong>' + Store.fmtDate(n.date) + "</strong>｜[" + n.category + "] " + n.title + "</div>" +
      '<div><button class="btn btn-sm btn-gold" onclick="editNews(\'' + n.id + "')\">編輯</button> " +
      '<button class="btn btn-sm btn-grey" onclick="delNews(\'' + n.id + "')\">刪除</button></div></div>";
  }).join("");
}

/* ---------- 分析 CRUD ---------- */
function saveAnalysis() {
  var id = $("af-id").value;
  var title = $("af-title").value.trim();
  var date = $("af-date").value;
  var summary = $("af-summary").value.trim();
  var impact = $("af-impact").value.trim();
  if (!title || !date || !summary || !impact) { notice("請填妥標題、日期、摘要及影響評估。", true); return; }
  var obj = {
    type: $("af-type").value, title: title, date: date,
    summary: summary, impact: impact, content: $("af-content").value.trim(),
    newsId: $("af-newsid").value
  };
  var c = Store._custom();
  if (id) {
    obj.id = id;
    c.editedAnalysis = c.editedAnalysis || {};
    c.editedAnalysis[id] = obj;
    (c.newAnalysis || []).forEach(function (a, i) { if (a.id === id) c.newAnalysis[i] = obj; });
  } else {
    obj.id = "u" + Date.now();
    c.newAnalysis = c.newAnalysis || [];
    c.newAnalysis.push(obj);
  }
  Store.saveCustom(c);
  clearAnalysisForm();
  renderAnalysisAdmin();
  notice("分析文章已儲存發佈，前台即時生效。");
}
function clearAnalysisForm() {
  ["af-id", "af-title", "af-summary", "af-impact", "af-content"].forEach(function (id) { $(id).value = ""; });
  $("af-newsid").value = "";
  $("analysis-form-title").textContent = "發佈分析文章";
}
function editAnalysis(id) {
  var a = Store.getAnalysis().find(function (x) { return x.id === id; });
  if (!a) return;
  $("af-id").value = a.id; $("af-title").value = a.title; $("af-date").value = a.date;
  $("af-type").value = a.type; $("af-summary").value = a.summary;
  $("af-impact").value = a.impact; $("af-content").value = a.content || "";
  $("af-newsid").value = a.newsId || "";
  $("analysis-form-title").textContent = "編輯分析文章";
  document.querySelector('[data-tab="analysis-form"]').click();
  window.scrollTo(0, 0);
}
function delAnalysis(id) {
  if (!confirm("確定刪除此分析文章？")) return;
  var c = Store._custom();
  var isNew = (c.newAnalysis || []).some(function (a) { return a.id === id; });
  if (isNew) c.newAnalysis = c.newAnalysis.filter(function (a) { return a.id !== id; });
  else { c.deletedAnalysis = c.deletedAnalysis || []; c.deletedAnalysis.push(id); }
  Store.saveCustom(c);
  renderAnalysisAdmin();
  notice("分析文章已刪除。");
}
function renderAnalysisAdmin() {
  $("analysis-admin-list").innerHTML = Store.getAnalysis().map(function (a) {
    return '<div class="admin-list-item"><div><strong>' + Store.fmtDate(a.date) + "</strong>｜[" + a.type + "] " + a.title + "</div>" +
      '<div><button class="btn btn-sm btn-gold" onclick="editAnalysis(\'' + a.id + "')\">編輯</button> " +
      '<button class="btn btn-sm btn-grey" onclick="delAnalysis(\'' + a.id + "')\">刪除</button></div></div>";
  }).join("");
}

/* ---------- 分類管理 ---------- */
function renderCats() {
  $("cat-admin-list").innerHTML = Store.getCategories().map(function (c, i) {
    return '<span class="badge badge-blue" style="margin:4px;font-size:.9rem;">' + c +
      ' <a href="javascript:delCat(' + i + ')" style="color:#fff;">✕</a></span>';
  }).join("");
  $("type-admin-list").innerHTML = Store.getAnalysisTypes().map(function (t, i) {
    return '<span class="badge badge-gold" style="margin:4px;font-size:.9rem;">' + t +
      ' <a href="javascript:delType(' + i + ')" style="color:#3d2e00;">✕</a></span>';
  }).join("");
  fillSelects();
}
function addCat() {
  var v = $("new-cat").value.trim();
  if (!v) return;
  var cats = Store.getCategories();
  if (cats.includes(v)) { notice("分類已存在。", true); return; }
  cats.push(v);
  var c = Store._custom(); c.categories = cats; Store.saveCustom(c);
  $("new-cat").value = "";
  renderCats();
  notice("已新增分類「" + v + "」。");
}
function delCat(i) {
  if (!confirm("刪除此分類？（已有文章的分類標籤不會被移除）")) return;
  var cats = Store.getCategories(); cats.splice(i, 1);
  var c = Store._custom(); c.categories = cats; Store.saveCustom(c);
  renderCats();
}
function addType() {
  var v = $("new-type").value.trim();
  if (!v) return;
  var types = Store.getAnalysisTypes();
  if (types.includes(v)) { notice("類型已存在。", true); return; }
  types.push(v);
  var c = Store._custom(); c.analysisTypes = types; Store.saveCustom(c);
  $("new-type").value = "";
  renderCats();
  notice("已新增事件類型「" + v + "」。");
}
function delType(i) {
  if (!confirm("刪除此事件類型？")) return;
  var types = Store.getAnalysisTypes(); types.splice(i, 1);
  var c = Store._custom(); c.analysisTypes = types; Store.saveCustom(c);
  renderCats();
}

/* ---------- 活豬數據 ---------- */
function savePigRow() {
  var date = $("pf-date").value;
  var avg = parseInt($("pf-avg").value, 10);
  if (!date || !avg) { notice("請至少填寫日期及平均價。", true); return; }
  var mainland = parseInt($("pf-mainland").value, 10) || 0;
  var local = parseInt($("pf-local").value, 10) || 0;
  var row = {
    date: date, mainland: mainland, local: local, total: mainland + local,
    high: parseInt($("pf-high").value, 10) || avg,
    low: parseInt($("pf-low").value, 10) || avg,
    avg: avg
  };
  var c = Store._custom();
  c.pigRows = c.pigRows || [];
  c.pigRows = c.pigRows.filter(function (r) { return r.date !== date; });
  c.pigRows.push(row);
  Store.saveCustom(c);
  notice(date + " 活豬數據已儲存，前台圖表即時更新。");
}

/* ---------- 啟動 ---------- */
if (authed) showPanel();
