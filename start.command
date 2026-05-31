#!/usr/bin/env bash
# Dobbeltklik denne fil (macOS) for at starte Famtree.
# Linux: kør den fra en terminal med:  bash start.command
cd "$(dirname "$0")" || exit 1

if ! command -v npm >/dev/null 2>&1; then
  echo
  echo "  Node.js er ikke installeret."
  echo "  Hent og installer den ('LTS'-versionen) fra:  https://nodejs.org"
  echo "  Kør derefter denne fil igen."
  echo
  read -r -p "  Tryk Enter for at lukke. "
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "  Installerer programmet (kun første gang, kan tage et minut)..."
  npm install || { echo "  Installation fejlede."; read -r -p "  Tryk Enter for at lukke. "; exit 1; }
fi

echo "  Starter Famtree. Browseren åbner om lidt på http://localhost:5173"
echo "  Luk dette vindue for at stoppe appen."
(
  sleep 3
  if command -v open >/dev/null 2>&1; then open http://localhost:5173
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open http://localhost:5173
  fi
) &

npm run dev
