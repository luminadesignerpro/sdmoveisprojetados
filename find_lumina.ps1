# Busca o texto 'lumina' no arquivo e mostra contexto
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$filePath = 'index.html'
$b = [System.IO.File]::ReadAllBytes($filePath)
$utf8 = [System.Text.Encoding]::UTF8
$content = $utf8.GetString($b)

# Busca 'lumina' case-insensitive
$lower = $content.ToLower()
$idx = 0
$count = 0
while ($true) {
    $found = $lower.IndexOf('lumina', $idx)
    if ($found -lt 0 -or $count -ge 5) { break }
    $start = [Math]::Max(0, $found - 10)
    $end = [Math]::Min($content.Length - 1, $found + 30)
    $ctx = $content.Substring($start, $end - $start + 1)
    Write-Host "Pos $found : [$ctx]"
    $idx = $found + 1
    $count++
}
