# Desliga o servidor de dev (Next.js, porta 3001).
# Pensado pra ser chamado pelo Agendador de Tarefas do Windows às 21:00.

$ErrorActionPreference = "SilentlyContinue"
$projectPath = "C:\Users\isaac\OneDrive\Desktop\EduGestao"
$pidFile = Join-Path $projectPath "scripts\dev-server.pid"

$connections = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
if (-not $connections) {
    Write-Output "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - nenhum servidor rodando na porta 3001."
    if (Test-Path $pidFile) { Remove-Item $pidFile -Force }
    exit 0
}

foreach ($conn in $connections) {
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
}

if (Test-Path $pidFile) { Remove-Item $pidFile -Force }
Write-Output "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - servidor dev na porta 3001 finalizado."
