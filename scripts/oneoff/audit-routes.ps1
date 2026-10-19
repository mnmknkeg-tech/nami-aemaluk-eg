$Root = 'c:\Users\Dream\ray-eg-1'
$Base = '/api/v1'

# ---------- BACKEND ----------
$beRoutes = New-Object System.Collections.Generic.HashSet[string]
$goFiles = Get-ChildItem -Recurse -File -Filter *.go "$Root\gobackend\internal" |
  Where-Object { $_.FullName -notmatch '\\generated\\' }

foreach ($f in $goFiles) {
  $lines = Get-Content -LiteralPath $f.FullName
  # var -> prefix   (may be nested; resolve iteratively at the end)
  $vars = @{}
  $pending = @()
  for ($i = 0; $i -lt $lines.Count; $i++) {
    $ln = $lines[$i]
    # group declaration:  x := <receiver>.Group("path", ...)
    $mg = [regex]::Match($ln, '(\w+)\s*:?=\s*([\w\.]*?)\.Group\(\s*"([^"]*)"')
    if ($mg.Success) {
      $pending += ,@{ var = $mg.Groups[1].Value; recv = $mg.Groups[2].Value; path = $mg.Groups[3].Value }
    }
    # route declaration:  <recv>.<Method>("/path", ...)
    $mr = [regex]::Match($ln, '\b([\w\.]+)\.(Get|Post|Put|Patch|Delete|Head|Options|All)\(\s*"([^"]*)"')
    if ($mr.Success) {
      $recv = $mr.Groups[1].Value
      $m    = $mr.Groups[2].Value.ToUpper()
      $p    = $mr.Groups[3].Value
      $base = $null
      if ($recv -match '^(api|app|r|router)$') { $base = $Base }
      elseif ($recv -match '\.') { $base = $Base }   # chained (rare) -> best effort
      else { $base = "__VAR__$recv" }
      [void]$beRoutes.Add("$m $base$p")
    }
  }
  # resolve group vars (single pass depth 3)
  for ($pass = 0; $pass -lt 4; $pass++) {
    foreach ($g in $pending) {
      if ($vars.ContainsKey($g.var)) { continue }
      $recv = $g.recv
      $prefix = $null
      if ($recv -match '^(api|app|r|router)$') { $prefix = $Base }
      elseif ($vars.ContainsKey($recv)) { $prefix = $vars[$recv] }
      elseif ($recv -match '\.') { $prefix = $Base }
      if ($prefix -ne $null) { $vars[$g.var] = $prefix + $g.path }
    }
  }
  # rewrite __VAR__ placeholders for this file into real full paths
  $add = @()
  foreach ($r in $beRoutes) {
    $mm = [regex]::Match($r, '^(?<m>[A-Z]+) __VAR__(?<v>\w+)(?<rest>.*)$')
    if ($mm.Success) {
      $v = $mm.Groups['v'].Value
      if ($vars.ContainsKey($v)) { $add += "$($mm.Groups['m'].Value) $($vars[$v])$($mm.Groups['rest'].Value)" }
    }
  }
  foreach ($a in $add) { [void]$beRoutes.Add($a) }
}

function Normalize([string]$p) {
  if ($p -eq $null) { return '' }
  $s = $p.Trim()
  if ($s -eq '') { return '' }
  if (-not $s.StartsWith('/')) { $s = '/' + $s }
  $s = ($s -split '\?')[0]
  # collapse interpolations and params
  $s = [regex]::Replace($s, '\$\{[^}]*\}', '{}')
  $s = [regex]::Replace($s, ':[A-Za-z_]\w*', '{}')
  $s = [regex]::Replace($s, '\{[^}]*\}', '{}')
  $s = [regex]::Replace($s, '/+$', '')
  $s = [regex]::Replace($s, '/{2,}', '/')
  if ($s -eq '') { $s = '/' }
  return $s.ToLower()
}

$beNorm = New-Object System.Collections.Generic.HashSet[string]
foreach ($r in $beRoutes) {
  $sp = $r.Split(' ', 2)
  if ($sp.Count -ne 2) { continue }
  [void]$beNorm.Add("$($sp[0]) $(Normalize $sp[1])")
}

# ---------- FRONTEND ----------
$feFiles = Get-ChildItem -Recurse -File -Include *.ts,*.tsx "$Root\apps" |
  Where-Object { $_.FullName -notmatch 'node_modules|\\\.next\\' }
$feCalls = @{}
foreach ($f in $feFiles) {
  $txt = [System.IO.File]::ReadAllText($f.FullName)
  $idx = 0
  foreach ($m in [regex]::Matches($txt, 'apiRequest(?:<[^>]*>)?\(\s*([`"''])(/[^`"'']*)')) {
    $raw = $m.Groups[2].Value
    $n = Normalize $raw
    if ($n -eq '/' -or $n -eq '') { continue }
    $rel = $n
    if ($rel.StartsWith('/api/v1')) { $rel = $rel.Substring(7) }
    $key = "GET $rel"   # method unknown statically -> test against both
    if (-not $feCalls.ContainsKey($rel)) { $feCalls[$rel] = @() }
    $feCalls[$rel] += $f.FullName.Replace("$Root\apps\", '')
  }
}

Write-Host "backend routes: $($beRoutes.Count)  normalized: $($beNorm.Count)" -ForegroundColor Cyan
Write-Host "frontend distinct paths: $($feCalls.Count)" -ForegroundColor Cyan

Write-Host ""
Write-Host "=== FRONTEND PATHS WITH NO BACKEND ROUTE ANY METHOD (hard 404 risk) ===" -ForegroundColor Yellow
$miss = @()
foreach ($rel in ($feCalls.Keys | Sort-Object)) {
  $hit = $false
  foreach ($meth in @('GET','POST','PUT','PATCH','DELETE')) {
    if ($beNorm.Contains("$meth $rel")) { $hit = $true; break }
  }
  if (-not $hit) { $miss += $rel }
}
Write-Host ("TOTAL missing: " + $miss.Count)
$miss | ForEach-Object {
  $files = ($feCalls[$_] | Select-Object -First 2) -join ', '
  "{0,-58} <- {1}" -f $_, $files
}
