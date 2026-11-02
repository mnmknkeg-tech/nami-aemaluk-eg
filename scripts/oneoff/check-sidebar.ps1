$real = New-Object System.Collections.Generic.HashSet[string]
Get-ChildItem -Recurse -File -Filter page.tsx apps\dashboard-web\app |
  Where-Object { $_.FullName -notmatch 'node_modules|\.next' } |
  ForEach-Object {
    $r = ($_.FullName -replace '\\', '/')
    $r = $r -replace '.*/apps/dashboard-web/app/', ''
    $r = $r -replace '/page\.tsx$', ''
    $r = ($r -split '/' | Where-Object { $_ -notmatch '^\(' -and $_ -notmatch '^\[' -and $_ -ne '' }) -join '/'
    [void]$real.Add('/' + $r)
  }
Write-Host "real dashboard+top routes: $($real.Count)"
Write-Host "has /dashboard : $($real.Contains('/dashboard'))"
Write-Host ""
$hrefs = ([regex]::Matches([System.IO.File]::ReadAllText('apps\dashboard-web\src\config\sidebar.ts'), "href:\s*'(/dashboard[^'?]*)'") | ForEach-Object { $_.Groups[1].Value }) | Sort-Object -Unique
Write-Host "sidebar hrefs: $($hrefs.Count)"
Write-Host ""
Write-Host "=== SIDEBAR LINKS WITH NO REAL PAGE (land on catch-all placeholder) ===" -ForegroundColor Yellow
$n = 0
foreach ($h in $hrefs) {
  if (-not $real.Contains($h)) { Write-Host "  $h"; $n++ }
}
Write-Host "count: $n"