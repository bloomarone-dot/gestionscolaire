# Copie la dernière sauvegarde (ou la base Docker) vers deploy-data/ pour commit Git.
param(
    [string]$ArchivePath = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$deployDir = Join-Path $Root "deploy-data"
$tenantsDir = Join-Path $deployDir "tenants"
New-Item -ItemType Directory -Force -Path $tenantsDir | Out-Null

if ($ArchivePath -and (Test-Path $ArchivePath)) {
    $temp = Join-Path $env:TEMP "sync-deploy-$(Get-Random)"
    Expand-Archive -Path $ArchivePath -DestinationPath $temp -Force
    $inner = Get-ChildItem $temp | Select-Object -First 1
    $src = if (Test-Path (Join-Path $inner.FullName "master.db")) { $inner.FullName } else { $temp }
    Copy-Item (Join-Path $src "master.db") $deployDir -Force
    Copy-Item (Join-Path $src "tenants\*.db") $tenantsDir -Force
    Remove-Item -Recurse -Force $temp
} else {
    docker compose stop backend | Out-Null
    try {
        docker compose cp "backend:/app/data/master.db" (Join-Path $deployDir "master.db")
        docker compose exec -T backend sh -c "ls /app/data/tenants/*.db" | ForEach-Object {
            $name = Split-Path $_ -Leaf
            docker compose cp "backend:/app/data/tenants/$name" (Join-Path $tenantsDir $name)
        }
    } finally {
        docker compose start backend | Out-Null
    }
}

Write-Host "deploy-data/ prêt pour git add deploy-data/"
