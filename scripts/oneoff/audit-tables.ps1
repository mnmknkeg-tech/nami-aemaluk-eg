$Root = 'c:\Users\Dream\ray-eg-1\gobackend'

function Get-GoFiles($dir) {
  $res = New-Object System.Collections.Generic.List[string]
  $stack = New-Object System.Collections.Generic.Stack[string]
  $stack.Push($dir)
  while ($stack.Count -gt 0) {
    $cur = $stack.Pop()
    foreach ($d in [System.IO.Directory]::GetDirectories($cur)) { $stack.Push($d) }
    foreach ($f in [System.IO.Directory]::GetFiles($cur)) { if ($f.EndsWith('.go')) { $res.Add($f) } }
  }
  return $res
}

$created = New-Object System.Collections.Generic.HashSet[string]
foreach ($f in [System.IO.Directory]::GetFiles("$Root\migrations")) {
  if (-not $f.EndsWith('.sql')) { continue }
  $txt = [System.IO.File]::ReadAllText($f)
  foreach ($m in [regex]::Matches($txt, '(?i)CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)')) {
    [void]$created.Add($m.Groups[1].Value.ToLower())
  }
}

$referenced = @{}
$rx = '(?i)\b(?:FROM|JOIN|INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+(?:public\.)?([a-z_][a-z0-9_]*)\b'
$sqlKw = @('select','where','set','values','dual','lateral','generate_series','unnest','information_schema','case','the','on','using','returning','conflict','do','nothing','null','true','false','and','or','as','limit','offset','order','group','left','inner','right','outer','cross','full','with','only')
foreach ($f in (Get-GoFiles $Root)) {
  if ($f -match '\\generated\\') { continue }
  $txt = [System.IO.File]::ReadAllText($f)
  foreach ($m in [regex]::Matches($txt, $rx)) {
    $t = $m.Groups[1].Value.ToLower()
    if ($sqlKw -contains $t) { continue }
    if ($t.StartsWith('pg_')) { continue }
    if (-not $referenced.ContainsKey($t)) { $referenced[$t] = @() }
    $rel = $f.Replace("$Root\", '')
    if (-not $referenced[$t].Contains($rel)) { $referenced[$t] += $rel }
  }
}

Write-Host "tables created in migrations: $($created.Count)"
Write-Host "tables referenced in Go:     $($referenced.Count)"
Write-Host ""
Write-Host "===== REFERENCED IN GO BUT NEVER CREATED IN MIGRATIONS ====="
$missing = @()
foreach ($t in ($referenced.Keys | Sort-Object)) {
  if (-not $created.Contains($t)) {
    $src = ($referenced[$t] | Select-Object -First 3) -join ' , '
    $missing += ("{0,-34} <- {1}" -f $t, $src)
  }
}
if ($missing.Count -eq 0) { Write-Host "  none" } else { $missing | ForEach-Object { Write-Host "  $_" } }
Write-Host ""
Write-Host "count: $($missing.Count)"
