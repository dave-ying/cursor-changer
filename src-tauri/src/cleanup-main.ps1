$lines = Get-Content 'main.rs'
$newContent = $lines[0..19] + $lines[1358..($lines.Length-1)]
$newContent | Set-Content 'main.rs'
