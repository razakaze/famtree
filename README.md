# Famtree

Lokal slægtsforsknings-app i browseren. Tilføj personer, knyt forældre/ægtefæller/børn, vedhæft fotos, skriv noter — og importér/eksportér GEDCOM til MyHeritage, Ancestry, FamilySearch m.fl.

## Nem start (anbefalet)

Appen kører på din egen computer. Du skal kun gøre tre ting, og kun det første tager lidt tid:

1. **Installér Node.js én gang.** Hent "LTS"-versionen på [nodejs.org](https://nodejs.org) og klik igennem installationen.
2. **Hent projektet.** På GitHub: grønne **Code**-knap → **Download ZIP**, og pak den ud. (Eller `git clone`, hvis du kender det.)
3. **Start appen:**
   - **Mac:** dobbeltklik på **`start.command`**
   - **Windows:** dobbeltklik på **`start.bat`**

   Et terminalvindue åbner, installerer appen første gang, og browseren åbner automatisk på `http://localhost:5173`. Luk vinduet for at stoppe appen.

> Får du på Mac en advarsel om "uidentificeret udvikler", så højreklik på `start.command` → **Åbn** → **Åbn**.

Data ligger i din egen browser (IndexedDB) — intet sendes til en server. Brug GEDCOM-eksport jævnligt som backup.

## Start manuelt (hvis du foretrækker terminalen)

```sh
npm install
npm run dev
```

Åbn `http://localhost:5173`.

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
