# Verifica o estado atual do index.html - sem usar emojis nos strings
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$filePath = 'index.html'
$b = [System.IO.File]::ReadAllBytes($filePath)
Write-Host "Tamanho do arquivo: $($b.Length) bytes"

# Verifica se ha bytes de corrupcao tipica: 0xC3 seguido de byte entre 0x80-0xBF
# dentro de contexto de emoji 4-byte (0xF0, ...)
# Sequencia corrompida tipica de emoji 4-byte: F0 -> C3 B0, 9F -> C2 9F, etc.

# Conta sequencias corrompidas - ex: C3 B0 C2 9F (primeiros 2 bytes corrompidos do emoji F0 9F)
$corruptCount = 0
for ($i = 0; $i -le ($b.Length - 8); $i++) {
    # Padrao corrompido de emoji 4-byte começa com: C3 B0 C2 9F
    if ($b[$i] -eq 0xC3 -and $b[$i+1] -eq 0xB0 -and $b[$i+2] -eq 0xC2 -and $b[$i+3] -eq 0x9F) {
        $corruptCount++
    }
}
Write-Host "Sequencias corrompidas (C3 B0 C2 9F): $corruptCount"

# Conta emojis corretos - ex: F0 9F (inicio correto de emoji 4-byte)
$correctCount = 0
for ($i = 0; $i -le ($b.Length - 2); $i++) {
    if ($b[$i] -eq 0xF0 -and $b[$i+1] -eq 0x9F) {
        $correctCount++
    }
}
Write-Host "Emojis 4-byte corretos (F0 9F): $correctCount"

# Verifica bytes altos invalidos (> 0xC0 que nao fazem parte de UTF-8 valido)
# Conta pares C3 seguidos de byte alto que seriam corrompidos
$c3Count = 0
for ($i = 0; $i -le ($b.Length - 4); $i++) {
    if ($b[$i] -eq 0xC3 -and ($b[$i+1] -band 0x80) -eq 0x80 -and
        $b[$i+2] -eq 0xC2 -and ($b[$i+3] -band 0x80) -eq 0x80) {
        $c3Count++
    }
}
Write-Host "Pares C3xx C2xx (possiveis corrupcoes): $c3Count"

# Verifica se conteudo HTML esta intacto
$utf8 = [System.Text.Encoding]::UTF8
$content = $utf8.GetString($b)
if ($content.Contains('Lumina Designer')) {
    Write-Host "OK: 'Lumina Designer' encontrado"
} else {
    Write-Host "ERRO: 'Lumina Designer' nao encontrado"
}
if ($content.Contains('Orcamento') -or $content.Contains('amento</span>')) {
    Write-Host "OK: texto de orcamento encontrado"
}

Write-Host ""
Write-Host "Mostrando primeiros 100 bytes do arquivo:"
$b[0..99] | ForEach-Object { $_.ToString('X2') } | Write-Host
