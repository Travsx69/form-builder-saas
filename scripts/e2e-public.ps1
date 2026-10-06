$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000'
$slug = 'e2e-logic-form'

# What the public GET now returns.
$pub = (Invoke-WebRequest -Uri "$base/api/forms/public/$slug" -UseBasicParsing).Content | ConvertFrom-Json
"PUBLIC fields=$($pub.fields.Count) rules=$($pub.logicRules.Count)"
"PUBLIC rule: source=$($pub.logicRules[0].fieldId) cond=$($pub.logicRules[0].condition) val=$($pub.logicRules[0].value) action=$($pub.logicRules[0].action) target=$($pub.logicRules[0].targetField)"

$a = $pub.fields[0].id; $b = $pub.fields[1].id

function Submit($vals, $label) {
  $json = @{ fieldValues = $vals } | ConvertTo-Json -Depth 5 -Compress
  try {
    $r = Invoke-WebRequest -Uri "$base/api/forms/public/$slug/submit" -Method POST `
      -ContentType 'application/json' -Body $json -UseBasicParsing -ErrorAction Stop
    "  $label -> $($r.StatusCode) $($r.Content)"
  } catch {
    $resp = $_.Exception.Response
    $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
    "  $label -> $($resp.StatusCode.value__) $($sr.ReadToEnd())"
  }
}

"HIDDEN REQUIRED (a=no, omit b):"
Submit @{ $a = 'no' } 'expect 200'

"VISIBLE REQUIRED (a=yes, omit b):"
Submit @{ $a = 'yes' } 'expect 400'

"VISIBLE FILLED (a=yes, b=Rex):"
Submit @{ $a = 'yes'; $b = 'Rex' } 'expect 200'

"HIDDEN BUT VALUE SENT (a=no, b=sneaky) - value must be dropped:"
Submit @{ $a = 'no'; $b = 'sneaky' } 'expect 200, only a stored'

"UNKNOWN FIELD (a=no, ghost=1):"
Submit @{ $a = 'no'; ghost = 'x' } 'expect 400'
