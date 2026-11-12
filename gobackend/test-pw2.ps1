# Test pwcheck directly with multiple candidates
$hash = 'argon2id$EruFUwYnwZpym0sCzXWz3Q$AhREn/c9PRg3OhktD5KN+yM4K+10NU3/wVAvdmz1B0I'
$exe = "$env:TEMP\pwcheck.exe"
$r = & $exe admin@mnmknk.com $hash 'Admin123!' 'testpass' 'WrongPass!'
Write-Output "exit code: $LASTEXITCODE"
Write-Output "output:"
$r | Out-String | Write-Output