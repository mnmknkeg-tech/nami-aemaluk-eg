$fonts = @(
  @{ id='alexandria';      variants=@('300','400','500','600','700','800') },
  @{ id='cairo';           variants=@('regular','500','600','700','800') },
  @{ id='tajawal';         variants=@('400','500','700','800') },
  @{ id='amiri';           variants=@('regular','700') },
  @{ id='almarai';         variants=@('300','400','700','800') },
  @{ id='ibm-plex-sans-arabic'; variants=@('regular','500','600','700') }
)
$tmp = Join-Path $env:TEMP 'gwfh'
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
foreach ($f in $fonts) {
  $v = ($f.variants -join ',')
  $zip = Join-Path $tmp "$($f.id).zip"
  $url = "https://gwfh.mranftl.com/api/fonts/$($f.id)?download=zip&subsets=arabic,latin&variants=$v&formats=woff2"
  Write-Host "Downloading $($f.id)..."
  Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
  $dest = Join-Path $tmp $f.id
  if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
  Expand-Archive -Path $zip -DestinationPath $dest -Force
}
Write-Host "Done"