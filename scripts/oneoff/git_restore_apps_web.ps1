$repo = 'C:\Users\Dream\ray-eg-1'
Set-Location $repo

# Ensure we're in a git repo
$inside = git rev-parse --is-inside-work-tree 2>$null
if ($LASTEXITCODE -ne 0 -or $inside -ne 'true') {
  Write-Output 'NOT_A_GIT_REPO'
  exit 2
}

$dest = Join-Path $repo 'apps\web'
if (Test-Path $dest) {
  $ts = Get-Date -Format 'yyyyMMdd_HHmmss'
  $backup = $dest + '.deleted.' + $ts
  Move-Item -LiteralPath $dest -Destination $backup -Force
  Write-Output "RENAMED_EXISTING:$backup"
}

# Find latest commit containing apps/web
$commit = git rev-list -n 1 HEAD -- 'apps/web' 2>$null
if (-not $commit) {
  Write-Output 'NO_COMMIT_FOUND_FOR_APPS_WEB'
  git --no-pager log --pretty=oneline -- 'apps/web' -n 20
  exit 3
}

Write-Output ("FOUND_COMMIT:" + $commit)

# Restore files from that commit to working tree
# Use git checkout -- to restore into working tree
git checkout $commit -- 'apps/web'
if ($LASTEXITCODE -ne 0) {
  Write-Output 'GIT_CHECKOUT_FAILED'
  exit 4
}

Write-Output 'RESTORE_OK'
Get-ChildItem -Path $dest -Force | Select-Object Name,PSIsContainer -First 200 | Format-Table -AutoSize
