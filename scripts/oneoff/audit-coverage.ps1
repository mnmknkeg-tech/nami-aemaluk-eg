param(
  [string]$Root = 'c:\Users\Dream\ray-eg-1'
)

Write-Host "=== 1) BACKEND ROUTE PREFIXES ===" -ForegroundColor Cyan
$backendText = Get-ChildItem -Recurse -Include *.go "$Root\gobackend\internal" |
  Where-Object { $_.FullName -notmatch '\\generated\\' } |
  ForEach-Object { Get-Content $_.FullName -Raw }
$backendAll = $backendText -join "`n"
$bMatches = [regex]::Matches($backendAll, '\.(?:Get|Post|Put|Patch|Delete|Group)\("(/[^"]*)"')
$bPrefixes = @{}
foreach ($m in $bMatches) {
  $p = $m.Groups[1].Value.TrimStart('/')
  if ($p -eq '') { continue }
  $seg = ($p -split '/')[0]
  if ($seg -like ': *') { continue }
  if ($seg.StartsWith(':')) { continue }
  if (-not $bPrefixes.ContainsKey($seg)) { $bPrefixes[$seg] = 0 }
  $bPrefixes[$seg]++
}
$bPrefixes.Keys | Sort-Object | ForEach-Object { "{0,-28} {1}" -f $_, $bPrefixes[$_] }

Write-Host ""
Write-Host "=== 2) FRONTEND API CALL PREFIXES ===" -ForegroundColor Cyan
$feFiles = Get-ChildItem -Recurse -File -Include *.ts,*.tsx "$Root\apps" |
  Where-Object { $_.FullName -notmatch 'node_modules|\\\.next\\|\\dist\\|\\build\\' }
$feText = ($feFiles | ForEach-Object { [System.IO.File]::ReadAllText($_.FullName) }) -join "`n"
$feMatches = [regex]::Matches($feText, 'apiRequest\(\s*[`"''](/[^`"''$?]*)')
$fPrefixes = @{}
$fRaw = @{}
foreach ($m in $feMatches) {
  $p = $m.Groups[1].Value.TrimStart('/')
  if ($p -eq '' -or $p -eq 'api') { continue }
  $clean = $p -replace '^api/v1/', ''
  $seg = ($clean -split '/')[0]
  if ($seg -eq '' -or $seg.StartsWith(':')) { continue }
  if (-not $fPrefixes.ContainsKey($seg)) { $fPrefixes[$seg] = 0; $fRaw[$seg] = @() }
  $fPrefixes[$seg]++
  $fRaw[$seg] += $clean
}
$fPrefixes.Keys | Sort-Object | ForEach-Object { "{0,-28} {1}" -f $_, $fPrefixes[$_] }

Write-Host ""
Write-Host "=== 3) FRONTEND PREFIXES WITH NO BACKEND COUNTERPART (likely 404) ===" -ForegroundColor Yellow
$missing = @()
foreach ($k in ($fPrefixes.Keys | Sort-Object)) {
  if (-not $bPrefixes.ContainsKey($k)) {
    $missing += ("{0,-24} calls={1}  e.g. {2}" -f $k, $fPrefixes[$k], ($fRaw[$k] | Select-Object -First 3 -Unique) -join ' | ')
  }
}
if ($missing.Count -eq 0) { Write-Host "none" } else { $missing | ForEach-Object { Write-Host $_ } }

Write-Host ""
Write-Host "=== 4) SMALLEST PAGE FILES (stub candidates) ===" -ForegroundColor Cyan
Get-ChildItem -Recurse -File -Include page.tsx "$Root\apps" |
  Where-Object { $_.FullName -notmatch 'node_modules|\\\.next\\' } |
  ForEach-Object {
    [pscustomobject]@{
      Lines = (Get-Content $_.FullName).Count
      Path  = $_.FullName.Replace("$Root\apps\", '')
    }
  } | Sort-Object Lines | Select-Object -First 35 | Format-Table -AutoSize | Out-String -Width 200
