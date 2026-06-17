@echo off
REM Démarre Docker (si installé) puis ouvre EduGestion dans le navigateur.
set URL=http://localhost:5180/app/login
cd /d "%~dp0.."

where docker >nul 2>&1
if %ERRORLEVEL%==0 (
  docker compose up -d >nul 2>&1
  timeout /t 5 /nobreak >nul
)

start "" "%URL%"
