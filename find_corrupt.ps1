# Script para derivar os bytes corrompidos de cada emoji
# e verificar quais existem no arquivo
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$filePath = 'index.html'
$b = [System.IO.File]::ReadAllBytes($filePath)

# Win1252 encoding para converter bytes altos
$win1252 = [System.Text.Encoding]::GetEncoding(1252)
$utf8 = [System.Text.Encoding]::UTF8

# Funcao para calcular bytes corrompidos de um emoji
function Get-CorruptBytes {
    param([byte[]]$originalUtf8)
    
    # Cada byte original e' interpretado como Win-1252, depois re-encoded como UTF-8
    $result = New-Object System.Collections.Generic.List[byte]
    foreach ($byte in $originalUtf8) {
        if ($byte -le 0x7F) {
            # ASCII - nao muda
            $result.Add($byte)
        } else {
            # Converte o byte como Win-1252 para string, depois pega os bytes UTF-8
            $char = $win1252.GetString([byte[]]@($byte))
            $reencoded = $utf8.GetBytes($char)
            foreach ($rb in $reencoded) { $result.Add($rb) }
        }
    }
    return $result.ToArray()
}

# Funcao para buscar sequencia de bytes
function Find-Bytes {
    param([byte[]]$data, [byte[]]$search)
    $count = 0
    for ($i = 0; $i -le ($data.Length - $search.Length); $i++) {
        $found = $true
        for ($j = 0; $j -lt $search.Length; $j++) {
            if ($data[$i + $j] -ne $search[$j]) { $found = $false; break }
        }
        if ($found) { $count++ }
    }
    return $count
}

# Lista de emojis para verificar
$emojis = @(
    @{ name="📋"; utf8=[byte[]](0xF0,0x9F,0x93,0x8B) },
    @{ name="🗂️"; utf8=[byte[]](0xF0,0x9F,0x97,0x82,0xEF,0xB8,0x8F) },
    @{ name="💰"; utf8=[byte[]](0xF0,0x9F,0x92,0xB0) },
    @{ name="📦"; utf8=[byte[]](0xF0,0x9F,0x93,0xA6) },
    @{ name="⚡"; utf8=[byte[]](0xE2,0x9A,0xA1) },
    @{ name="💧"; utf8=[byte[]](0xF0,0x9F,0x92,0xA7) },
    @{ name="📅"; utf8=[byte[]](0xF0,0x9F,0x93,0x85) },
    @{ name="🏢"; utf8=[byte[]](0xF0,0x9F,0x8F,0xA2) },
    @{ name="👤"; utf8=[byte[]](0xF0,0x9F,0x91,0xA4) },
    @{ name="👷"; utf8=[byte[]](0xF0,0x9F,0x91,0xB7) },
    @{ name="📷"; utf8=[byte[]](0xF0,0x9F,0x93,0xB7) },
    @{ name="📄"; utf8=[byte[]](0xF0,0x9F,0x93,0x84) },
    @{ name="👥"; utf8=[byte[]](0xF0,0x9F,0x91,0xA5) },
    @{ name="🌎"; utf8=[byte[]](0xF0,0x9F,0x8C,0x8E) },
    @{ name="📊"; utf8=[byte[]](0xF0,0x9F,0x93,0x8A) },
    @{ name="🔧"; utf8=[byte[]](0xF0,0x9F,0x94,0xA7) },
    @{ name="💬"; utf8=[byte[]](0xF0,0x9F,0x92,0xAC) },
    @{ name="✅"; utf8=[byte[]](0xE2,0x9C,0x85) },
    @{ name="❌"; utf8=[byte[]](0xE2,0x9D,0x8C) },
    @{ name="⚠️"; utf8=[byte[]](0xE2,0x9A,0xA0,0xEF,0xB8,0x8F) },
    @{ name="🔒"; utf8=[byte[]](0xF0,0x9F,0x94,0x92) },
    @{ name="🔓"; utf8=[byte[]](0xF0,0x9F,0x94,0x93) },
    @{ name="🏠"; utf8=[byte[]](0xF0,0x9F,0x8F,0xA0) },
    @{ name="📱"; utf8=[byte[]](0xF0,0x9F,0x93,0xB1) },
    @{ name="🔑"; utf8=[byte[]](0xF0,0x9F,0x94,0x91) },
    @{ name="📈"; utf8=[byte[]](0xF0,0x9F,0x93,0x88) },
    @{ name="📉"; utf8=[byte[]](0xF0,0x9F,0x93,0x89) },
    @{ name="💼"; utf8=[byte[]](0xF0,0x9F,0x92,0xBC) },
    @{ name="🛒"; utf8=[byte[]](0xF0,0x9F,0x9B,0x92) },
    @{ name="📝"; utf8=[byte[]](0xF0,0x9F,0x93,0x9D) },
    @{ name="🔍"; utf8=[byte[]](0xF0,0x9F,0x94,0x8D) },
    @{ name="📞"; utf8=[byte[]](0xF0,0x9F,0x93,0x9E) },
    @{ name="📧"; utf8=[byte[]](0xF0,0x9F,0x93,0xA7) },
    @{ name="🔔"; utf8=[byte[]](0xF0,0x9F,0x94,0x94) },
    @{ name="ℹ️"; utf8=[byte[]](0xE2,0x84,0xB9,0xEF,0xB8,0x8F) },
    @{ name="🎯"; utf8=[byte[]](0xF0,0x9F,0x8E,0xAF) },
    @{ name="🚀"; utf8=[byte[]](0xF0,0x9F,0x9A,0x80) },
    @{ name="💡"; utf8=[byte[]](0xF0,0x9F,0x92,0xA1) },
    @{ name="🔄"; utf8=[byte[]](0xF0,0x9F,0x94,0x84) },
    @{ name="💳"; utf8=[byte[]](0xF0,0x9F,0x92,0xB3) },
    @{ name="🗑️"; utf8=[byte[]](0xF0,0x9F,0x97,0x91,0xEF,0xB8,0x8F) },
    @{ name="✏️"; utf8=[byte[]](0xE2,0x9C,0x8F,0xEF,0xB8,0x8F) },
    @{ name="💊"; utf8=[byte[]](0xF0,0x9F,0x92,0x8A) },
    @{ name="🔐"; utf8=[byte[]](0xF0,0x9F,0x94,0x90) },
    @{ name="📌"; utf8=[byte[]](0xF0,0x9F,0x93,0x8C) },
    @{ name="🏷️"; utf8=[byte[]](0xF0,0x9F,0x8F,0xB7,0xEF,0xB8,0x8F) },
    @{ name="💲"; utf8=[byte[]](0xF0,0x9F,0x92,0xB2) },
    @{ name="📐"; utf8=[byte[]](0xF0,0x9F,0x93,0x90) },
    @{ name="🎨"; utf8=[byte[]](0xF0,0x9F,0x8E,0xA8) },
    @{ name="🌐"; utf8=[byte[]](0xF0,0x9F,0x8C,0x90) },
    @{ name="💻"; utf8=[byte[]](0xF0,0x9F,0x92,0xBB) },
    @{ name="🖥️"; utf8=[byte[]](0xF0,0x9F,0x96,0xA5,0xEF,0xB8,0x8F) },
    @{ name="⭐"; utf8=[byte[]](0xE2,0xAD,0x90) }
)

Write-Host "=== Verificando emojis no arquivo ==="
Write-Host ""

foreach ($e in $emojis) {
    $corrupt = Get-CorruptBytes -originalUtf8 $e.utf8
    $countCorrect = Find-Bytes -data $b -search $e.utf8
    $countCorrupt = Find-Bytes -data $b -search $corrupt
    
    $corruptHex = ($corrupt | ForEach-Object { $_.ToString('X2') }) -join ' '
    
    if ($countCorrupt -gt 0) {
        Write-Host "CORROMPIDO [$($e.name)]: $countCorrupt ocorrencias | bytes: $corruptHex"
    } elseif ($countCorrect -gt 0) {
        Write-Host "OK [$($e.name)]: $countCorrect ocorrencias corretas"
    }
    # Se zero em ambos, nao aparece no arquivo
}

Write-Host ""
Write-Host "=== Fim da verificacao ==="
