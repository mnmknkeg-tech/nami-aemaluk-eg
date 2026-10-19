$Root = 'c:\Users\Dream\ray-eg-1'

function Get-PrunedFiles([string]$dir, [string[]]$includes) {
  $skip = @('node_modules', '.next', 'dist', 'build', '.git', 'coverage', '.turbo', 'out')
  $res = New-Object System.Collections.Generic.List[string]
  $stack = New-Object System.Collections.Generic.Stack[string]
  $stack.Push($dir)
  while ($stack.Count -gt 0) {
    $cur = $stack.Pop()
    foreach ($d in [System.IO.Directory]::GetDirectories($cur)) {
      if ($skip -contains [System.IO.Path]::GetFileName($d)) { continue }
      $stack.Push($d)
    }
    foreach ($f in [System.IO.Directory]::GetFiles($cur)) {
      foreach ($inc in $includes) { if ($f.EndsWith($inc)) { $res.Add($f); break } }
    }
  }
  return $res
}

$appName = 'dashboard-web'
$appDir  = "$Root\apps\$appName\app"

$real = New-Object System.Collections.Generic.HashSet[string]
$catchAll = New-Object System.Collections.Generic.List[string]

foreach ($p in (Get-PrunedFiles $appDir @('page.tsx'))) {
  $rel = $p.Substring($appDir.Length).Replace('\', '/')
  $rel = $rel -replace '/page\.tsx$', ''
  $segs = $rel.Split('/') | Where-Object { $_ -ne '' }
  $isCatch = $false
  $clean = @()
  foreach ($s in $segs) {
    if ($s -match '^\(') { continue }
    if ($s -match '^\[') { if ($s -match '\.\.\.') { $isCatch = $true }; $clean += '*'; continue }
    $clean += $s
  }
  $r = '/' + ($clean -join '/')
  if ($isCatch) { $catchAll.Add($r) } else { [void]$real.Add($r) }
}

Write-Host "real routes: $($real.Count)   catch-all: $($catchAll -join ', ')" -ForegroundColor Cyan

$files = Get-PrunedFiles "$Root\apps\$appName" @('.ts', '.tsx')
$links = @{}
foreach ($f in $files) {
  $txt = [System.IO.File]::ReadAllText($f)
  foreach ($m in [regex]::Matches($txt, '(?:href|router\.(?:push|replace))[=\(]\s*[`"''](/[^`"''#?\s\)]*)')) {
    $lk = ($m.Groups[1].Value -replace '/+$', '')
    if ($lk -eq '') { $lk = '/' }
    if ($lk.StartsWith('/api') -or $lk -match '\.(css|js|png|jpg|svg|webp|ico)$') { continue }
    if (-not $links.ContainsKey($lk)) { $links[$lk] = @() }
    $links[$lk] += $f.Replace("$Root\apps\", '')
  }
}

# sidebar hrefs specifically
$sidebar = @{}
$sf = "$Root\apps\$appName\src\config\sidebar.ts"
if (Test-Path $sf) {
  foreach ($m in [regex]::Matches([System.IO.File]::ReadAllText($sf), "href:\s*'([^']+)'")) {
    $sidebar[$m.Groups[1].Value] = 'src\config\sidebar.ts'
  }
}

function MatchesOnlyCatchAll($lk) {
  foreach ($r in $real) {
    if ($r -eq $lk) { return $false }
    if ($r -match '\*') {
      $rx = '^' + (([regex]::Escape($r)) -replace '\\\*', '[^/]+') + '$'
      if ($lk -match $rx) { return $false }
    }
  }
  foreach ($c in $catchAll) {
    $rx = '^' + (([regex]::Escape($c)) -replace '\\\*', '.+') + '$'
    if ($lk -match $rx) { return $true }
  }
  return $false
}

Write-Host ""
Write-Host "===== SIDEBAR LINKS THAT LAND ON THE `"قيد التطوير`" CATCH-ALL =====" -ForegroundColor Yellow
$n = 0
foreach ($lk in ($sidebar.Keys | Sort-Object -Unique)) {
  if ($lk.StartsWith('/dashboard') -and (MatchesOnlyCatchAll $lk)) { Write-Host "  $lk"; $n++ }
}
Write-Host "count: $n"

Write-Host ""
Write-Host "===== ALL LINKED PAGES LANDING ON CATCH-ALL =====" -ForegroundColor Yellow
$n2 = 0
foreach ($lk in ($links.Keys | Sort-Object)) {
  if ($lk.StartsWith('/dashboard') -and (MatchesOnlyCatchAll $lk)) { Write-Host "  $lk"; $n2++ }
}
Write-Host "count: $n2"