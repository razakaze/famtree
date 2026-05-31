@echo off
rem Dobbeltklik denne fil (Windows) for at starte Famtree.
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js er ikke installeret.
  echo   Hent og installer den ^("LTS"-versionen^) fra:  https://nodejs.org
  echo   Koer derefter denne fil igen.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo   Installerer programmet ^(kun foerste gang, kan tage et minut^)...
  call npm install
  if errorlevel 1 (
    echo   Installation fejlede.
    pause
    exit /b 1
  )
)

echo   Starter Famtree. Browseren aabner om lidt paa http://localhost:5173
echo   Luk dette vindue for at stoppe appen.
start "" http://localhost:5173
call npm run dev
