#!/usr/bin/env python3
"""
Génère src/content/growth-who.json : tables LMS des Standards de croissance de
l'OMS (WHO Child Growth Standards, 2006) pour 0-24 mois.

Source des tables : OMS (https://www.who.int/tools/child-growth-standards),
lues ici depuis le paquet npm "who-growth-standards" (tables OMS journalières
reproduites telles quelles). Le script LIT les tableaux comme des données
(aucune exécution de code tiers) et vérifie quelques valeurs de référence.

Usage : python3 scripts/build-growth.py chemin/vers/package/dist/index.js
"""
import json, re, sys

src = open(sys.argv[1], encoding="utf-8").read()

def table(var):
    m = re.search(r"var %s = \{.*?lms: \[(.*?)\]\s*\};" % var, src, re.S)
    num = r"(-?[\d.]+(?:e-?\d+)?)"  # accepte la notation scientifique (ex. 99e-4)
    lines = [l.strip().rstrip(",") for l in m.group(1).strip().split("\n") if l.strip()]
    rows = [re.fullmatch(r"\[%s,\s*%s,\s*%s\]" % (num, num, num), l) for l in lines]
    assert all(rows), f"{var} : ligne illisible"
    t = [[float(r.group(1)), float(r.group(2)), float(r.group(3))] for r in rows]
    assert len(t) == 1857, f"{var} : {len(t)} lignes au lieu de 1857 (0 à 1856 jours)"
    return t

out = {"source": "OMS — Standards de croissance de l'enfant (2006)", "stepDays": 7, "maxDays": 728}
for key, var in [("weight", "WFA"), ("length", "LHFA"), ("head", "HCFA")]:
    for sex, suffix in [("m", "BOYS"), ("f", "GIRLS")]:
        t = table(f"{var}_{suffix}")
        assert len(t) > 728, f"{var}_{suffix} trop court"
        # un point par semaine (0 → 104 semaines) ; interpolation linéaire entre les points
        out[f"{key}_{sex}"] = [t[d] for d in range(0, 729, 7)]

# Contrôles : valeurs publiées par l'OMS à la naissance
ref = {"weight_m": [0.3487, 3.3464, 0.14602], "weight_f": [0.3809, 3.2322, 0.14171],
       "length_m": [1, 49.8842, 0.03795], "head_m": [1, 34.4618, 0.03686]}
for k, v in ref.items():
    assert out[k][0] == v, (k, out[k][0], v)

with open("src/content/growth-who.json", "w") as f:
    json.dump(out, f, separators=(",", ":"))
print("ok", {k: len(v) for k, v in out.items() if isinstance(v, list)})
