# Liga o servidor de dev (Next.js, porta 3001) em segundo plano.
# Pensado pra ser chamado pelo Agendador de Tarefas do Windows às 06:00.

$ErrorActionPreference = "Stop"
$projectPath = "C:\Users\isaac\OneDrive\Desktop\EduGestao"
$outLog = Join-Path $projectPath "scripts\dev-server.out.log"
$errLog = Join-Path $projectPath "scripts\dev-server.err.log"
$pidFile = Join-Path $projectPath "scripts\dev-server.pid"

$existing = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
if ($existing) {
    Write-Output "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - servidor ja rodando na porta 3001, nada a fazer."
    exit 0
}

Set-Location $projectPath
$proc = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev", "--", "-p", "3001" `
    -WindowStyle Hidden -RedirectStandardOutput $outLog -RedirectStandardError $errLog -PassThru

$proc.Id | Out-File -FilePath $pidFile -Encoding ascii
Write-Output "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - servidor dev iniciado (PID $($proc.Id))."
