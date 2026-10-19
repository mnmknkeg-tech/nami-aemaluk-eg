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
  return $s
}

$calls = @{}
$q = [regex]::Escape([char]0x60 + '"' + "'")
$rxCall = '(?:apiRequest|api\.(get|post|put|patch|delete))(?:<[^>]*>)?\(\s*([' + $q + '])(/[^' + $q + ']*)([' + $q + '])'

foreach ($f in (Get-PrunedFiles "$Root\apps" @('.ts', '.tsx'))) {
  $txt = [System.IO.File]::ReadAllText($f)
  $rel = $f.Replace("$Root\apps\", '')
  foreach ($m in [regex]::Matches($txt, $rxCall)) {
    $p = Normalize $m.Groups[3].Value
    if ($p -eq '/' -or $p -eq '') { continue }
    $verb = $m.Groups[1].Value
    if ($verb -ne '') { $meth = $verb.ToUpper() }
    else {
      $start = $m.Index + $m.Length
      $len = [Math]::Min(300, [Math]::Max(0, $txt.Length - $start))
      $tail = $txt.Substring($start, $len)
      $meth = 'GET'
      $mm = [regex]::Match($tail, "method\s*:\s*['" + [char]0x60 + '"]([A-Za-z]+)[' + [char]0x60 + '"]')
      if ($mm.Success) { $meth = $mm.Groups[1].Value.ToUpper() }
    }
    if (-not $calls.ContainsKey($p)) { $calls[$p] = @{ m = New-Object System.Collections.Generic.HashSet[string]; f = New-Object System.Collections.Generic.List[string] } }
    [void]$calls[$p].m.Add($meth)
    if (-not $calls[$p].f.Contains($rel)) { $calls[$p].f.Add($rel) }
  }
}

Write-Host "distinct frontend paths: $($calls.Count)" -ForegroundColor Cyan

$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$script:http = $null

function Probe($method, $p) {
  $url = 'http://localhost:4000/api/v1' + $p
  try {
    $r = Invoke-WebRequest -Uri $url -Method $method -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
    return [int]$r.StatusCode
  } catch {
    $resp = $_.Exception.Response
    if ($null -ne $resp) {
      try { return [int]$resp.StatusCode } catch { return -1 }
    }
    return -1
  }
}

$missing = @(); $wrongMethod = @(); $serverErr = @(); $unknown = @(); $ok = 0
foreach ($p in ($calls.Keys | Sort-Object)) {
  $probePath = $p -replace '\{\}', '00000000-0000-0000-0000-000000000000'
  $declared = @($calls[$p].m)
  $detail = @(); $best = -1
  foreach ($meth in $declared) {
    $c = Probe $meth $probePath
    $detail += "$meth=$c"
    if ($c -ne 404 -and $c -ne 405) { $best = $c }
    elseif ($best -lt 0 -and $c -gt $best) { $best = $c }
  }
  if ($best -eq 405 -or $best -eq 404 -or $best -eq -1) {
    foreach ($meth in @('GET','POST','PUT','PATCH','DELETE')) {
      if ($declared -contains $meth) { continue }
      $c2 = Probe $meth $probePath
      $detail += "$meth=$c2"
      if ($c2 -ne 404 -and $c2 -ne 405 -and $c2 -ne -1) { $best = $c2; break }
    }
  }
  $src = ($calls[$p].f | Select-Object -First 2) -join ' , '
  $line = "{0,-54} | {1} | {2}" -f $p, ($detail -join ' '), $src
  if ($best -eq 404) { $missing += $line }
  elseif ($best -eq 405) { $wrongMethod += $line }
  elseif ($best -eq -1) { $unknown += $line }
  elseif ($best -ge 500) { $serverErr += $line }
  else { $ok++ }
}

Write-Host ""
Write-Host "OK: $ok"
Write-Host ""
Write-Host "===== 404 TRULY MISSING ($($missing.Count)) ====="
$missing | ForEach-Object { Write-Host $_ }
Write-Host ""
Write-Host "===== 405 METHOD MISMATCH ($($wrongMethod.Count)) ====="
$wrongMethod | ForEach-Object { Write-Host $_ }
Write-Host ""
Write-Host "===== 5xx SERVER ERRORS ($($serverErr.Count)) ====="
$serverErr | ForEach-Object { Write-Host $_ }
Write-Host ""
Write-Host "===== UNREACHABLE (-1) ($($unknown.Count)) ====="
$unknown | ForEach-Object { Write-Host $_ }
