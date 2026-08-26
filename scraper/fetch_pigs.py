#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
港滙肉訊 — 每日活豬數據自動抓取腳本
資料來源：香港食物環境衞生署
https://www.fehd.gov.hk/tc_chi/sh/data/supply_tw.html

用法：
    python fetch_pigs.py
會把最新一日的活豬供應及拍賣價追加/更新到 ../js/pig_daily.json，
網站部署時由 js/common.js 的 Store.getPig() 讀取合併。
建議配合 Windows 工作排程器或 cron 每日上午 10 時後執行一次。
"""

import json
import os
import re
import sys
import urllib.request
from datetime import datetime

FEHD_URL = "https://www.fehd.gov.hk/tc_chi/sh/data/supply_tw.html"
OUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "js", "pig_daily.json")


def fetch_html(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (hkmeatnews-bot)"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read()
    for enc in ("utf-8", "big5", "cp950"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="ignore")


def _to_int(s: str) -> int:
    return int(re.sub(r"[^\d]", "", s))


def _table_pairs(table_html: str) -> dict:
    """把一個表格的 <td>標籤</td><td>數值</td> 配對抽出，回傳 {關鍵詞: 整數}。"""
    cells = re.findall(r"<td[^>]*>(.*?)</td>", table_html, re.S)
    pairs = {}
    for i in range(0, len(cells) - 1, 2):
        label = re.sub(r"<[^>]+>", " ", cells[i])
        value = re.sub(r"<[^>]+>", " ", cells[i + 1]).strip()
        if not re.search(r"\d", value):
            continue
        for key in ("中國內地進口", "本地", "總數", "最高", "最低", "平均"):
            if key in label:
                pairs[key] = _to_int(value)
                break
    return pairs


def parse(html: str) -> dict:
    """從食環署頁面抽出日期、供應數量、拍賣價、明日預計供應。"""
    m = re.search(r"\((\d{2}/\d{2}/\d{4})\)", html)
    if not m:
        raise ValueError("找不到日期")
    date = datetime.strptime(m.group(1), "%d/%m/%Y").strftime("%Y-%m-%d")

    tables = re.findall(r"<table[^>]*>(.*?)</table>", html, re.S)
    supply, price, forecast = {}, {}, {}
    for t in tables:
        header = re.sub(r"<[^>]+>", " ", re.search(r"<th[^>]*>(.*?)</th>", t, re.S).group(1)) if re.search(r"<th[^>]*>(.*?)</th>", t, re.S) else ""
        if "今日活豬供應" in header and "拍賣" not in header:
            supply = _table_pairs(t)
        elif "拍賣價" in header:
            price = _table_pairs(t)
        elif "預計供應" in header:
            forecast = _table_pairs(t)

    if not supply or not price:
        raise ValueError("頁面結構不符，請檢查食環署網站是否改版")

    result = {
        "date": date,
        "mainland": supply.get("中國內地進口", 0),
        "local": supply.get("本地", 0),
        "total": supply.get("總數", 0),
        "high": price.get("最高", 0),
        "low": price.get("最低", 0),
        "avg": price.get("平均", 0),
    }
    if forecast:
        result["forecast"] = {
            "mainland": forecast.get("中國內地進口", 0),
            "local": forecast.get("本地", 0),
            "total": forecast.get("總數", 0),
        }
    return result


def merge_and_save(row: dict) -> None:
    rows = []
    if os.path.exists(OUT_PATH):
        with open(OUT_PATH, "r", encoding="utf-8") as f:
            rows = json.load(f)
    rows = [r for r in rows if r.get("date") != row["date"]]
    rows.append(row)
    rows.sort(key=lambda r: r["date"])
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)
    print(f"已儲存 {row['date']}：供應 {row['total']} 頭，均價 ${row['avg']}/擔 → {OUT_PATH}")


def main() -> int:
    try:
        html = fetch_html(FEHD_URL)
        row = parse(html)
        merge_and_save(row)
        return 0
    except Exception as exc:  # noqa: BLE001
        print(f"抓取失敗：{exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
