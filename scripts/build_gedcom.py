#!/usr/bin/env python3
"""Generer famtree.ged ud fra personer/*.md.

Læser YAML-frontmatter og brødtekst fra hver fil, bygger INDI- og FAM-records
og skriver en GEDCOM 5.5.1-fil klar til import i MyHeritage, Ancestry,
FamilySearch, Geni og andet slægtsforskningssoftware.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
PERSONER_DIR = ROOT / "personer"
OUTPUT_FILE = ROOT / "famtree.ged"

KOEN_TO_SEX = {"M": "M", "K": "F"}
MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN",
          "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]


def empty(v) -> bool:
    if v is None:
        return True
    if isinstance(v, str) and v.strip() in ("", "?", "ukendt"):
        return True
    return False


def parse_person(path: Path):
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        raise ValueError(f"{path}: mangler YAML-frontmatter")
    _, fm, body = text.split("---", 2)
    return yaml.safe_load(fm) or {}, body.lstrip("\n").rstrip()


def load_persons() -> dict:
    persons = {}
    for path in sorted(PERSONER_DIR.glob("*.md")):
        slug = path.stem
        if slug.startswith("_"):
            continue
        data, body = parse_person(path)
        persons[slug] = {"data": data, "body": body, "path": path}
    return persons


def fmt_date(value):
    if empty(value):
        return None
    s = str(value).strip()
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", s)
    if m:
        y, mo, d = m.groups()
        return f"{int(d)} {MONTHS[int(mo)-1]} {y}"
    m = re.match(r"^(\d{4})-(\d{2})$", s)
    if m:
        y, mo = m.groups()
        return f"{MONTHS[int(mo)-1]} {y}"
    if re.match(r"^\d{4}$", s):
        return s
    return s


def split_name(navn: str):
    parts = navn.strip().split()
    if len(parts) == 1:
        return parts[0], ""
    return " ".join(parts[:-1]), parts[-1]


def build_families(persons):
    families = []
    couples = {}

    def get_or_create(husb, wife):
        if not husb and not wife:
            return None
        key = (husb, wife)
        if key not in couples:
            couples[key] = len(families)
            families.append({"husb": husb, "wife": wife, "chil": [], "marriage": None})
        return couples[key]

    for slug, p in persons.items():
        far = p["data"].get("far")
        mor = p["data"].get("mor")
        if empty(far):
            far = None
        if empty(mor):
            mor = None
        if far or mor:
            idx = get_or_create(far, mor)
            if idx is not None and slug not in families[idx]["chil"]:
                families[idx]["chil"].append(slug)

    for slug, p in persons.items():
        koen = p["data"].get("køn")
        for m in p["data"].get("ægteskaber") or []:
            if not isinstance(m, dict):
                continue
            spouse = m.get("ægtefælle")
            if empty(spouse):
                continue
            if koen == "M":
                husb, wife = slug, spouse
            elif koen == "K":
                husb, wife = spouse, slug
            else:
                husb, wife = slug, spouse
            idx = get_or_create(husb, wife)
            if idx is not None and (not empty(m.get("dato")) or not empty(m.get("sted"))):
                families[idx]["marriage"] = {
                    "dato": m.get("dato"),
                    "sted": m.get("sted"),
                }

    return families


def validate(persons):
    warnings = []
    for slug, p in persons.items():
        for key in ("far", "mor"):
            ref = p["data"].get(key)
            if not empty(ref) and ref not in persons:
                warnings.append(f"{slug}: {key} '{ref}' har ingen fil i personer/")
        for m in p["data"].get("ægteskaber") or []:
            if not isinstance(m, dict):
                continue
            spouse = m.get("ægtefælle")
            if not empty(spouse) and spouse not in persons:
                warnings.append(f"{slug}: ægtefælle '{spouse}' har ingen fil i personer/")
    return warnings


def emit_note(out, text, level=1):
    lines = text.split("\n")
    out.append(f"{level} NOTE {lines[0]}")
    for line in lines[1:]:
        out.append(f"{level+1} CONT {line}")


def emit_indi(out, slug, indi_id, p, person_famc, person_fams):
    d = p["data"]
    body = p["body"]
    if body.startswith("# "):
        body = body.split("\n", 1)[1] if "\n" in body else ""
    body = body.strip()

    out.append(f"0 @{indi_id}@ INDI")

    navn = d.get("navn") or slug.replace("-", " ").title()
    fornavne = d.get("fornavne") or None
    efternavn = d.get("efternavn") or None
    if not fornavne or not efternavn:
        f, e = split_name(navn)
        fornavne = fornavne or f
        efternavn = efternavn or e
    name_line = f"{fornavne} /{efternavn}/" if efternavn else fornavne
    out.append(f"1 NAME {name_line}")
    if fornavne:
        out.append(f"2 GIVN {fornavne}")
    if efternavn:
        out.append(f"2 SURN {efternavn}")

    koen = d.get("køn")
    if koen in KOEN_TO_SEX:
        out.append(f"1 SEX {KOEN_TO_SEX[koen]}")

    for event_key, tag in [("født", "BIRT"), ("døbt", "CHR"),
                           ("død", "DEAT"), ("begravet", "BURI")]:
        ev = d.get(event_key)
        if not isinstance(ev, dict):
            continue
        if empty(ev.get("dato")) and empty(ev.get("sted")):
            continue
        out.append(f"1 {tag}")
        dt = fmt_date(ev.get("dato"))
        if dt:
            out.append(f"2 DATE {dt}")
        if not empty(ev.get("sted")):
            out.append(f"2 PLAC {ev['sted']}")

    for occ in d.get("erhverv") or []:
        if not empty(occ):
            out.append(f"1 OCCU {occ}")

    for fid in person_famc.get(slug, []):
        out.append(f"1 FAMC @F{fid+1}@")
    for fid in person_fams.get(slug, []):
        out.append(f"1 FAMS @F{fid+1}@")

    for billede in d.get("billeder") or []:
        if empty(billede):
            continue
        out.append("1 OBJE")
        out.append(f"2 FILE {billede}")
        ext = Path(str(billede)).suffix.lstrip(".").lower() or "jpg"
        out.append(f"2 FORM {ext}")

    if body:
        emit_note(out, body, level=1)

    for k in d.get("kilder") or []:
        if not empty(k):
            out.append(f"1 SOUR {k}")


def emit_fam(out, idx, fam, person_id):
    fid = f"F{idx+1}"
    out.append(f"0 @{fid}@ FAM")
    if fam["husb"] and fam["husb"] in person_id:
        out.append(f"1 HUSB @{person_id[fam['husb']]}@")
    if fam["wife"] and fam["wife"] in person_id:
        out.append(f"1 WIFE @{person_id[fam['wife']]}@")
    if fam["marriage"]:
        out.append("1 MARR")
        dt = fmt_date(fam["marriage"].get("dato"))
        if dt:
            out.append(f"2 DATE {dt}")
        if not empty(fam["marriage"].get("sted")):
            out.append(f"2 PLAC {fam['marriage']['sted']}")
    for c in fam["chil"]:
        if c in person_id:
            out.append(f"1 CHIL @{person_id[c]}@")


def main():
    persons = load_persons()
    if not persons:
        print("Ingen personfiler fundet i personer/. Afbryder.", file=sys.stderr)
        sys.exit(1)

    warnings = validate(persons)
    for w in warnings:
        print(f"advarsel: {w}", file=sys.stderr)

    families = build_families(persons)

    person_id = {slug: f"I{i+1}" for i, slug in enumerate(sorted(persons))}
    person_famc = {slug: [] for slug in persons}
    person_fams = {slug: [] for slug in persons}
    for idx, fam in enumerate(families):
        if fam["husb"] in persons:
            person_fams[fam["husb"]].append(idx)
        if fam["wife"] in persons:
            person_fams[fam["wife"]].append(idx)
        for c in fam["chil"]:
            if c in persons:
                person_famc[c].append(idx)

    out = [
        "0 HEAD",
        "1 SOUR famtree",
        "2 VERS 1.0",
        "2 NAME famtree-build",
        "1 GEDC",
        "2 VERS 5.5.1",
        "2 FORM LINEAGE-LINKED",
        "1 CHAR UTF-8",
        "1 LANG Danish",
    ]

    for slug in sorted(persons):
        emit_indi(out, slug, person_id[slug], persons[slug], person_famc, person_fams)

    for idx, fam in enumerate(families):
        emit_fam(out, idx, fam, person_id)

    out.append("0 TRLR")
    OUTPUT_FILE.write_text("\n".join(out) + "\n", encoding="utf-8")
    print(f"Skrev {OUTPUT_FILE.relative_to(ROOT)} — "
          f"{len(persons)} personer, {len(families)} familier, "
          f"{len(warnings)} advarsler")


if __name__ == "__main__":
    main()
