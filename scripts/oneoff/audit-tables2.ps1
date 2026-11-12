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

$db = New-Object System.Collections.Generic.HashSet[string]
foreach ($t in (Get-Content 'c:\Users\Dream\ray-eg-1\db-tables.txt')) {
  $x = $t.Trim().ToLower(); if ($x -ne '') { [void]$db.Add($x) }
}

$sqlKw = @('select','where','set','values','dual','lateral','generate_series','unnest','case','the','on','using','returning','conflict','do','nothing','null','true','false','and','or','as','limit','offset','order','group','left','inner','right','outer','cross','full','with','only','a','an','to','so','any','real','data','updates','via','rev','exp','days','totals','token','string','bytes','context','request','response','report','status','query','body','self','shop','user','users','role','task','tax','ticket','segment','subscription','push','applies','account','another','enabling','exactly','their','cascading','configuration','environment','fiber','authorization','delivered','reservation','customer')

# only consider matches that sit inside a Go raw string literal (backticks)
$referenced = @{}
foreach ($f in (Get-GoFiles $Root)) {
  if ($f -match '\\generated\\') { continue }
  $txt = [System.IO.File]::ReadAllText($f)
  foreach ($lit in [regex]::Matches($txt, '(?s)`[^`]*`')) {
    $s = $lit.Value
    if ($s -notmatch '(?i)\b(FROM|JOIN|INSERT\s+INTO|UPDATE)\b') { continue }
    foreach ($m in [regex]::Matches($s, '(?i)\b(?:FROM|JOIN|INSERT\s+INTO|UPDATE)\s+(?:public\.)?([a-z_][a-z0-9_]*)\b')) {
      $t = $m.Groups[1].Value.ToLower()
      if ($t.Length -lt 3) { continue }
      if (-not $referenced.ContainsKey($t)) { $referenced[$t] = @() }
      $rel = $f.Replace("$Root\", '')
      if (-not $referenced[$t].Contains($rel)) { $referenced[$t] += $rel }
    }
  }
}

Write-Host "DB tables: $($db.Count)   Go-referenced (SQL literals): $($referenced.Count)"
Write-Host ""
Write-Host "===== Go REFERENCES A TABLE THAT DOES NOT EXIST IN THE DB ====="
$missing = @()
foreach ($t in ($referenced.Keys | Sort-Object)) {
  if ($db.Contains($t)) { continue }
  if ($sqlKw -contains $t) { continue }
  if ($t -match '^\d') { continue }
  $src = ($referenced[$t] | Select-Object -First 3) -join ' , '
  $missing += ("{0,-32} <- {1}" -f $t, $src)
}
if ($missing.Count -eq 0) { Write-Host "  none" } else { $missing | ForEach-Object { Write-Host "  $_" } }
Write-Host ""
Write-Host "count: $($missing.Count)"