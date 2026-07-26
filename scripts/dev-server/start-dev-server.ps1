$ErrorActionPreference = "Stop"

$projectPath = "C:\Users\isaac\OneDrive\Desktop\EduGestao"
$logPath = Join-Path $projectPath "scripts\dev-server\dev-server.log"

$existing = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
if ($existing) {
    Add-Content -Path $logPath -Value "$(Get-Date -Format o) - servidor ja rodando na porta 3001, nada a fazer."
    exit 0
}

Set-Location $projectPath
Add-Content -Path $logPath -Value "$(Get-Date -Format o) - iniciando dev server na porta 3001"

Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c npm run dev -- -p 3001 >> `"$logPath`" 2>&1" `
    -WorkingDirectory $projectPath `
    -WindowStyle Hidden
