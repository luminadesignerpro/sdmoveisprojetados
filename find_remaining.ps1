# Corrigir emojis extras que faltaram: 🔄 Organizar e 🚪 Sair
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

# Emojis extras para testar
$extras = @(
    "Porta-Sair",       [byte[]](0xF0,0x9F,0x9A,0xAA),   # 🚪 U+1F6AA
    "Seta-direita",     [byte[]](0xE2,0x9E,0xA1,0xEF,0xB8,0x8F), # ➡️
    "Seta-saida",       [byte[]](0xF0,0x9F,0x9A,0xAA),   # 🚪 same
    "Power",            [byte[]](0xF0,0x9F,0x94,0x8C),   # 🔌
    "Usuario-circle",   [byte[]](0xF0,0x9F,0x91,0xA4),   # 👤 (já corrigido)
    "Engrenagem",       [byte[]](0xE2,0x9A,0x99,0xEF,0xB8,0x8F), # ⚙️
    "Hamburguer",       [byte[]](0xF0,0x9F,0x8D,0x94),   # 🍔
    "Grade",            [byte[]](0xF0,0x9F,0x94,0xB2),   # 🔲
    "Apps",             [byte[]](0xF0,0x9F,0x93,0xB2),   # 📲 (confunde com celular)
    "Sair2",            [byte[]](0xF0,0x9F,0x9A,0xAA),   # 🚪
    "Logout",           [byte[]](0xF0,0x9F,0x94,0x9A),   # 🔚
    "Settings",         [byte[]](0xF0,0x9F,0x93,0x8E),   # 📎? 
    "Saida-seta",       [byte[]](0xF0,0x9F,0x94,0x80),   # 🔀
    "Tab-add",          [byte[]](0xF0,0x9F,0x94,0x83),   # 🔃
    "Sair3",            [byte[]](0xF0,0x9F,0x94,0x95),   # 🔕
    "Lista",            [byte[]](0xF0,0x9F,0x93,0x8F),   # 📏? 
    "Menu",             [byte[]](0xF0,0x9F,0x93,0x91),   # 📑
    "Janela",           [byte[]](0xF0,0x9F,0x96,0xBC),   # 🖼️?
    "Sair-porta",       [byte[]](0xF0,0x9F,0x9A,0xAA),   # 🚪 
    "Door",             [byte[]](0xF0,0x9F,0x9A,0xAA)    # 🚪
)

Write-Host "=== Procurando emojis extras ==="
foreach ($k in 0..($extras.Length/2 - 1)) {
    $name = $extras[$k*2]
    $correct = $extras[$k*2+1]
    $corrupt = Get-CorruptBytes -orig $correct
    $countC = Count-Seq -data $b -seq $corrupt
    $countOk = Count-Seq -data $b -seq $correct
    
    $corruptHex = ($corrupt | ForEach-Object { $_.ToString('X2') }) -join ' '
    
    if ($countC -gt 0) {
        Write-Host "CORROMPIDO [$name]: $countC | corrupt bytes: $corruptHex"
    } elseif ($countOk -gt 0) {
        Write-Host "OK [$name]: $countOk correto"
    }
}

# Procura generica por todos os padroes de corrupcao restantes (C3 B0 C5 B8 = inicio de emoji 4-byte corrompido)
Write-Host ""
Write-Host "=== Procurando padrão C3 B0 C5 B8 (emoji 4-byte corrompido generico) ==="
$pattern = [byte[]](0xC3,0xB0,0xC5,0xB8)
$positions = @()
for ($i = 0; $i -le ($b.Length - 4); $i++) {
    if ($b[$i] -eq 0xC3 -and $b[$i+1] -eq 0xB0 -and $b[$i+2] -eq 0xC5 -and $b[$i+3] -eq 0xB8) {
        $positions += $i
    }
}
Write-Host "Total de emojis 4-byte ainda corrompidos: $($positions.Count)"
if ($positions.Count -gt 0) {
    Write-Host "Primeiras posicoes: $($positions[0..([Math]::Min(4,$positions.Count-1))] -join ', ')"
    # Mostrar bytes em cada posicao
    foreach ($pos in $positions[0..([Math]::Min(2,$positions.Count-1))]) {
        $window = $b[$pos..($pos+10)]
        Write-Host "  Pos $pos bytes: $($window -join ',')"
    }
}

# Procura emojis 3-byte corrompidos (C3 A2 = inicio)
Write-Host ""
Write-Host "=== Padrão C3 A2 (emoji 3-byte corrompido) ==="
$pos3 = @()
for ($i = 0; $i -le ($b.Length - 3); $i++) {
    if ($b[$i] -eq 0xC3 -and $b[$i+1] -eq 0xA2) {
        $pos3 += $i
    }
}
Write-Host "Candidatos C3 A2: $($pos3.Count)"
