# Crée un raccourci bureau Windows pour ouvrir l'application.
#
# Usage (PowerShell) :
#   .\scripts\create-desktop-shortcut.ps1
#   .\scripts\create-desktop-shortcut.ps1 -Url "https://gestion.mon-ecole.cm/app/login" -Name "Mon Ecole"
#
param(
    [string]$Url = "http://localhost:5180/app/login",
    [string]$Name = "EduGestion"
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$IconPath = Join-Path $ScriptDir "client\edugestion.ico"
$Desktop = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $Desktop "$Name.lnk"

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $Url
$Shortcut.Description = "Gestion scolaire — élèves, notes et bulletins"
if (Test-Path $IconPath) {
    $Shortcut.IconLocation = "$IconPath,0"
}
$Shortcut.Save()

Write-Host "Raccourci créé : $ShortcutPath"
Write-Host "URL : $Url"
