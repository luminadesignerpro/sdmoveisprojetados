# Verifica o conteudo do index.html mais detalhadamente
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$filePath = 'index.html'
$b = [System.IO.File]::ReadAllBytes($filePath)

# Verifica bytes invalidos no arquivo (bytes que nao sao parte de UTF-8 valido)
# Um byte E1 isolado ou seguido de bytes nao-continuacao e invalido
$invalidBytes = @()
$i = 0
while ($i -lt $b.Length) {
    $byte = $b[$i]
    if ($byte -le 0x7F) {
        # ASCII valido
        $i++
    } elseif ($byte -ge 0xC2 -and $byte -le 0xDF) {
        # Sequencia de 2 bytes
        if ($i+1 -lt $b.Length -and ($b[$i+1] -band 0xC0) -eq 0x80) {
            $i += 2
        } else {
            $invalidBytes += $i
            $i++
        }
    } elseif ($byte -ge 0xE0 -and $byte -le 0xEF) {
        # Sequencia de 3 bytes
        if ($i+2 -lt $b.Length -and ($b[$i+1] -band 0xC0) -eq 0x80 -and ($b[$i+2] -band 0xC0) -eq 0x80) {
            $i += 3
        } else {
            $invalidBytes += $i
            $i++
        }
    } elseif ($byte -ge 0xF0 -and $byte -le 0xF4) {
        # Sequencia de 4 bytes
        if ($i+3 -lt $b.Length -and ($b[$i+1] -band 0xC0) -eq 0x80 -and ($b[$i+2] -band 0xC0) -eq 0x80 -and ($b[$i+3] -band 0xC0) -eq 0x80) {
            $i += 4
        } else {
            $invalidBytes += $i
            $i++
        }
    } else {
        # Byte invalido (0x80-0xBF isolado, 0xF5+, 0xC0, 0xC1)
        $invalidBytes += $i
        $i++
    }
}

Write-Host "Bytes invalidos UTF-8: $($invalidBytes.Count)"
if ($invalidBytes.Count -gt 0 -and $invalidBytes.Count -le 50) {
    foreach ($pos in $invalidBytes) {
        $ctxStart = [Math]::Max(0, $pos - 5)
        $ctxEnd = [Math]::Min($b.Length - 1, $pos + 5)
        $ctx = ($b[$ctxStart..$ctxEnd] | ForEach-Object { $_.ToString('X2') }) -join ' '
        Write-Host "  Posicao $pos (0x$($pos.ToString('X'))): byte=0x$($b[$pos].ToString('X2')) | contexto: $ctx"
    }
} elseif ($invalidBytes.Count -gt 50) {
    Write-Host "Primeiros 20 bytes invalidos:"
    foreach ($pos in $invalidBytes[0..19]) {
        $ctx = ($b[[Math]::Max(0,$pos-3)..[Math]::Min($b.Length-1,$pos+3)] | ForEach-Object { $_.ToString('X2') }) -join ' '
        $hexByte = $b[$pos].ToString('X2')
        Write-Host "  Pos ${pos}: 0x${hexByte} | $ctx"
    }
}

# Verifica se 'Lumina' existe de outra forma
$utf8 = [System.Text.Encoding]::UTF8
$content = $utf8.GetString($b)
if ($content.Contains('Lumina')) {
    Write-Host "OK: 'Lumina' encontrado no conteudo"
} else {
    Write-Host "ERRO: 'Lumina' nao encontrado"
}
# Tenta buscar partes do titulo da empresa
$searchTerms = @('SD M', 'Projetados', 'projetados', 'designer', 'Designer', 'LUMINA', 'lumina')
foreach ($term in $searchTerms) {
    if ($content.Contains($term)) {
        Write-Host "Encontrado: '$term'"
    }
}
