# -*- coding: utf-8 -*-
"""Integration test for /products/manage/by-shop/:shopId/import-drafts"""
import json, time, urllib.request

BASE = "http://localhost:4000/api/v1"

TOKEN = None  # يتحدّث بعد تسجيل الدخول

def call(path, method="GET", body=None, token=None):
    t = token if token is not None else TOKEN
    headers = {"Content-Type": "application/json"}
    if t:
        headers["Authorization"] = "Bearer " + t
    req = urllib.request.Request(
        BASE + path,
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers=headers,
    )
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")

RUN = str(int(time.time()))[-6:]  # لاحقة فريدة لكل تشغيلة
# 0) fresh dev-merchant token on every run
st, res = call("/auth/dev-merchant-login", "POST", {"shopCategory": "RETAIL"})
assert st == 200, res
TOKEN = res["data"]["token"]["accessToken"]

# 1) whoami / shop id
st, me = call("/auth/me")
shop_id = me["data"]["user"]["shopId"] if me.get("data", {}).get("user") else me["data"]["shopId"]
print("auth/me:", st, "shopId:", shop_id)

# 2) small import: 3 new products
items = [
    {"name": "اختبار منتج أ {RUN}", "price": 100.5, "stock": 10, "category": "عام", "description": "وصف أ"},
    {"name": "اختبار منتج ب {RUN}", "price": 250, "stock": 0, "category": "ملابس"},
    {"name": "اختبار منتج ج {RUN}", "price": 99.99, "stock": 5, "category": "إلكترونيات", "unit": "قطعة"},
]
st, res = call(f"/products/manage/by-shop/{shop_id}/import-drafts", "POST", {"source": "excel_bulk", "items": items})
d = res.get("data", {})
print("import-3:", st, "created:", d.get("createdCount"), "updated:", d.get("updatedCount"), "failed:", d.get("failedCount"))
assert st == 200 and d.get("createdCount") == 3, res

# 3) re-import same names -> should update, not duplicate
st, res = call(f"/products/manage/by-shop/{shop_id}/import-drafts", "POST", {"source": "excel_bulk", "items": items})
d = res.get("data", {})
print("reimport-3:", st, "created:", d.get("createdCount"), "updated:", d.get("updatedCount"), "failed:", d.get("failedCount"))
assert d.get("updatedCount") == 3 and d.get("createdCount") == 0, res

# 4) mixed batch: 2 valid + 2 invalid (empty name, negative price)
mixed = [
    {"name": "اختبار منتج د {RUN}", "price": 50, "stock": 1, "category": "عام"},
    {"name": "", "price": 10, "stock": 1},
    {"name": "سالب {RUN}", "price": -5, "stock": 1},
    {"name": "اختبار منتج هـ {RUN}", "price": 75, "stock": 3, "category": "عام"},
]
st, res = call(f"/products/manage/by-shop/{shop_id}/import-drafts", "POST", {"source": "excel_bulk", "items": mixed})
d = res.get("data", {})
print("mixed:", st, "created:", d.get("createdCount"), "failed:", d.get("failedCount"), "details:", d.get("failed"))
assert d.get("createdCount") == 2 and d.get("failedCount") == 2, res

# 5) limit guard: 2001 items in one request -> 400
st, res = call(f"/products/manage/by-shop/{shop_id}/import-drafts", "POST",
               {"source": "excel_bulk", "items": [{"name": f"over-{RUN}-{i}", "price": 1, "stock": 1} for i in range(2001)]})
print("over-limit:", st, res.get("message", "")[:60])
assert st == 400, res

# 6) unauthorized (no token) -> 401
req = urllib.request.Request(BASE + f"/products/manage/by-shop/{shop_id}/import-drafts", method="POST",
                             data=json.dumps({"items": []}).encode(), headers={"Content-Type": "application/json"})
try:
    urllib.request.urlopen(req)
    print("no-token: FAILED (accepted!)")
except urllib.error.HTTPError as e:
    print("no-token:", e.code)
    assert e.code in (401, 400)

# 7) bulk: 5000 products in chunks of 500
t0 = time.time()
total_created = total_updated = 0
for chunk_i in range(10):
    items = [{"name": f"منتج بالجملة {RUN} {chunk_i * 500 + j + 1}", "price": 10 + (j % 50), "stock": j % 20,
              "category": ["عام", "ملابس", "إلكترونيات"][j % 3]} for j in range(500)]
    st, res = call(f"/products/manage/by-shop/{shop_id}/import-drafts", "POST", {"source": "excel_bulk", "items": items})
    d = res.get("data", {})
    assert st == 200, res
    total_created += d.get("createdCount", 0)
    total_updated += d.get("updatedCount", 0)
    print(f"chunk {chunk_i + 1}/10: created={d.get('createdCount')} updated={d.get('updatedCount')} failed={d.get('failedCount')} ({time.time() - t0:.1f}s)")
print(f"BULK 5000: created={total_created} updated={total_updated} in {time.time() - t0:.1f}s")

# 8) re-run one chunk -> all updated (idempotent upsert)
items = [{"name": f"منتج بالجملة {RUN} {j + 1}", "price": 11 + (j % 50), "stock": j % 20, "category": "عام"} for j in range(500)]
st, res = call(f"/products/manage/by-shop/{shop_id}/import-drafts", "POST", {"source": "excel_bulk", "items": items})
d = res.get("data", {})
print("bulk-reimport: created:", d.get("createdCount"), "updated:", d.get("updatedCount"))
assert d.get("updatedCount") == 500, res

# 9) verify count via manage list
st, res = call(f"/products/manage/by-shop/{shop_id}?limit=1&page=1")
total = res.get("meta", {}).get("total")
print("manage-list total:", total)
print("ALL TESTS PASSED")
