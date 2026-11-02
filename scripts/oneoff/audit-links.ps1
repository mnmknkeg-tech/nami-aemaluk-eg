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

$apps = @(
  @{ name = 'marketplace-next'; dir = "$Root\apps\marketplace-next\app"; base = '' },
  @{ name = 'dashboard-web';    dir = "$Root\apps\dashboard-web\app";    base = '' },
  @{ name = 'business';         dir = "$Root\apps\business\src\app";    base = '' }
)

foreach ($a in $apps) {
  Write-Host ""
  Write-Host "===== $($a.name) =====" -ForegroundColor Cyan

  # collect existing routes from page.tsx paths
  $routes = New-Object System.Collections.Generic.HashSet[string]
  $pages = Get-PrunedFiles $a.dir @('page.tsx')
  foreach ($p in $pages) {
    $rel = $p.Substring($a.dir.Length).Replace('\', '/')
    $rel = $rel -replace '/page\.tsx$', ''
    if ($rel -eq '') { $rel = '/' }
    $segs = $rel.Split('/') | Where-Object { $_ -ne '' }
    $clean = @()
    foreach ($s in $segs) {
      if ($s -match '^[\(\[]') { if ($s -match '^\[') { $clean += '*' } ; continue }
      $clean += $s
    }
    $r = '/' + ($clean -join '/')
    if ($r -eq '/') { $r = '/' }
    [void]$routes.Add($r)
  }

  # collect all internal links
  $files = Get-PrunedFiles "$Root\apps\$($a.name)" @('.ts', '.tsx')
  $links = @{}
  foreach ($f in $files) {
    $txt = [System.IO.File]::ReadAllText($f)
    foreach ($m in [regex]::Matches($txt, '(?:href|router\.(?:push|replace))[=\(]\s*[`"''](/[^`"''#?\s\)]*)')) {
      $lk = $m.Groups[1].Value
      $lk = $lk -replace '/+$', ''
      if ($lk -eq '') { $lk = '/' }
      if ($lk.StartsWith('/api')) { continue }
      if (-not $links.ContainsKey($lk)) { $links[$lk] = @() }
      $links[$lk] += $f.Replace("$Root\apps\", '')
    }
  }

  Write-Host "pages: $($pages.Count)  distinct internal links: $($links.Count)"

  $dead = @()
  foreach ($lk in ($links.Keys | Sort-Object)) {
    $ok = $false
    if ($routes.Contains($lk)) { $ok = $true }
    else {
      # try matching against dynamic routes
      foreach ($r in $routes) {
        if ($r -notmatch '\*') { continue }
        $rx = '^' + ([regex]::Escape($r) -replace '\\\*', '[^/]+') + '$'
        if ($lk -match $rx) { $ok = $true; break }
      }
    }
    if (-not $ok) { $dead += $lk }
  }
  Write-Host "DEAD LINKS: $($dead.Count)" -ForegroundColor Yellow
  $dead | ForEach-Object {
    $src = ($links[$_] | Select-Object -First 2 | ForEach-Object { $_ -replace '.*apps\\', '' }) -join ' , '
    "{0,-46} <- {1}" -f $_, $src
  }
}