[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$b = [System.IO.File]::ReadAllBytes('index.html')
$s = [System.Text.Encoding]::UTF8.GetString($b)

# Check for clipboard emoji (📋 = F0 9F 93 8B)
$clipEmoji = [System.Text.Encoding]::UTF8.GetString([byte[]](0xF0,0x9F,0x93,0x8B))
$idx = $s.IndexOf($clipEmoji)
if ($idx -ge 0) {
    Write-Host "EMOJI OK - found clipboard emoji at index $idx"
    Write-Host $s.Substring([Math]::Max(0,$idx-5), 30)
} else {
    Write-Host "EMOJI STILL BROKEN - clipboard emoji not found"
    # Look for corruption pattern
    $corrupt = [System.Text.Encoding]::UTF8.GetString([byte[]](0xC3,0xB0,0xC5,0xB8,0xE2,0x80,0x9C,0xE2,0x80,0xB9))
    $idx2 = $s.IndexOf($corrupt)
    if ($idx2 -ge 0) {
        Write-Host "Found corruption pattern at index $idx2"
    }
    # Show context around Orcamento
    $idx3 = $s.IndexOf('amento</span>')
    if ($idx3 -ge 0) {
        Write-Host "Context around 'amento</span>':"
        Write-Host $s.Substring([Math]::Max(0,$idx3-20), 40)
        # show byte values
        $bytes = $b[($idx3-20)..($idx3+20)]
        Write-Host ($bytes -join ',')
    }
}
