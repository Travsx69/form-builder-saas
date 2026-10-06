$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000'
$null = Invoke-WebRequest -Uri "$base/api/auth/csrf" -UseBasicParsing -SessionVariable s
$csrf = ((Invoke-WebRequest -Uri "$base/api/auth/csrf" -UseBasicParsing -WebSession $s).Content | ConvertFrom-Json).csrfToken
$form = "csrfToken=$csrf&email=e2e_logic@example.com&password=Passw0rd!23&callbackUrl=$base/dashboard"
$null = Invoke-WebRequest -Uri "$base/api/auth/callback/credentials" -Method POST -WebSession $s `
  -ContentType 'application/x-www-form-urlencoded' -Body $form -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
$me = Invoke-WebRequest -Uri "$base/api/auth/session" -UseBasicParsing -WebSession $s
"SESSION: $($me.Content)"

$list = (Invoke-WebRequest -Uri "$base/dashboard/forms" -UseBasicParsing -WebSession $s).Content
$m = [regex]::Match($list, 'e2e-logic-form')
"dashboard forms page reachable: $($m.Success)"

# Use the known id from the previous step.
$formId = 'cmupaep7800049e7jcxzdiyn8'
$csv = Invoke-WebRequest -Uri "$base/api/forms/$formId/responses/export" -UseBasicParsing -WebSession $s
"--- CSV ---"
$csv.Content
