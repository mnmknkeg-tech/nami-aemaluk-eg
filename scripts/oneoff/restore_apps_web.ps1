$zip='C:\Users\Dream\next-backups\apps-web-20260603_221425.zip'
$dest='C:\Users\Dream\ray-eg-1\apps\web'

if (-not (Test-Path $zip)) {
  Write-Output "ZIP_MISSING"
  exit 3
}

if (Test-Path $dest) {
  $ts = Get-Date -Format 'yyyyMMdd_HHmmss'
  $backup = $dest + '.deleted.' + $ts
  Move-Item -LiteralPath $dest -Destination $backup -Force
  Write-Output "RENAMED_EXISTING:$backup"
}

Write-Output "Stopping node/ts processes..."
taskkill /IM node.exe /F 2>$null | Out-Null
taskkill /IM tsc.exe /F 2>$null | Out-Null
taskkill /IM tsx.exe /F 2>$null | Out-Null

Write-Output "Extracting..."
Expand-Archive -LiteralPath $zip -DestinationPath $dest -Force -ErrorAction Stop

Write-Output "EXTRACT_OK"
Get-ChildItem -Path $dest -Force | Select-Object Name,PSIsContainer -First 80 | Format-Table -AutoSize
