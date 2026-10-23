# Script para ver os bytes do emoji corrompido
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$b = [System.IO.File]::ReadAllBytes('index.html')
$s = [System.Text.Encoding]::UTF8.GetString($b)

# Find the corruption pattern - show bytes before 'amento</span>'
$marker = 'amento</span>'
$idx = $s.IndexOf($marker)
if ($idx -ge 0) {
    $prefix = $s.Substring(0, $idx)
    $prefixBytes = [System.Text.Encoding]::UTF8.GetByteCount($prefix)
    
    # Show the 40 bytes BEFORE the marker
    $start = [Math]::Max(0, $prefixBytes - 40)
    $window = $b[$start..($prefixBytes-1)]
    Write-Host "40 bytes before 'amento</span>' (byte pos $prefixBytes):"
    Write-Host ($window -join ',')
    
    # Decode as UTF-8
    Write-Host "As UTF-8:"
    Write-Host ([System.Text.Encoding]::UTF8.GetString($window))
}
