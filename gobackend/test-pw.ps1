# Test candidate passwords against admin@mnmknk.com hash
$hash = 'argon2id$EruFUwYnwZpym0sCzXWz3Q$AhREn/c9PRg3OhktD5KN+yM4K+10NU3/wVAvdmz1B0I'
$exe = "$env:TEMP\pwcheck.exe"
$cands = @('Admin123!', 'Admin123', 'Passw0rd!', 'Password123!', 'admin1234', 'mnmknk123', 'Mnmknk123!', 'mnmknk.com', 'Ray123456!', 'RayAdmin2026!', 'Nami2026!', 'Sayed123!', 'Sayed444TAHA', 'Admin@mnmknk', 'Admin@1234!', 'ray-admin-2025-01-25-secure-token-32', 'SuperAdmin123!', 'NamiAdmin2026!', 'mnmknkAdmin123!', 'P@ssw0rd!', 'Test1234!', 'Ray-eg-2026!', 'Dashboard123!', 'mnmknk_2026!', 'Ray123!@#')
$found = $false
foreach ($c in $cands) {
  $r = & $exe admin@mnmknk.com $hash $c 2>$null
  $out = ($r | Out-String).Trim()
  $line = ($out | Select-Object -Last 1)
  Write-Output "$c => $line"
  if ($line -like '*MATCH*') { $found = $true; break }
}
if (-not $found) { Write-Output "*** NO MATCH FOUND among $($cands.Length) candidates ***" }