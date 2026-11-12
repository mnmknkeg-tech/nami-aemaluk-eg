$Root = 'c:\Users\Dream\ray-eg-1'
$Base = '/api/v1'

$rawRoutes = New-Object System.Collections.Generic.List[string]

function Get-PrunedFiles([string]$dir, [string[]]$includes) {
  $skip = @('node_modules', '.next', 'dist', 'build', '.git', 'coverage', '.turbo', 'out', 'vendor')
  $res = New-Object System.Collections.Generic.List[string]
  $stack = New-Object System.Collections.Generic.Stack[string]
  $stack.Push($dir)
  while ($stack.Count -gt 0) {
    $cur = $stack.Pop()
    foreach ($d in [System.IO.Directory]::GetDirectories($cur)) {
      $nm = [System.IO.Path]::GetFileName($d)
      if ($skip -contains $nm) { continue }
      $stack.Push($d)
    }
    foreach ($f in [System.IO.Directory]::GetFiles($cur)) {
      foreach ($inc in $includes) {
        if ($f.EndsWith($inc)) { $res.Add($f); break }
      }
    }
  }
  return $res
}

$goFiles = (Get-PrunedFiles "$Root\gobackend\internal" @('.go')) |
  Where-Object { $_ -notmatch '\\generated\\' }

foreach ($f in $goFiles) {
  $lines = Get-Content -LiteralPath $f
  $vars = @{}
  $pending = New-Object System.Collections.Generic.List[object]
  $fileRoutes = New-Object System.Collections.Generic.List[object]
  foreach ($ln in $lines) {
    $mg = [regex]::Match($ln, '(\w+)\s*:?=\s*([\w\.]*?)\.Group\(\s*"([^"]*)"')
    if ($mg.Success) {
      $pending.Add([pscustomobject]@{ var = $mg.Groups[1].Value; recv = $mg.Groups[2].Value; path = $mg.Groups[3].Value })
    }
    $mr = [regex]::Match($ln, '\b([\w\.]+)\.(Get|Post|Put|Patch|Delete|Head|Options|All)\(\s*"([^"]*)"')
    if ($mr.Success) {
      $fileRoutes.Add([pscustomobject]@{
        recv = $mr.Groups[1].Value
        meth = $mr.Groups[2].Value.ToUpper()
        path = $mr.Groups[3].Value
      })
    }
  }
  for ($pass = 0; $pass -lt 4; $pass++) {
    foreach ($g in $pending) {
      if ($vars.ContainsKey($g.var)) { continue }
      $recv = $g.recv
      if ($recv -match '^(api|app|r|router)$') { $vars[$g.var] = $Base + $g.path }
      elseif ($vars.ContainsKey($recv)) { $vars[$g.var] = $vars[$recv] + $g.path }
      elseif ($recv -match '\.') { $vars[$g.var] = $Base + $g.path }
    }
  }
  foreach ($r in $fileRoutes) {
    $recv = $r.recv
    if ($recv -match '^(api|app|r|router)$') { $rawRoutes.Add("$($r.meth) $Base$($r.path)") }
    elseif ($recv -match '\.') { $rawRoutes.Add("$($r.meth) $Base$($r.path)") }
    elseif ($vars.ContainsKey($recv)) { $rawRoutes.Add("$($r.meth) $($vars[$recv])$($r.path)") }
  }
}

function Normalize([string]$p) {
  $s = $p.Trim()
  if ($s -eq '') { return '' }
  if (-not $s.StartsWith('/')) { $s = '/' + $s }
  $s = ($s -split '\?')[0]
  $s = [regex]::Replace($s, '\$\{[^}]*\}', '{}')
  $s = [regex]::Replace($s, ':[A-Za-z_]\w*', '{}')
  $s = [regex]::Replace($s, '\{[^}]*\}', '{}')
  $s = [regex]::Replace($s, '/+', '/')
  if ($s.Length -gt 1) { $s = $s.TrimEnd('/') }
  if ($s -eq '') { $s = '/' }
  return $s.ToLower()
}

$beNorm = New-Object System.Collections.Generic.HashSet[string]
foreach ($r in $rawRoutes) {
  $sp = $r.Split(' ', 2)
  if ($sp.Count -ne 2) { continue }
  $np = Normalize $sp[1]
  if ($np.StartsWith('/api/v1')) { $np = $np.Substring(7) }
  [void]$beNorm.Add("$($sp[0]) $np")
}

$feFiles = Get-PrunedFiles "$Root\apps" @('.ts', '.tsx')
$feCalls = @{}
foreach ($f in $feFiles) {
  $txt = [System.IO.File]::ReadAllText($f)
  foreach ($m in [regex]::Matches($txt, 'apiRequest(?:<[^>]*>)?\(\s*([`"''])(/[^`"'']*)')) {
    $n = Normalize $m.Groups[2].Value
    if ($n -eq '/' -or $n -eq '') { continue }
    $rel = $n
    if ($rel.StartsWith('/api/v1')) { $rel = $rel.Substring(7) }
    if (-not $feCalls.ContainsKey($rel)) { $feCalls[$rel] = @() }
    $feCalls[$rel] += $f.Replace("$Root\apps\", '')
  }
}

Write-Host "backend routes: $($rawRoutes.Count)  normalized: $($beNorm.Count)" -ForegroundColor Cyan
Write-Host "frontend distinct paths: $($feCalls.Count)" -ForegroundColor Cyan
Write-Host ""
Write-Host "=== FRONTEND PATHS WITH NO BACKEND ROUTE (any method) ===" -ForegroundColor Yellow
$miss = @()
foreach ($rel in ($feCalls.Keys | Sort-Object)) {
  $hit = $false
  foreach ($meth in @('GET','POST','PUT','PATCH','DELETE')) {
    if ($beNorm.Contains("$meth $rel")) { $hit = $true; break }
  }
  if (-not $hit) { $miss += $rel }
}
Write-Host ("TOTAL missing: " + $miss.Count)
($feCalls.Keys | Sort-Object) | Set-Content -Encoding utf8 'c:\Users\Dream\ray-eg-1\fe-paths.txt'
($beNorm | Sort-Object) | Set-Content -Encoding utf8 'c:\Users\Dream\ray-eg-1\be-paths.txt'
$miss | ForEach-Object {
  $files = ($feCalls[$_] | Select-Object -First 2) -join ', '
  "{0,-58} <- {1}" -f $_, $files
}