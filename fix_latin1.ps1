# Correcao DEFINITIVA: converte bytes Latin-1 isolados para UTF-8
# Os bytes invalidos sao caracteres acentuados do Portugues (Latin-1 isolado)
# Estrategia: percorrer byte a byte e converter bytes invalidos ISO-8859-1 -> UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$filePath = 'index.html'
$b = [System.IO.File]::ReadAllBytes($filePath)
Write-Host "Arquivo: $($b.Length) bytes"

$latin1 = [System.Text.Encoding]::GetEncoding('ISO-8859-1')
$utf8 = [System.Text.Encoding]::UTF8

$result = New-Object System.Collections.Generic.List[byte]
$i = 0
$fixed = 0

while ($i -lt $b.Length) {
    $byte = $b[$i]
    
    if ($byte -le 0x7F) {
        # ASCII puro - passa direto
        $result.Add($byte)
        $i++
    } elseif ($byte -ge 0xC2 -and $byte -le 0xDF) {
        # Possivel sequencia UTF-8 de 2 bytes
        if ($i+1 -lt $b.Length -and ($b[$i+1] -band 0xC0) -eq 0x80) {
            # UTF-8 valido de 2 bytes
            $result.Add($byte)
            $result.Add($b[$i+1])
            $i += 2
        } else {
            # Byte invalido - converter Latin-1 para UTF-8
            $char = $latin1.GetString([byte[]]@($byte))
            $utf8bytes = $utf8.GetBytes($char)
            foreach ($rb in $utf8bytes) { $result.Add($rb) }
            $fixed++
            $i++
        }
    } elseif ($byte -ge 0xE0 -and $byte -le 0xEF) {
        # Possivel sequencia UTF-8 de 3 bytes
        if ($i+2 -lt $b.Length -and ($b[$i+1] -band 0xC0) -eq 0x80 -and ($b[$i+2] -band 0xC0) -eq 0x80) {
            # UTF-8 valido de 3 bytes
            $result.Add($byte)
            $result.Add($b[$i+1])
            $result.Add($b[$i+2])
            $i += 3
        } else {
            # Byte invalido - converter Latin-1 para UTF-8
            $char = $latin1.GetString([byte[]]@($byte))
            $utf8bytes = $utf8.GetBytes($char)
            foreach ($rb in $utf8bytes) { $result.Add($rb) }
            $fixed++
            $i++
        }
    } elseif ($byte -ge 0xF0 -and $byte -le 0xF4) {
        # Possivel sequencia UTF-8 de 4 bytes
        if ($i+3 -lt $b.Length -and ($b[$i+1] -band 0xC0) -eq 0x80 -and ($b[$i+2] -band 0xC0) -eq 0x80 -and ($b[$i+3] -band 0xC0) -eq 0x80) {
            # UTF-8 valido de 4 bytes (emoji!)
            $result.Add($byte)
            $result.Add($b[$i+1])
            $result.Add($b[$i+2])
            $result.Add($b[$i+3])
            $i += 4
        } else {
            # Byte invalido - converter Latin-1 para UTF-8
            $char = $latin1.GetString([byte[]]@($byte))
            $utf8bytes = $utf8.GetBytes($char)
            foreach ($rb in $utf8bytes) { $result.Add($rb) }
            $fixed++
            $i++
        }
    } else {
        # Byte invalido (0x80-0xBF isolado, 0xF5+, 0xC0, 0xC1)
        $char = $latin1.GetString([byte[]]@($byte))
        $utf8bytes = $utf8.GetBytes($char)
        foreach ($rb in $utf8bytes) { $result.Add($rb) }
        $fixed++
        $i++
    }
}

$newBytes = $result.ToArray()
Write-Host "Bytes corrigidos: $fixed"
Write-Host "Tamanho final: $($newBytes.Length) bytes"

# Verificacoes basicas
$content = $utf8.GetString($newBytes)
$checks = @(
    @{ term = 'SD M'; desc = 'SD Moveis' },
    @{ term = 'Projetados'; desc = 'Projetados' },
    @{ term = 'Orcamento'; desc = 'Orcamento' },
    @{ term = '<!DOCTYPE html>'; desc = 'DOCTYPE' },
    @{ term = '</html>'; desc = 'closing tag' }
)
$allOk = $true
foreach ($c in $checks) {
    if ($content.Contains($c.term)) {
        Write-Host "OK: '$($c.desc)' encontrado"
    } else {
        Write-Host "FALHOU: '$($c.desc)' nao encontrado"
        $allOk = $false
    }
}

# Verificar emojis 4-byte
$emojiCount = 0
for ($j = 0; $j -le ($newBytes.Length - 2); $j++) {
    if ($newBytes[$j] -eq 0xF0 -and $newBytes[$j+1] -eq 0x9F) {
        $emojiCount++
    }
}
Write-Host "Emojis 4-byte (F0 9F): $emojiCount"

if ($allOk) {
    [System.IO.File]::WriteAllBytes($filePath, $newBytes)
    Write-Host ""
    Write-Host "=== ARQUIVO SALVO COM SUCESSO! ==="
} else {
    Write-Host ""
    Write-Host "=== NAO SALVO - VERIFICACAO FALHOU ==="
}
