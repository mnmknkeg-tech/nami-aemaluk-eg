$hash = 'argon2id$EruFUwYnwZpym0sCzXWz3Q$AhREn/c9PRg3OhktD5KN+yM4K+10NU3/wVAvdmz1B0I'
$exe = "$env:TEMP\pwcheck.exe"
$cands = @('Admin123!', 'Admin123', 'Passw0rd!', 'Password123!', 'admin1234', 'mnmknk123', 'Mnmknk123!', 'mnmknk.com', 'Ray123456!', 'RayAdmin2026!', 'Nami2026!', 'Sayed123!', 'Sayed444TAHA', 'Admin@mnmknk', 'Admin@1234!', 'ray-admin-2025-01-25-secure-token-32', 'SuperAdmin123!', 'NamiAdmin2026!', 'mnmknkAdmin123!', 'P@ssw0rd!', 'Test1234!', 'Ray-eg-2026!', 'Dashboard123!', 'mnmknk_2026!', 'Ray123!@#')
$r = & $exe admin@mnmknk.com $hash $cands 2>$null
Write-Output "exit code: $LASTEXITCODE"
$r | Out-String | Write-Output