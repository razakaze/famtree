# Famtree

Lokal slægtsforsknings-app i browseren. Tilføj personer, knyt forældre/ægtefæller/børn, vedhæft fotos, skriv noter — og importér/eksportér GEDCOM til MyHeritage, Ancestry, FamilySearch m.fl.

## Kør

```sh
npm install
npm run dev
```

Åbn `http://localhost:5173`.

Data ligger i din browser (IndexedDB) — intet sendes til en server. Brug GEDCOM-eksport regelmæssigt som backup.

## Byg til produktion

```sh
npm run build
npm run preview
```

Den statiske `dist/`-mappe kan deployes hvor som helst (GitHub Pages, Netlify, Cloudflare Pages, eller bare en USB-pind).

## Stak

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Dexie (IndexedDB) + dexie-react-hooks
- react-router-dom v7
- Egenbygget GEDCOM 5.5.1-parser/-eksportør

## Status

MVP: identitet, fire begivenheder (født/døbt/død/begravet), forældre, ægteskaber, børn, fotos, noter, kilder. GEDCOM-import/eksport.

## Ikke endnu

- Billeder eksporteres ikke til GEDCOM (kun referencer)
- Træ-visualisering (anetavle / efterkommertavle)
- Søgning på datoer / steder
- Sammenfletning af dubletter ved GEDCOM-import
- Eksport som zip med GEDCOM + billeder
