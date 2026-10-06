$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000'

$null = Invoke-WebRequest -Uri "$base/api/auth/csrf" -UseBasicParsing -SessionVariable s
$csrf = ((Invoke-WebRequest -Uri "$base/api/auth/csrf" -UseBasicParsing -WebSession $s).Content | ConvertFrom-Json).csrfToken
$form = "csrfToken=$csrf&email=e2e_logic@example.com&password=Passw0rd!23&callbackUrl=$base/dashboard"
$null = Invoke-WebRequest -Uri "$base/api/auth/callback/credentials" -Method POST -WebSession $s `
  -ContentType 'application/x-www-form-urlencoded' -Body $form -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue

function J($method, $uri, $obj) {
  $a = @{ Uri = $uri; Method = $method; UseBasicParsing = $true; WebSession = $s; ErrorAction = 'Stop' }
  if ($obj) { $a.Body = ($obj | ConvertTo-Json -Compress); $a.ContentType = 'application/json' }
  try { Invoke-WebRequest @a } catch { $r = $_.Exception.Response
    $sr = New-Object System.IO.StreamReader($r.GetResponseStream())
    [pscustomobject]@{ Status = $r.StatusCode.value__; Content = $sr.ReadToEnd() } }
}

# 1. Create the form.
$f = (J POST "$base/api/forms" @{ name = 'E2E Logic Form'; description = 'conditional' }).Content | ConvertFrom-Json
$formId = $f.id
"FORM: $formId slug=$($f.slug)"

# 2. Source question: Do you have a dog? (yes_no)
$a = (J POST "$base/api/forms/$formId/fields" @{ type='yes_no'; label='Do you have a dog?'; description=''; required=$true; options=$null }).Content | ConvertFrom-Json
# 3. Target: Dog name, required.
$b = (J POST "$base/api/forms/$formId/fields" @{ type='short_text'; label='What is your dog name?'; description=''; required=$true; options=$null }).Content | ConvertFrom-Json
"FIELDS: a=$($a.id) b=$($b.id)"

# 4. Rule: show b when a == yes
$rule = J POST "$base/api/forms/$formId/logic-rules" @{ sourceFieldId=$a.id; operator='equals'; value='yes'; action='show'; targetFieldId=$b.id; enabled=$true }
"RULE CREATE: $($rule.Status) $($rule.Content)"

# 5. Self-reference must be rejected.
$self = J POST "$base/api/forms/$formId/logic-rules" @{ sourceFieldId=$a.id; operator='equals'; value='yes'; action='show'; targetFieldId=$a.id }
"SELF-REF REJECTED: $($self.Status) $($self.Content)"

# 6. Reverse cycle must be rejected.
$cyc = J POST "$base/api/forms/$formId/logic-rules" @{ sourceFieldId=$b.id; operator='equals'; value='Rex'; action='show'; targetFieldId=$a.id }
"CYCLE REJECTED: $($cyc.Status) $($cyc.Content)"

# 7. Publish.
J PUT "$base/api/forms/$formId" @{ isPublished = $true } | Out-Null
"PUBLISHED"

"FORMSLUG=$($f.slug)"
"FORMA=$($a.id)"
"FORMB=$($b.id)"
"FORMID=$formId"
