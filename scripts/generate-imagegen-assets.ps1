param(
  [string]$ProxyClient = $(if ($env:IMAGEGEN_PROXY_CLIENT) { $env:IMAGEGEN_PROXY_CLIENT } else { Join-Path $env:USERPROFILE ".codex\skills\my-image-gen\scripts\proxy_client.py" }),
  [string]$Config = (Join-Path $PSScriptRoot "..\configs\imagegen-x666.json"),
  [string]$Model = "gpt-image-2",
  [int]$DelaySeconds = 155,
  [int]$InitialDelaySeconds = 0
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$publicDir = Join-Path $repoRoot "public"
$jobs = Get-Content -Raw (Join-Path $PSScriptRoot "imagegen-jobs.json") | ConvertFrom-Json

$health = & python $ProxyClient health | ConvertFrom-Json
if (-not $health.ok) {
  throw "my-image-gen proxy is not reachable. Start start_proxy.ps1 in a normal PowerShell window."
}

Push-Location $publicDir
try {
  $generatedAny = $false
  $hasPendingJobs = @($jobs | Where-Object { -not (Test-Path -LiteralPath (Join-Path $publicDir ("assets\visual-v2\" + $_.file))) }).Count -gt 0
  if ($hasPendingJobs -and $InitialDelaySeconds -gt 0) {
    Write-Host "Waiting $InitialDelaySeconds seconds for the provider rate-limit window"
    Start-Sleep -Seconds $InitialDelaySeconds
  }
  foreach ($job in $jobs) {
    $stagedFile = Join-Path $publicDir ("assets\visual-v2\" + $job.file)
    if (Test-Path -LiteralPath $stagedFile) {
      Write-Host "Keeping existing staged asset $($job.id)"
      continue
    }
    if ($generatedAny -and $DelaySeconds -gt 0) {
      Write-Host "Waiting $DelaySeconds seconds before the next provider request"
      Start-Sleep -Seconds $DelaySeconds
    }
    Write-Host "Generating $($job.id) -> $($job.file)"
    & python $ProxyClient generate `
      --config (Resolve-Path $Config).Path `
      --model $Model `
      --quality medium `
      --size $job.size `
      --prompt $job.prompt `
      --out ("visual-v2/" + $job.file) `
      --timeout 300
    if ($LASTEXITCODE -ne 0) {
      throw "Generation failed for $($job.id)"
    }
    $generatedAny = $true
  }
}
finally {
  Pop-Location
}

$stagingDir = Join-Path $publicDir "assets\visual-v2"
$publicAssetsDir = Join-Path $publicDir "assets"

& python (Join-Path $PSScriptRoot "prepare-imagegen-assets.py") `
  $stagingDir `
  (Join-Path $publicDir "assets")

if ($LASTEXITCODE -ne 0) {
  throw "Generated images were created, but derivative preparation failed."
}

$resolvedStaging = (Resolve-Path $stagingDir).Path
$resolvedAssets = (Resolve-Path $publicAssetsDir).Path.TrimEnd("\") + "\"
if (-not $resolvedStaging.StartsWith($resolvedAssets, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to remove staging outside public assets: $resolvedStaging"
}
Remove-Item -LiteralPath $resolvedStaging -Recurse -Force
