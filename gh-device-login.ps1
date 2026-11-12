param(
  [Parameter(Mandatory=$true)][string]$DeviceCode,
  [Parameter(Mandatory=$true)][string]$ClientId,
  [Parameter(Mandatory=$true)][string]$GhExe
)
$statusFile = Join-Path $env:TEMP 'gh_auth_status.txt'
$interval = 5
$deadline = (Get-Date).AddSeconds(870)
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Seconds $interval
  try {
    $r = Invoke-RestMethod -Method Post -Uri 'https://github.com/login/device/token' `
      -Body @{
        client_id = $ClientId
        device_code = $DeviceCode
        grant_type = 'urn:ietf:params:oauth:grant-type:device_code'
      } -ErrorAction Stop
    if ($r.access_token) {
      $r.access_token | & $GhExe auth login --with-token
      & $GhExe config set git_protocol https
      & $GhExe auth setup-git
      Set-Content -Path $statusFile -Value 'success'
      exit 0
    }
  } catch {
    $msg = ''
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $msg = $_.ErrorDetails.Message } else { $msg = $_.Exception.Message }
    if ($msg -match 'authorization_pending') { continue }
    if ($msg -match 'slow_down') { $interval = $interval + 5; continue }
    Set-Content -Path $statusFile -Value ("failed: " + $msg)
    exit 1
  }
}
Set-Content -Path $statusFile -Value 'timeout'
