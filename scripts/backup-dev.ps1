# Backup diario do banco de DEV (ambiente dev) pra pasta do OneDrive.
# Pensado pra ser chamado pelo Agendador de Tarefas do Windows, todo dia
# a 00:00. Nao precisa de pg_dump instalado - usa Node + o pacote "pg"
# que ja faz parte do projeto, e grava um JSON com todas as tabelas.

$ErrorActionPreference = "Stop"
$projectPath = "C:\Users\isaac\OneDrive\Desktop\EduGestao"
$destino     = "C:\Users\isaac\OneDrive\backup edugestao"
$logFile     = Join-Path $projectPath "scripts\backup-dev.log"

function Log($msg) {
    $linha = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - $msg"
    Write-Output $linha
    Add-Content -Path $logFile -Value $linha
}

try {
    Set-Location $projectPath
    if (-not (Test-Path $destino)) { New-Item -ItemType Directory -Path $destino -Force | Out-Null }

    Log "Iniciando backup do ambiente dev..."
    & node "scripts\backup-dev.js" $destino
    if ($LASTEXITCODE -ne 0) { throw "Script de backup terminou com erro (codigo $LASTEXITCODE)." }

    # Mantem só os ultimos 30 dias de backup, pra nao crescer pra sempre.
    Get-ChildItem -Path $destino -Filter "dev_backup_*.json" |
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
        Remove-Item -Force

    Log "Backup concluido com sucesso."
}
catch {
    Log "ERRO: $($_.Exception.Message)"
    throw
}
