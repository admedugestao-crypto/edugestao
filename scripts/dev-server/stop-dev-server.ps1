$ErrorActionPreference = "SilentlyContinue"

$projectPath = "C:\Users\isaac\OneDrive\Desktop\EduGestao"
$logPath = Join-Path $projectPath "scripts\dev-server\dev-server.log"

$conns = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
if (-not $conns) {
    Add-Content -Path $logPath -Value "$(Get-Date -Format o) - nenhum servidor rodando na porta 3001, nada a fazer."
    exit 0
}

foreach ($conn in $conns) {
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
}

Add-Content -Path $logPath -Value "$(Get-Date -Format o) - dev server na porta 3001 encerrado."
