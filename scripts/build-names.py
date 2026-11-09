#!/usr/bin/env python3
"""
Génère src/content/names.json à partir du « Fichier des prénoms » de l'INSEE
(édition nationale, Licence Ouverte Etalab).

Usage : python3 scripts/build-names.py chemin/vers/prenoms-2023-nat.csv

Format de sortie (compact) : une ligne par prénom
  [nom, sexe, naissances_10_dernières_années, année_pic, tendance]
  sexe     : "f", "m" ou "x" (mixte : au moins 10 % de l'autre sexe)
  tendance : rapport (5 dernières années) / (5 années d'il y a 10 ans), arrondi
"""
import csv, json, sys, collections

src = sys.argv[1]
by_name = collections.defaultdict(lambda: {"f": 0, "m": 0, "years": collections.Counter()})
last_year = 0
with open(src, encoding="utf-8") as f:
    r = csv.reader(f, delimiter=";")
    next(r)
    for sexe, name, year, count in r:
        if year == "XXXX" or name.startswith("_") or len(name) < 2:
            continue
        y, c = int(year), int(count)
        last_year = max(last_year, y)
        d = by_name[name]
        d["f" if sexe == "2" else "m"] += c if y >= 1990 else 0
        d["years"][y] += c

def title(n: str) -> str:
    return "-".join(p[:1] + p[1:].lower() for p in n.split("-"))

out = []
L = last_year
for name, d in by_name.items():
    yrs = d["years"]
    recent = sum(yrs[y] for y in range(L - 9, L + 1))
    since90 = d["f"] + d["m"]
    # On garde les prénoms portés par au moins 150 bébés sur 10 ans,
    # ou les "rétro" bien établis (≥ 3000 depuis 1990).
    if recent < 150 and since90 < 3000:
        continue
    fshare = d["f"] / since90 if since90 else (1 if yrs else 0)
    sex = "f" if fshare >= 0.9 else "m" if fshare <= 0.1 else "x"
    peak = max(yrs, key=lambda y: yrs[y])
    now5 = sum(yrs[y] for y in range(L - 4, L + 1))
    old5 = sum(yrs[y] for y in range(L - 14, L - 9))
    trend = round(now5 / old5, 1) if old5 else 9.9
    out.append([title(name), sex, recent, peak, min(trend, 9.9)])

out.sort(key=lambda r: -r[2])
meta = {"source": f"INSEE, Fichier des prénoms (édition {L}), Licence Ouverte Etalab", "lastYear": L}
with open("src/content/names.json", "w", encoding="utf-8") as f:
    json.dump({"meta": meta, "names": out}, f, ensure_ascii=False, separators=(",", ":"))
print(f"{len(out)} prénoms, dernière année {L}")
