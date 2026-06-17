# Restaure master.db + tenants dans le conteneur Docker backend.
# Usage : .\scripts\restore-db.ps1 -ArchivePath "backups\db-20260609-120000.zip"

param(
    [Parameter(Mandatory = $true)]
    [string]$ArchivePath
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not (Test-Path $ArchivePath)) {
    throw "Archive introuvable : $ArchivePath"
}

$tempDir = Join-Path $env:TEMP "edusaas-restore-$(Get-Random)"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

try {
    Expand-Archive -Path $ArchivePath -DestinationPath $tempDir -Force
    $payload = Get-ChildItem $tempDir | Select-Object -First 1
    if ($payload.PSIsContainer -and (Test-Path (Join-Path $payload.FullName "master.db"))) {
        $dataDir = $payload.FullName
    } elseif (Test-Path (Join-Path $tempDir "master.db")) {
        $dataDir = $tempDir
    } else {
        throw "Archive invalide : master.db introuvable"
    }

    $master = Join-Path $dataDir "master.db"
    $tenants = Join-Path $dataDir "tenants"

    if (-not (Test-Path $master)) {
        throw "master.db manquant dans l'archive"
    }

    Write-Host "Arrêt du backend..."
    docker compose stop backend | Out-Null

    Write-Host "Restauration master.db..."
    docker compose cp $master "backend:/app/data/master.db"

    if (Test-Path $tenants) {
        Write-Host "Restauration tenants/..."
        docker compose exec -T backend sh -c "rm -rf /app/data/tenants && mkdir -p /app/data/tenants"
        Get-ChildItem $tenants -Filter "*.db" | ForEach-Object {
            docker compose cp $_.FullName "backend:/app/data/tenants/$($_.Name)"
        }
    }

    Write-Host "Redémarrage du backend..."
    docker compose up -d backend | Out-Null

    Write-Host ""
    Write-Host "Restauration terminée. Vérifiez SEED_DEMO_ON_START=false dans .env"
    Write-Host "Puis connectez-vous avec les identifiants de votre établissement."
}
finally {
    if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
}
