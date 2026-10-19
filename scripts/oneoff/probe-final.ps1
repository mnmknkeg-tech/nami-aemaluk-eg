$ProgressPreference = 'SilentlyContinue'
$Root = 'c:\Users\Dream\ray-eg-1'
$out = "$Root\probe-final.txt"
if (Test-Path $out) { Remove-Item $out -Force }

$rows = Get-Content -LiteralPath "$Root\fe-calls.tsv" -Encoding UTF8
Write-Host "rows: $($rows.Count)"

function Probe($method, $p) {
  $url = 'http://localhost:4000/api/v1' + $p
  try {
    $r = Invoke-WebRequest -Uri $url -Method $method -UseBasicParsing -TimeoutSec 12 -ErrorAction Stop
    return [int]$r.StatusCode
  } catch {
    if ($null -ne $_.Exception.Response) {
      try { return [int]$_.Exception.Response.StatusCode } catch { return -1 }
    }
    return -1
  }
}

$missing = New-Object System.Collections.Generic.List[string]
$wrong   = New-Object System.Collections.Generic.List[string]
$srv     = New-Object System.Collections.Generic.List[string]
$unknown = New-Object System.Collections.Generic.List[string]
$ok = 0; $n = 0

foreach ($row in $rows) {
  $parts = $row -split "`t"
  if ($parts.Count -lt 2) { continue }
  $p = $parts[0]; $declared = @($parts[1] -split ',') | Where-Object { $_ -ne '' }
  $src = if ($parts.Count -ge 3) { $parts[2] } else { '' }
  $probePath = $p -replace '\{\}', '00000000-0000-0000-0000-000000000000'

  # prefer GET when declared, else declared order
  $order = @()
  if ($declared -contains 'GET') { $order += 'GET' }
  $order += ($declared | Where-Object { $_ -ne 'GET' })
  if ($order.Count -eq 0) { $order = @('GET') }

  $codes = @(); $best = -1
  foreach ($mth in $order) {
    $c = Probe $mth $probePath
    $codes += "$mth=$c"
    if ($c -ne 404 -and $c -ne 405) { $best = $c; break }
    if ($best -lt 0) { $best = $c }
  }
  if ($best -eq 404 -or $best -eq 405) {
    foreach ($mth in @('POST','PUT','PATCH','DELETE','GET')) {
      if ($order -contains $mth) { continue }
      $c = Probe $mth $probePath
      $codes += "$mth=$c"
      if ($c -ne 404 -and $c -ne 405 -and $c -ne -1) { $best = $c; break }
    }
  }

  $line = "{0,-52} | {1} | {2}" -f $p, ($codes -join ' '), $src
  if ($best -eq 404) { $missing.Add($line) }
  elseif ($best -eq 405) { $wrong.Add($line) }
  elseif ($best -ge 500) { $srv.Add($line) }
  elseif ($best -eq -1) { $unknown.Add($line) }
  else { $ok++ }
  $n++
  Add-Content -LiteralPath $out -Value $line -Encoding UTF8
}

$res = New-Object System.Collections.Generic.List[string]
$res.Add("probed: $n   OK: $ok")
$res.Add("")
$res.Add("===== 404 TRULY MISSING ($($missing.Count)) =====")
foreach ($x in $missing) { $res.Add($x) }
$res.Add("")
$res.Add("===== 405 METHOD MISMATCH ($($wrong.Count)) =====")
foreach ($x in $wrong) { $res.Add($x) }
$res.Add("")
$res.Add("===== 5xx ($($srv.Count)) =====")
foreach ($x in $srv) { $res.Add($x) }
$res | Set-Content -LiteralPath "$Root\probe-summary.txt" -Encoding UTF8
Write-Host "done: probed=$n ok=$ok missing=$($missing.Count) wrong=$($wrong.Count) 5xx=$($srv.Count)"