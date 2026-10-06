$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000'

# One session reused across all calls; -SessionVariable keeps cookies alive.
$null = Invoke-WebRequest -Uri "$base/api/auth/csrf" -UseBasicParsing -SessionVariable s
$csrf = ((Invoke-WebRequest -Uri "$base/api/auth/csrf" -UseBasicParsing -WebSession $s).Content |
  ConvertFrom-Json).csrfToken

$form = "csrfToken=$csrf&email=e2e_logic@example.com&password=Passw0rd!23&callbackUrl=$base/dashboard"
$r = Invoke-WebRequest -Uri "$base/api/auth/callback/credentials" -Method POST `
  -WebSession $s -ContentType 'application/x-www-form-urlencoded' -Body $form `
  -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
"signin status: $($r.StatusCode)"

$me = Invoke-WebRequest -Uri "$base/api/auth/session" -UseBasicParsing -WebSession $s
"SESSION: $($me.Content)"
