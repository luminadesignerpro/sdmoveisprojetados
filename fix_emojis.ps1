# Script de correcao de emojis - versao sem emojis literais
# Usa apenas arrays de bytes para evitar problemas de parse
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$win1252 = [System.Text.Encoding]::GetEncoding(1252)
$utf8enc = [System.Text.Encoding]::UTF8

$filePath = 'index.html'
$b = [System.IO.File]::ReadAllBytes($filePath)
Write-Host "Arquivo: $($b.Length) bytes"

# Funcao para calcular bytes corrompidos de emoji UTF-8
# (cada byte alto e' reinterpretado como Win-1252 e re-encoded como UTF-8)
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

# Funcao para contar ocorrencias
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

# Funcao para substituir bytes
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

# Lista de emojis: nome (sem emoji), bytes UTF-8 corretos
$emojiList = @(
    "Clipboard",          [byte[]](0xF0,0x9F,0x93,0x8B),
    "Historico",          [byte[]](0xF0,0x9F,0x97,0x82,0xEF,0xB8,0x8F),
    "Financeiro",         [byte[]](0xF0,0x9F,0x92,0xB0),
    "Estoque",            [byte[]](0xF0,0x9F,0x93,0xA6),
    "Raio",               [byte[]](0xE2,0x9A,0xA1),
    "Agua",               [byte[]](0xF0,0x9F,0x92,0xA7),
    "Calendario",         [byte[]](0xF0,0x9F,0x93,0x85),
    "Edificio",           [byte[]](0xF0,0x9F,0x8F,0xA2),
    "Pessoa",             [byte[]](0xF0,0x9F,0x91,0xA4),
    "Trabalhador",        [byte[]](0xF0,0x9F,0x91,0xB7),
    "Camera",             [byte[]](0xF0,0x9F,0x93,0xB7),
    "Documento",          [byte[]](0xF0,0x9F,0x93,0x84),
    "Grupo",              [byte[]](0xF0,0x9F,0x91,0xA5),
    "Globo-Americas",     [byte[]](0xF0,0x9F,0x8C,0x8E),
    "Globo",              [byte[]](0xF0,0x9F,0x8C,0x90),
    "Grafico-barra",      [byte[]](0xF0,0x9F,0x93,0x8A),
    "Ferramenta",         [byte[]](0xF0,0x9F,0x94,0xA7),
    "Mensagem",           [byte[]](0xF0,0x9F,0x92,0xAC),
    "Check",              [byte[]](0xE2,0x9C,0x85),
    "X-vermelho",         [byte[]](0xE2,0x9D,0x8C),
    "Aviso",              [byte[]](0xE2,0x9A,0xA0,0xEF,0xB8,0x8F),
    "Cadeado-fechado",    [byte[]](0xF0,0x9F,0x94,0x92),
    "Cadeado-aberto",     [byte[]](0xF0,0x9F,0x94,0x93),
    "Casa",               [byte[]](0xF0,0x9F,0x8F,0xA0),
    "Celular",            [byte[]](0xF0,0x9F,0x93,0xB1),
    "Chave",              [byte[]](0xF0,0x9F,0x94,0x91),
    "Grafico-subindo",    [byte[]](0xF0,0x9F,0x93,0x88),
    "Grafico-descendo",   [byte[]](0xF0,0x9F,0x93,0x89),
    "Maleta",             [byte[]](0xF0,0x9F,0x92,0xBC),
    "Carrinho",           [byte[]](0xF0,0x9F,0x9B,0x92),
    "Nota",               [byte[]](0xF0,0x9F,0x93,0x9D),
    "Lupa",               [byte[]](0xF0,0x9F,0x94,0x8D),
    "Telefone",           [byte[]](0xF0,0x9F,0x93,0x9E),
    "Email",              [byte[]](0xF0,0x9F,0x93,0xA7),
    "Sino",               [byte[]](0xF0,0x9F,0x94,0x94),
    "Info",               [byte[]](0xE2,0x84,0xB9,0xEF,0xB8,0x8F),
    "Alvo",               [byte[]](0xF0,0x9F,0x8E,0xAF),
    "Foguete",            [byte[]](0xF0,0x9F,0x9A,0x80),
    "Lampada",            [byte[]](0xF0,0x9F,0x92,0xA1),
    "Atualizar",          [byte[]](0xF0,0x9F,0x94,0x84),
    "Cartao",             [byte[]](0xF0,0x9F,0x92,0xB3),
    "Lixo",               [byte[]](0xF0,0x9F,0x97,0x91,0xEF,0xB8,0x8F),
    "Lapis",              [byte[]](0xE2,0x9C,0x8F,0xEF,0xB8,0x8F),
    "Comprimido",         [byte[]](0xF0,0x9F,0x92,0x8A),
    "Cadeado-chave",      [byte[]](0xF0,0x9F,0x94,0x90),
    "Pin",                [byte[]](0xF0,0x9F,0x93,0x8C),
    "Etiqueta",           [byte[]](0xF0,0x9F,0x8F,0xB7,0xEF,0xB8,0x8F),
    "Cifrão",             [byte[]](0xF0,0x9F,0x92,0xB2),
    "Regua",              [byte[]](0xF0,0x9F,0x93,0x90),
    "Paleta",             [byte[]](0xF0,0x9F,0x8E,0xA8),
    "Computador",         [byte[]](0xF0,0x9F,0x92,0xBB),
    "Monitor",            [byte[]](0xF0,0x9F,0x96,0xA5,0xEF,0xB8,0x8F),
    "Estrela",            [byte[]](0xE2,0xAD,0x90)
)

$totalFixed = 0

for ($k = 0; $k -lt $emojiList.Length; $k += 2) {
    $name = $emojiList[$k]
    $correct = $emojiList[$k+1]
    $corrupt = Get-CorruptBytes -orig $correct
    
    $countC = Count-Seq -data $b -seq $corrupt
    if ($countC -gt 0) {
        Write-Host "  Corrigindo [$name]: $countC ocorrencias..."
        $res = Replace-Seq -data $b -search $corrupt -replace $correct
        $b = $res[0]
        $totalFixed += $res[1]
    }
}

Write-Host ""
Write-Host "Total corrigido: $totalFixed ocorrencias"

[System.IO.File]::WriteAllBytes($filePath, $b)
Write-Host "Arquivo salvo!"

# Verificar 0x9F 0x93 0x8B (Clipboard)
$c2 = Count-Seq -data $b -seq ([byte[]](0xF0,0x9F,0x93,0x8B))
$c3 = Count-Seq -data $b -seq ([byte[]](0xC3,0xB0,0xC5,0xB8,0xE2,0x80,0x9C,0xE2,0x80,0xB9))
Write-Host "Clipboard correto: $c2 | Clipboard corrompido restante: $c3"
