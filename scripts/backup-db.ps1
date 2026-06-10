# Sauvegarde master.db + bases tenant depuis le conteneur Docker backend.
# Usage : .\scripts\backup-db.ps1
# Le dossier backups/ est ignoré par Git — transférez l'archive à votre collègue de façon sécurisée.

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outDir = Join-Path $Root "backups\db-$stamp"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Write-Host "Arrêt du backend (évite la corruption SQLite)..."
docker compose stop backend | Out-Null

try {
    Write-Host "Copie master.db..."
    docker compose cp "backend:/app/data/master.db" (Join-Path $outDir "master.db")

    Write-Host "Copie tenants/..."
    docker compose cp "backend:/app/data/tenants" (Join-Path $outDir "tenants")
}
finally {
    Write-Host "Redémarrage du backend..."
    docker compose start backend | Out-Null
}

$zipPath = "$outDir.zip"
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
Compress-Archive -Path $outDir -DestinationPath $zipPath
Remove-Item -Recurse -Force $outDir

Write-Host ""
Write-Host "Sauvegarde créée : $zipPath"
Write-Host "Envoyez ce fichier à votre collègue (WeTransfer, Drive chiffré, etc.)."
Write-Host "Ne le committez JAMAIS dans Git."
