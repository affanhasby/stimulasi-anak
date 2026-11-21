#!/usr/bin/env python3
"""Bangun ulang semua CSV dan tabel uji README dari JSON.

JSON di folder data/ adalah SUMBER UTAMA. CSV hanya turunan untuk dibaca/ditinjau
di spreadsheet. Jangan edit CSV langsung: edit JSON, lalu jalankan:

    python3 scripts/build_csv.py

Skrip juga memeriksa:
  - semua `source` / `related_source` terdefinisi di sources.json
  - semua id unik
  - field `verification` hanya bernilai verified | partial | unverified
Keluar dengan kode 1 bila ada pelanggaran.
"""
import calendar
import csv
import datetime as dt
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
# Mendukung dua tata letak: proyek/{README.md, data/, scripts/} atau semua file dalam satu folder.
if (HERE / "vaccines.json").exists():
    ROOT = DATA = HERE
else:
    ROOT = HERE.parent
    DATA = ROOT / "data"
README = ROOT / "README.md"
VERIF = {"verified", "partial", "unverified"}
TEST_BIRTH = dt.date(2026, 1, 31)


def load(name):
    with open(DATA / name, encoding="utf-8") as f:
        return json.load(f)


def write_csv(name, header, rows):
    path = DATA / name
    with open(path, "w", newline="", encoding="utf-8-sig") as f:  # BOM agar Excel membaca UTF-8
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)
    return name, len(rows)


def age(o, k):
    return "" if not o else o.get(k, "")


def add_age(birth, o):
    m = birth.month - 1 + o["months"]
    y, m = birth.year + m // 12, m % 12 + 1
    d = min(birth.day, calendar.monthrange(y, m)[1])
    return dt.date(y, m, d) + dt.timedelta(days=o.get("days", 0))


def main():
    errors, out = [], []
    sources = load("sources.json")["sources"]
    vac = load("vaccines.json")
    mil = load("milestones.json")
    stim = load("stimulation_activities.json")
    cnt = load("counters.json")
    dang = load("danger_signs.json")

    # --- validasi ---
    src_ids = {s["id"] for s in sources}
    for f in DATA.glob("*.json"):
        text = f.read_text(encoding="utf-8")
        for sid in re.findall(r'"(?:source|related_source)":\s*"([A-Za-z0-9_]+)"', text):
            if sid not in src_ids:
                errors.append(f"{f.name}: source '{sid}' tidak ada di sources.json")
        for v in re.findall(r'"verification":\s*"([^"]+)"', text):
            if v not in VERIF:
                errors.append(f"{f.name}: verification '{v}' tidak valid")
        if '"latest_verified"' in text or re.search(r'"verified":', text):
            errors.append(f"{f.name}: masih memakai field verifikasi lama; pakai `verification`")
    ids = [d["id"] for d in vac["doses"]]
    ids += [i["id"] for c in mil["kia_checklists"] for i in c["items"]]
    ids += [i["id"] for c in mil["cdc_milestones"] for i in c["items"]]
    ids += [a["id"] for a in stim["activities"]]
    dup = {i for i in ids if ids.count(i) > 1}
    if dup:
        errors.append(f"id duplikat: {sorted(dup)}")
    for d in vac["doses"]:
        if "relative_to" in d and any(k in d for k in ("earliest", "on_time_until", "min_interval_days_from_prev")):
            errors.append(f"{d['id']}: dosis relative_to tidak boleh punya earliest/on_time_until/min_interval_days_from_prev")
        if any(k in d for k in ("repeat_every_months", "until")):
            errors.append(f"{d['id']}: pakai `recurrence`, bukan repeat_every_months/until")
        ref = (d.get("relative_to") or {}).get("dose") or (d.get("recurrence") or {}).get("after_dose")
        if ref and ref not in {x["id"] for x in vac["doses"]}:
            errors.append(f"{d['id']}: dosis acuan '{ref}' tidak ada")
    for c in mil["cdc_milestones"]:
        if not c.get("source"):
            errors.append(f"milestone CDC {c['age_months']} bln tanpa source")

    # --- CSV ---
    out.append(write_csv("sources.csv",
        ["id", "publisher", "title", "date", "url", "type", "note"],
        [[s["id"], s["publisher"], s["title"], s.get("date", ""), s["url"], s["type"], s.get("note", "")] for s in sources]))

    out.append(write_csv("vaccines.csv",
        ["id", "schedule", "vaccine", "dose",
         "recommended_months", "recommended_days",
         "mulai_bisa_months", "mulai_bisa_days",
         "paling_lambat_months", "paling_lambat_days",
         "batas_maksimal_months", "batas_maksimal_days",
         "min_interval_days", "relative_to", "recurrence", "verification", "condition", "trigger", "school_grade", "sex",
         "note", "source", "related_source"],
        [[d["id"], d["schedule"], d["vaccine"], d["dose"],
          age(d.get("recommended") or d.get("approx_age"), "months"), age(d.get("recommended") or d.get("approx_age"), "days"),
          age(d.get("earliest"), "months"), age(d.get("earliest"), "days"),
          age(d.get("on_time_until"), "months"), age(d.get("on_time_until"), "days"),
          age(d.get("max_until"), "months"), age(d.get("max_until"), "days"),
          d.get("min_interval_days_from_prev", ""),
          json.dumps(d["relative_to"], ensure_ascii=False) if d.get("relative_to") else "",
          json.dumps(d["recurrence"], ensure_ascii=False) if d.get("recurrence") else "",
          d["verification"], d.get("condition", ""),
          d.get("trigger", ""), d.get("school_grade", ""), d.get("sex", ""),
          " ".join(x for x in [d.get("note", ""), d.get("on_time_note", "")] if x),
          d["source"], d.get("related_source", "")] for d in vac["doses"]]))

    out.append(write_csv("vaccine_catch_up_rules.csv",
        ["vaccine", "schedule", "rule", "verification", "source", "page"],
        [[r["vaccine"], r["schedule"], r["rule"], r["verification"], r["source"], r.get("page", "")] for r in vac["catch_up_rules"]]))

    rows = []
    for c in mil["kia_checklists"]:
        for i in c["items"]:
            rows.append(["KIA", c["id"], i["id"], c["start_months"], c["cutoff_months"], i["domain"], i["text"], c["source"], c.get("page", "")])
    for c in mil["cdc_milestones"]:
        for i in c["items"]:
            rows.append(["CDC", f"CDC-{c['age_months']}", i["id"], "", c["age_months"], i["domain"], i["text"], c["source"], ""])
    out.append(write_csv("milestones.csv",
        ["set", "group_id", "id", "start_months", "age_or_cutoff_months", "domain", "text", "source", "page"], rows))

    out.append(write_csv("stimulation_activities.csv",
        ["id", "start_months", "end_months", "domain", "frequency", "minutes", "title", "how", "source", "page"],
        [[a["id"], a["start"], a["end"], a["domain"], a["frequency"], a["minutes"], a["title"], a["how"], a["source"], a.get("page", "")]
         for a in stim["activities"]]))

    nrows, arows = [], []
    for c in cnt["counters"]:
        for n in c.get("norms", []):
            rng = n.get("age_days") or n.get("age_months") or ["", ""]
            unit = "hari" if "age_days" in n else ("bulan" if "age_months" in n else "")
            nrows.append([c["id"], c["label"], unit, rng[0], rng[1], n.get("min_per_day", ""), n.get("max_per_day", ""),
                          n.get("min_hours", ""), n.get("max_hours", ""), n["text"], n.get("verification", "verified"),
                          n.get("source", ""), n.get("page", "")])
        for a in c.get("alerts", []):
            arows.append([c["id"], a["id"], a["if"], a["level"], a["text"], a.get("source", ""), a.get("page", "")])
    out.append(write_csv("counter_norms.csv",
        ["counter_id", "label", "age_unit", "age_from", "age_to", "min_per_day", "max_per_day", "min_hours", "max_hours",
         "text", "verification", "source", "page"], nrows))
    out.append(write_csv("counter_alerts.csv", ["counter_id", "alert_id", "condition", "level", "text", "source", "page"], arows))

    out.append(write_csv("danger_signs.csv",
        ["group_id", "group_label", "age_days_from", "age_days_to", "sign", "rule", "source", "page"],
        [[g["id"], g["label"], g["age_days"][0], g["age_days"][1], s, g["rule"], g["source"], g.get("page", "")]
         for g in dang["groups"] for s in g["signs"]]))

    # --- tabel uji README ---
    lines = ["| id | Dosis | Mulai bisa | Paling lambat | Batas maksimal | Verifikasi |",
             "| --- | --- | --- | --- | --- | --- |"]
    for d in vac["doses"]:
        if d["schedule"] != "KEMENKES" or "earliest" not in d:
            continue
        mx = add_age(TEST_BIRTH, d["max_until"]) if d.get("max_until") else "-"
        lines.append(f"| {d['id']} | {d['dose']} | {add_age(TEST_BIRTH, d['earliest'])} | "
                     f"{add_age(TEST_BIRTH, d['on_time_until'])} | {mx} | {d['verification']} |")
    start, end = "<!-- TEST_TABLE_START -->", "<!-- TEST_TABLE_END -->"
    text = README.read_text(encoding="utf-8")
    if start in text and end in text:
        a, b = text.index(start) + len(start), text.index(end)
        README.write_text(text[:a] + "\n" + "\n".join(lines) + "\n" + text[b:], encoding="utf-8")
    else:
        errors.append("README.md tidak punya penanda TEST_TABLE_START/END")

    for name, n in out:
        print(f"{name}: {n} baris")
    if errors:
        print("\nKESALAHAN:", *errors, sep="\n- ")
        sys.exit(1)
    print("OK: semua sumber terdefinisi, id unik, field verifikasi valid.")


if __name__ == "__main__":
    main()
