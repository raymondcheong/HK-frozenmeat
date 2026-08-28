/* =====================================================
   五豐行情 — 新聞來源清單（結構化註冊表）
   每日自動采編任務依此清單選材；資訊頁「新聞來源」區塊據此渲染。
   欄位說明：
   - region：地區（香港 / 中國內地 / 南美洲 / 北美洲 / 歐洲）
   - language：原文語言（非中文來源已標示，采編時譯為繁體中文並註明出處）
   - fields：主要報導領域
   - freq：更新頻率　- tier：來源級別（官方機構 / 權威媒體 / 行業協會 / 研究機構）
   - status：existing（現有來源）/ new（本次新增）
   ===================================================== */

window.NEWS_SOURCE_REGISTRY = [
  /* ================= 現有來源（保留） ================= */
  { id: "fehd", name: "香港食物環境衞生署", url: "https://www.fehd.gov.hk/tc_chi/sh/data/supply_tw.html",
    region: "香港", language: "繁體中文", fields: "每日活豬供應量・拍賣價・屠房資訊", freq: "每日", tier: "官方機構", status: "existing" },
  { id: "cfs", name: "香港食物安全中心", url: "https://www.cfs.gov.hk/",
    region: "香港", language: "繁體中文", fields: "進口凍肉水產檢疫・食物安全政策", freq: "每日", tier: "官方機構", status: "existing" },
  { id: "moa", name: "中國農業農村部", url: "http://www.moa.gov.cn/",
    region: "中國內地", language: "簡體中文", fields: "生豬監測・調運政策・漁業政策", freq: "每日", tier: "官方機構", status: "existing" },
  { id: "govcn", name: "中國政府網（海關總署等政策庫）", url: "http://www.gov.cn/zhengce/zuixin/",
    region: "中國內地", language: "簡體中文", fields: "進出口檢驗檢疫規程・關稅政策", freq: "每日", tier: "官方機構", status: "existing" },
  { id: "caaa", name: "中國畜牧業協會", url: "https://www.caaa.cn/",
    region: "中國內地", language: "簡體中文", fields: "畜牧業行情・行業統計", freq: "每週", tier: "行業協會", status: "existing" },
  { id: "thepaper", name: "澎湃新聞", url: "https://www.thepaper.cn/",
    region: "中國內地", language: "簡體中文", fields: "宏觀經濟・農產品價格報導", freq: "每日", tier: "權威媒體", status: "existing" },
  { id: "sina-fin", name: "新浪財經", url: "http://finance.sina.com.cn/",
    region: "中國內地", language: "簡體中文", fields: "畜禽水產價格周報・期貨行情", freq: "每日", tier: "權威媒體", status: "existing" },
  { id: "hongcan", name: "紅餐網・紅餐產業研究院", url: "https://www.canyin88.com/",
    region: "中國內地", language: "簡體中文", fields: "餐飲食材採購行情（牛豬雞鴨）", freq: "每月專題", tier: "研究機構", status: "existing" },
  { id: "foodmate", name: "進出口食品安全信息平台（食品夥伴網）", url: "https://exim.foodmate.net/",
    region: "中國內地", language: "簡體中文", fields: "進出口食品動態・國際行情轉載", freq: "每日", tier: "權威媒體", status: "existing" },
  { id: "ntv", name: "農視網", url: "https://www.ntv.cn/",
    region: "中國內地", language: "簡體中文", fields: "農業漁業新聞・水產行情", freq: "每日", tier: "權威媒體", status: "existing" },
  { id: "hk01", name: "香港01", url: "https://www.hk01.com/",
    region: "香港", language: "繁體中文", fields: "本港民生・食品價格新聞", freq: "每日", tier: "權威媒體", status: "existing" },
  { id: "hktdc", name: "香港貿發局經貿研究", url: "https://research.hktdc.com/tc/",
    region: "香港", language: "繁體中文", fields: "關稅・自貿協定・市場准入研究", freq: "每週", tier: "研究機構", status: "existing" },

  /* ================= 新增：南美洲 ================= */
  { id: "canalrural", name: "Canal Rural", url: "https://www.canalrural.com.br/",
    region: "南美洲", language: "葡萄牙文（巴西）", fields: "巴西農牧綜合新聞・活牛行情・農產品價格", freq: "每日", tier: "權威媒體", status: "new" },
  { id: "beefpoint", name: "BeefPoint", url: "https://www.beefpoint.com.br/",
    region: "南美洲", language: "葡萄牙文（巴西）", fields: "巴西牛肉產業鏈・活牛價格・出口數據", freq: "每日", tier: "權威媒體", status: "new" },
  { id: "abpa", name: "ABPA 巴西動物蛋白協會", url: "https://abpa-br.org/",
    region: "南美洲", language: "葡萄牙文／英文", fields: "巴西禽肉豬肉出口數據・行業政策", freq: "每週", tier: "行業協會", status: "new" },
  { id: "senasa", name: "SENASA 阿根廷國家農畜食品衛生局", url: "https://www.senasa.gob.ar/",
    region: "南美洲", language: "西班牙文（阿根廷）", fields: "阿根廷檢疫政策・肉類出口認證", freq: "定期", tier: "官方機構", status: "new" },

  /* ================= 新增：北美洲 ================= */
  { id: "usda-ams", name: "USDA AMS Market News（美國農業部市場新聞）", url: "https://www.ams.usda.gov/market-news",
    region: "北美洲", language: "英文", fields: "美國牲畜肉類家禽批發價・官方市場報告", freq: "每日", tier: "官方機構", status: "new" },
  { id: "porkbusiness", name: "Pork Business", url: "https://www.porkbusiness.com/",
    region: "北美洲", language: "英文", fields: "美國生豬產業・豬價利潤追蹤・貿易政策", freq: "每日", tier: "權威媒體", status: "new" },
  { id: "drovers", name: "Drovers", url: "https://www.drovers.com/",
    region: "北美洲", language: "英文", fields: "美國肉牛產業・牛價行情・養殖趨勢", freq: "每日", tier: "權威媒體", status: "new" },
  { id: "seafoodsource", name: "SeafoodSource", url: "https://www.seafoodsource.com/",
    region: "北美洲", language: "英文", fields: "全球海產行業・價格動態・貿易政策", freq: "每日", tier: "權威媒體", status: "new" },
  { id: "poultrysite", name: "The Poultry Site", url: "https://www.thepoultrysite.com/",
    region: "北美洲", language: "英文", fields: "全球家禽產業・禽肉價格・疫情監測", freq: "每日", tier: "權威媒體", status: "new" },

  /* ================= 新增：歐洲 ================= */
  { id: "ahdb", name: "AHDB（英國農業與園藝發展局）", url: "https://ahdb.org.uk/pork-markets",
    region: "歐洲", language: "英文", fields: "英國及歐盟豬肉牛肉價格・屠宰量・進出口數據", freq: "每週", tier: "官方機構", status: "new" },
  { id: "ec-agri", name: "歐盟委員會農業總司（DG AGRI）", url: "https://agriculture.ec.europa.eu/",
    region: "歐洲", language: "英文", fields: "歐盟肉類市場儀表板・農業政策法規", freq: "每週", tier: "官方機構", status: "new" },
  { id: "euromeat", name: "EuroMeat News", url: "https://euromeatnews.com/",
    region: "歐洲", language: "英文", fields: "歐洲及全球肉類行業新聞・市場趨勢", freq: "每日", tier: "權威媒體", status: "new" },
  { id: "globefish", name: "FAO GLOBEFISH（聯合國糧農組織）", url: "https://www.fao.org/in-action/globefish/en/",
    region: "歐洲", language: "英文", fields: "全球漁業水產貿易分析・魚價報告", freq: "每月／每季", tier: "官方機構", status: "new" },
  { id: "ucn", name: "Undercurrent News（UCN）", url: "https://www.undercurrentnews.com/",
    region: "歐洲", language: "英文", fields: "全球海產價格・貿易數據・漁業展會報導（部分付費）", freq: "每日", tier: "權威媒體", status: "new" },
  { id: "intrafish", name: "IntraFish", url: "https://www.intrafish.com/",
    region: "歐洲", language: "英文", fields: "全球海產貿易・三文魚蝦類行情（部分付費）", freq: "每日", tier: "權威媒體", status: "new" }
];
