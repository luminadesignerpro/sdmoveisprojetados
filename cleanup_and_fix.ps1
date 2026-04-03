# SD Móveis - Limpeza e Diagnóstico
# Este script remove arquivos temporários e logs de erro que consomem espaço.

Write-Host "--- Iniciando Limpeza de SD Móveis ---" -ForegroundColor Amber

# 1. Remover logs de erro do Java (JVM crashes)
Write-Host "Removendo logs de crash (hs_err_pid*.log e replay_pid*.log)..."
Remove-Item -Path ".\hs_err_pid*.log" -ErrorAction SilentlyContinue
Remove-Item -Path ".\replay_pid*.log" -ErrorAction SilentlyContinue

# 2. Limpar pastas de build (vão ser recriadas no próximo build)
Write-Host "Limpando pastas de build do Flutter e Capacitor..."
If (Test-Path ".\sd_moveis_ar\build") {
    Remove-Item -Path ".\sd_moveis_ar\build" -Recurse -Force -ErrorAction SilentlyContinue
}
If (Test-Path ".\android\.gradle") {
    Remove-Item -Path ".\android\.gradle" -Recurse -Force -ErrorAction SilentlyContinue
}
If (Test-Path ".\android\app\build") {
    Remove-Item -Path ".\android\app\build" -Recurse -Force -ErrorAction SilentlyContinue
}

# 3. Limpar cache de pacotes (opcional, mas economiza muito espaço)
Write-Host "Limpando pastas temporárias..."
Remove-Item -Path ".\projeto.tar.gz" -ErrorAction SilentlyContinue
Remove-Item -Path ".\projeto.zip" -ErrorAction SilentlyContinue

Write-Host "--- Limpeza Concluída! ---" -ForegroundColor Green
Write-Host "Dica: Você tem 4GB de RAM, o sistema está usando muita 'Memória Virtual' (PageFile) no disco."
Write-Host "Feche o Chrome e outras abas pesadas antes de gerar o APK."
