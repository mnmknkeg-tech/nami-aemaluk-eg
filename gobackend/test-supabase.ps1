$regions = @('us-east-1', 'eu-central-1', 'eu-west-1', 'us-west-1', 'me-central-1', 'ap-southeast-1')
$projectRef = 'lsuewzeyfqmoqxflllmb'
$password = 'Sayed444TAHA'

foreach ($r in $regions) {
  $h = "aws-0-$r.pooler.supabase.com"
  Write-Output "Trying $h ..."
  $o = docker run --rm -e "PGPASSWORD=$password" postgres:15-alpine psql -h $h -p 5432 -U "postgres.$projectRef" -d postgres -t -A -c "select 1;" 2>&1
  Write-Output "$o"
  Write-Output "---"
}