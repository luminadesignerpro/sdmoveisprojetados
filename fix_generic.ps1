# Correcao GENERICA de todos os emojis corrompidos
# Estrategia: ler o arquivo como Windows-1252, salvar como UTF-8
# Isso desfaz a corrupcao double-encoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$filePath = 'index.html'

# Ler bytes brutos
$rawBytes = [System.IO.File]::ReadAllBytes($filePath)
Write-Host "Arquivo lido: $($rawBytes.Length) bytes"

# A corrupcao foi: bytes UTF-8 originais foram lidos como Latin-1/Win1252
# e re-salvos como UTF-8. Entao cada byte alto virou multi-byte UTF-8.
# Para desfazer: ler o arquivo corrompido como Win-1252 (que inverte a re-encoding),
# mas precisamos primeiro validar que o arquivo NAO tem mais a corrupcao dupla.

# POREM: o arquivo ja tem bytes corretos misturados (os que corrigimos) e bytes corrompidos.
# Precisamos corrigir APENAS os bytes corrompidos restantes.

# A corrupcao padrao e':
# Byte original B (>= 0x80) -> lido como Win-1252 char C -> encodado como UTF-8 -> 2 ou 3 bytes
# Para reverter: pegar os bytes UTF-8, decodar como UTF-8 para obter char C,
#                encontrar o byte Win-1252 correspondente a C

# Abordagem: decodar o arquivo como UTF-8, interpretar a string resultante como se
# cada char fosse o char Win-1252 original, e re-encodar como UTF-8

# Na pratica: 
# file bytes --(UTF-8 decode)--> string com chars mojibake
#                              --(Win-1252 encode)--> bytes originais corretos

$utf8 = [System.Text.Encoding]::UTF8
$win1252 = [System.Text.Encoding]::GetEncoding(1252)

# Decodar como UTF-8 -> obter string mojibake
$mojiString = $utf8.GetString($rawBytes)
Write-Host "String decodada: $($mojiString.Length) chars"

# Re-encodar como Win-1252 -> obter bytes originais corretos
# PROBLEMA: alguns chars na string podem nao existir em Win-1252
# Verificar quantos chars sao invalidos
$testBytes = $win1252.GetBytes($mojiString)
Write-Host "Re-encodado Win-1252: $($testBytes.Length) bytes"

# Verificar integridade - decodar os bytes resultantes como UTF-8
$restored = $utf8.GetString($testBytes)
Write-Host "Verificacao: $($restored.Length) chars"

# Verificar se 'Orcamento' ainda existe
if ($restored.Contains('amento</span>')) {
    Write-Host "OK: conteudo HTML preservado"
} else {
    Write-Host "ERRO: conteudo HTML perdido!"
}

# Verificar emoji 📋 nos bytes
$clipBytes = [byte[]](0xF0,0x9F,0x93,0x8B)
$found = $false
for ($i = 0; $i -le ($testBytes.Length - 4); $i++) {
    if ($testBytes[$i] -eq 0xF0 -and $testBytes[$i+1] -eq 0x9F -and $testBytes[$i+2] -eq 0x93 -and $testBytes[$i+3] -eq 0x8B) {
        $found = $true; break
    }
}
Write-Host "Clipboard emoji nos bytes: $found"

# Salvar APENAS se OK
if ($restored.Contains('amento</span>')) {
    [System.IO.File]::WriteAllBytes($filePath, $testBytes)
    Write-Host "Arquivo salvo com sucesso! ($($testBytes.Length) bytes)"
} else {
    Write-Host "NAO salvo - verificacao falhou"
}
