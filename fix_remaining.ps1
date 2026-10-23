# Verificar emojis das abas principais e outros que faltaram
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$win1252 = [System.Text.Encoding]::GetEncoding(1252)
$utf8enc = [System.Text.Encoding]::UTF8

$filePath = 'index.html'
$b = [System.IO.File]::ReadAllBytes($filePath)

function Get-CorruptBytes([byte[]]$orig) {
    $r = New-Object System.Collections.Generic.List[byte]
    foreach ($byte in $orig) {
        if ($byte -le 0x7F) { $r.Add($byte) }
        else {
            $ch = $win1252.GetString([byte[]]@($byte))
            foreach ($rb in $utf8enc.GetBytes($ch)) { $r.Add($rb) }
        }
    }
    return ,$r.ToArray()
}

function Count-Seq([byte[]]$data, [byte[]]$seq) {
    $c = 0
    for ($i = 0; $i -le ($data.Length - $seq.Length); $i++) {
        $ok = $true
        for ($j = 0; $j -lt $seq.Length; $j++) {
            if ($data[$i+$j] -ne $seq[$j]) { $ok = $false; break }
        }
        if ($ok) { $c++ }
    }
    return $c
}

function Replace-Seq([byte[]]$data, [byte[]]$search, [byte[]]$replace) {
    $r = New-Object System.Collections.Generic.List[byte]
    $c = 0; $i = 0
    while ($i -lt $data.Length) {
        if ($i -le ($data.Length - $search.Length)) {
            $ok = $true
            for ($j = 0; $j -lt $search.Length; $j++) {
                if ($data[$i+$j] -ne $search[$j]) { $ok = $false; break }
            }
            if ($ok) {
                foreach ($rb in $replace) { $r.Add($rb) }
                $i += $search.Length; $c++
                continue
            }
        }
        $r.Add($data[$i]); $i++
    }
    return $r.ToArray(), $c
}

# Emojis das abas que podem ainda estar corrompidos
$remaining = @(
    "Historico-tab",      [byte[]](0xF0,0x9F,0x97,0x82,0xEF,0xB8,0x8F),
    "Financeiro-tab",     [byte[]](0xF0,0x9F,0x92,0xB0),
    "Estoque-tab",        [byte[]](0xF0,0x9F,0x93,0xA6),
    "Calendario-tab",     [byte[]](0xF0,0x9F,0x93,0x85),
    "Edificio-tab",       [byte[]](0xF0,0x9F,0x8F,0xA2),
    "Pessoa-tab",         [byte[]](0xF0,0x9F,0x91,0xA4),
    "Trabalhador-tab",    [byte[]](0xF0,0x9F,0x91,0xB7),
    "Camera-tab",         [byte[]](0xF0,0x9F,0x93,0xB7),
    "Documento-tab",      [byte[]](0xF0,0x9F,0x93,0x84),
    "Grupo-tab",          [byte[]](0xF0,0x9F,0x91,0xA5),
    "Globo-Americas-tab", [byte[]](0xF0,0x9F,0x8C,0x8E),
    "Grafico-barra-tab",  [byte[]](0xF0,0x9F,0x93,0x8A),
    "Ferramenta-tab",     [byte[]](0xF0,0x9F,0x94,0xA7),
    "Mensagem-tab",       [byte[]](0xF0,0x9F,0x92,0xAC),
    "Grafico-up",         [byte[]](0xF0,0x9F,0x93,0x88),
    "Grafico-down",       [byte[]](0xF0,0x9F,0x93,0x89),
    "Maleta",             [byte[]](0xF0,0x9F,0x92,0xBC),
    "Email",              [byte[]](0xF0,0x9F,0x93,0xA7),
    "Cadeado-aberto",     [byte[]](0xF0,0x9F,0x94,0x93),
    "Cadeado-chave",      [byte[]](0xF0,0x9F,0x94,0x90),
    "Computador",         [byte[]](0xF0,0x9F,0x92,0xBB),
    "Monitor",            [byte[]](0xF0,0x9F,0x96,0xA5,0xEF,0xB8,0x8F),
    "Comprimido",         [byte[]](0xF0,0x9F,0x92,0x8A),
    "Globo-tab",          [byte[]](0xF0,0x9F,0x8C,0x90)
)

$totalFixed = 0
for ($k = 0; $k -lt $remaining.Length; $k += 2) {
    $name = $remaining[$k]
    $correct = $remaining[$k+1]
    $corrupt = Get-CorruptBytes -orig $correct
    $countC = Count-Seq -data $b -seq $corrupt
    $countOk = Count-Seq -data $b -seq $correct
    if ($countC -gt 0) {
        Write-Host "  Corrigindo [$name]: $countC ocorrencias..."
        $res = Replace-Seq -data $b -search $corrupt -replace $correct
        $b = $res[0]
        $totalFixed += $res[1]
    } elseif ($countOk -gt 0) {
        Write-Host "  OK [$name]: $countOk correto"
    } else {
        Write-Host "  AUSENTE [$name]"
    }
}

if ($totalFixed -gt 0) {
    Write-Host ""
    Write-Host "Total adicional corrigido: $totalFixed"
    [System.IO.File]::WriteAllBytes($filePath, $b)
    Write-Host "Arquivo salvo!"
} else {
    Write-Host ""
    Write-Host "Nenhuma correcao adicional necessaria."
}
