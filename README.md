# Famtree

Slægtsdokumentation for familien Nygaard / Jensen / Sønderup.

## Indhold

- **`transkriptioner.md`** — transkriptioner af originale dokumenter (kirkebogsattester, breve, stamtavler m.m.). Den primære kilde-fil. Alle observationer i personfilerne refererer tilbage hertil med koder som A1, B5, C3, osv.
- **`personer/`** — én Markdown-fil pr. person. YAML-frontmatter med strukturerede data, brødtekst med biografi/noter.
- **`billeder/`** — fotos af personer og dokumenter. Refereres fra personernes filer.
- **`scripts/build_gedcom.py`** — genererer `famtree.ged` ud fra `personer/`-filerne.
- **`famtree.ged`** — den genererede GEDCOM-fil, klar til import i MyHeritage / Ancestry / FamilySearch / Geni m.fl. Genereres af build-scriptet og committes med så den altid er klar.

## Tilføj eller redigér en person

1. Find personens fil i `personer/`, eller opret en ny. Slug-konvention: små ASCII-bogstaver, bindestreger, danske bogstaver translittereres (`æ→ae`, `ø→oe`, `å→aa`). F.eks. `vera-sharling.md`, `marinus-soenderup.md`.
2. Kopiér strukturen fra `personer/_skabelon.md`.
3. Udfyld YAML-frontmatter med det du ved. Lad felter være tomme eller skriv `~` / `"?"` for ukendt.
4. Henvis til andre personer med deres slug (filnavn uden `.md`) — f.eks. `far: jens-jensen`.
5. Skriv biografi, noter, og åbne spørgsmål i brødteksten under frontmatteren. Den ryger med som NOTE på personen i GEDCOM-filen.

## Tilføj et foto

1. Læg billedet i `billeder/` med et beskrivende ASCII-filnavn, f.eks. `sharling-vera-barn.jpg` eller `attest-marinus-vielse-1923.jpg`.
2. Tilføj stien til `billeder:`-listen i den/de relevante personfiler:
   ```yaml
   billeder:
     - billeder/sharling-vera-barn.jpg
   ```
3. Beskriv evt. billedet i personens brødtekst.

## Generér GEDCOM

```sh
python3 scripts/build_gedcom.py
```

Outputtet er `famtree.ged` i roden. I MyHeritage: `Familietræ → Importér familietræ → vælg GEDCOM-fil`.

## Konventioner

- **Datoer**: ISO-format (`1898-12-28`), kun år (`1898`), eller udelad/skriv `"?"` for ukendt.
- **Køn**: `M` (mand) eller `K` (kvinde). Build-scriptet oversætter til GEDCOM's `M`/`F`.
- **Slug-referencer**: en person der refereres som `far`, `mor` eller `ægtefælle` skal også have sin egen fil (selv om filen kun har et navn).

## Åbne forskningsspørgsmål

Sporene der stadig mangler at blive løst — se også observationerne nederst i `transkriptioner.md`:

- **Hvilken af Marinus' sønner er Birgits far?** Gunnar (1924), Oluf (1925) eller Leif (1934). Placeholder-fil: `personer/ukendt-soenderup-bror.md`.
- **Den svenske "tip-oldemor Birgit"** nævnt i C3 (brev af 12/5 2000) — ingen kendte hendes navn i 2000.
- **Vera Sharlings ægtefælle**: A2 (1999) er adresseret til "Ellen Vera Mikkelsen" — er Vera Sharling identisk med hende, og hvem var Mikkelsen?
- **Bent Nygaards slægt**: ingen dokumenter endnu. Tysk gren (Wichmann/Dietz, C1–C2) — er der forbindelse?

## Personlig fil

Du er ikke selv repræsenteret i træet endnu. Opret f.eks. `personer/dit-navn.md` med `far: bent-nygaard` og `mor: birgit-nygaard`.

## Note fra originalen

Stamtavlen i A1 har en håndskreven note: *"Der er nogle småfejl som jeg kender til, men som jeg ikke har fået rettet."* Behandl A1-data som omtrentligt indtil det er krydstjekket mod kirkebøger.
