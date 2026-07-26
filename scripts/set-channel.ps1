# Wire CHANNEL_URL after you create a public Telegram channel
# Usage:
#   .\scripts\set-channel.ps1 -ChannelUrl "https://t.me/YourChannelName"
# Optional:
#   .\scripts\set-channel.ps1 -ChannelUrl "https://t.me/YourChannelName" -ChannelId "-1001234567890"

param(
  [Parameter(Mandatory = $true)]
  [string]$ChannelUrl,
  [string]$ChannelId = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env"

if (-not (Test-Path $envFile)) {
  throw ".env not found at $envFile"
}

$url = $ChannelUrl.Trim().TrimEnd("/")
if ($url -notmatch "^https://t\.me/[A-Za-z0-9_]+$") {
  throw "CHANNEL_URL must look like https://t.me/YourPublicUsername"
}

$content = Get-Content $envFile -Raw
$content = $content -replace "(?m)^CHANNEL_URL=.*$", "CHANNEL_URL=$url"
$content = $content -replace "(?m)^VITE_CHANNEL_URL=.*$", "VITE_CHANNEL_URL=$url"
if ($ChannelId) {
  if ($content -match "(?m)^CHANNEL_ID=") {
    $content = $content -replace "(?m)^CHANNEL_ID=.*$", "CHANNEL_ID=$ChannelId"
  } else {
    $content = $content.TrimEnd() + "`nCHANNEL_ID=$ChannelId`n"
  }
}
Set-Content -Path $envFile -Value $content -NoNewline:$false

Write-Host "Updated .env"
Write-Host "  CHANNEL_URL=$url"
if ($ChannelId) { Write-Host "  CHANNEL_ID=$ChannelId" }
Write-Host ""
Write-Host "Next:"
Write-Host "  1) Add @TrapWarAppBot as Admin on the channel"
Write-Host "  2) Restart bot:  cd $root ; npm run bot"
Write-Host "  3) Optional rebuild Mini App channel banner:"
Write-Host "       `$env:GITHUB_PAGES='true'; `$env:VITE_CHANNEL_URL='$url'; npm run build"
Write-Host "       then redeploy gh-pages"
