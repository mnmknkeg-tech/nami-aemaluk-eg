$ProgressPreference = 'SilentlyContinue'
$Root = 'c:\Users\Dream\ray-eg-1'
$out  = "$Root\audit-final.txt"
$lines = New-Object System.Collections.Generic.List[string]
function Emit($s) { $script:lines.Add($s); Write-Host $s }

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

# ---------- 1) backend routes ----------
$beRoutes = New-Object System.Collections.Generic.HashSet[string]
foreach ($f in (Get-PrunedFiles "$Root\gobackend\internal" @('.go'))) {
  if ($f -match '\\generated\\') { continue }
  $txt = [System.IO.File]::ReadAllText($f)
  foreach ($m in [regex]::Matches($txt, '\.(Get|Post|Put|Patch|Delete|Head|Options)\(\s*"([^"]+)"')) {
    $meth = $m.Groups[1].Value.ToUpper()
    $pth = Normalize $m.Groups[2].Value
    if ($pth.StartsWith('/api/v1')) { $pth = $pth.Substring(7) }
    [void]$beRoutes.Add("$meth $pth")
  }
}
Emit "backend routes extracted: $($beRoutes.Count)"

# ---------- 2) frontend calls ----------
$q = [regex]::Escape([char]0x60 + '"' + "'")
$rxCall = '(?:apiRequest|api\.(get|post|put|patch|delete))(?:<[^>]*>)?\(\s*([' + $q + '])(/[^' + $q + ']*)'
$feCalls = @{}
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
    if (-not $feCalls.ContainsKey($p)) { $feCalls[$p] = @{ m = New-Object System.Collections.Generic.HashSet[string]; f = New-Object System.Collections.Generic.List[string] } }
    [void]$feCalls[$p].m.Add($meth)
    if (-not $feCalls[$p].f.Contains($rel)) { $feCalls[$p].f.Add($rel) }
  }
}
Emit "distinct frontend paths: $($feCalls.Count)"

# ---------- 3) static match ----------
$beByPath = @{}
foreach ($r in $beRoutes) {
  $sp = $r.Split(' ', 2)
  if (-not $beByPath.ContainsKey($sp[1])) { $beByPath[$sp[1]] = New-Object System.Collections.Generic.HashSet[string] }
  [void]$beByPath[$sp[1]].Add($sp[0])
}

# build regex per backend path for fallback matching
$beRx = @()
foreach ($bp in $beByPath.Keys) {
  $rx = '^' + (([regex]::Escape($bp) -replace '\\\{\\\}', '{}') ) + '$'
  $rx = $rx -replace '\{\}', '[^/]+'
  $beRx += [pscustomobject]@{ Rx = $rx; Path = $bp; Methods = $beByPath[$bp] }
}

$unmatched = @{}
foreach ($p in ($feCalls.Keys | Sort-Object)) {
  $hit = $false
  if ($beByPath.ContainsKey($p)) { $hit = $true }
  else {
    foreach ($c in $beRx) { if ($p -match $c.Rx) { $hit = $true; break } }
  }
  if (-not $hit) { $unmatched[$p] = $feCalls[$p] }
}
Emit "statically unmatched: $($unmatched.Count)"

$lines | Set-Content -LiteralPath $out -Encoding UTF8
$unmatched.Keys | Sort-Object | Set-Content -LiteralPath "$Root\unmatched-paths.txt" -Encoding UTF8

# dump full call list: path <TAB> methods <TAB> sources
$dump = New-Object System.Collections.Generic.List[string]
foreach ($p in ($feCalls.Keys | Sort-Object)) {
  $ms = (@($feCalls[$p].m) | Sort-Object) -join ','
  $fs = ($feCalls[$p].f | Select-Object -First 3) -join ';'
  $dump.Add("$p`t$ms`t$fs")
}
$dump | Set-Content -LiteralPath "$Root\fe-calls.tsv" -Encoding UTF8
Write-Host "written: $out and fe-calls.tsv"