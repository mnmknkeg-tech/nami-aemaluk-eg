$all = Get-Content 'c:\Users\Dream\ray-eg-1\fe-paths.txt'
$paths = $all |
  ForEach-Object { $_ -replace '\$\{[^}]*\}', '00000000-0000-0000-0000-000000000000' } |
  ForEach-Object { $_ -replace '\{\}', '00000000-0000-0000-0000-000000000000' } |
  Where-Object { $_ -notmatch '\$' } |
  Sort-Object -Unique

Write-Host "probing $($paths.Count) paths" -ForegroundColor Cyan

function Probe($method, $p) {
  $url = 'http://localhost:4000/api/v1' + $p
  try {
    $r = Invoke-WebRequest -Uri $url -Method $method -UseBasicParsing -TimeoutSec 8 -ErrorAction Stop
    return [int]$r.StatusCode
  } catch {
    $resp = $_.Exception.Response
    if ($resp -ne $null) { return [int]$resp.StatusCode }
    return -1
  }
}

$results = @()
foreach ($p in $paths) {
  $code = Probe 'GET' $p
  if ($code -eq 404) {
    foreach ($m in @('POST','PUT','PATCH')) {
      $c2 = Probe $m $p
      if ($c2 -ne 404) { $code = $c2; $method = $m; break }
    }
  } else { $method = 'GET' }
  $results += [pscustomobject]@{ Code = $code; Method = $method; Path = $p }
  Write-Host ("{0,5} {1,-6} {2}" -f $code, $method, $p)
}

Write-Host ""
Write-Host "=== 404 = ROUTE TRULY MISSING ===" -ForegroundColor Yellow
($results | Where-Object { $_.Code -eq 404 }).Path
Write-Host ""
Write-Host ("404 count: " + (($results | Where-Object { $_.Code -eq 404 }).Count) + " / " + $results.Count)
