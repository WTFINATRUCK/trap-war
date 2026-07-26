# Wire COMMUNITY_URL after you create a Telegram group for player chat.
#
#   .\scripts\set-community.ps1 -CommunityUrl "https://t.me/TrapWarChat"
#   .\scripts\set-community.ps1 -CommunityUrl "https://t.me/+AbCdEfGhIjKl" -CommunityId "-1001234567890"
#
# Optional channel too:
#   .\scripts\set-community.ps1 -CommunityUrl "https://t.me/TrapWarChat" -ChannelUrl "https://t.me/TrapWarOfficial"

param(
  [Parameter(Mandatory = $true)]
  [string]$CommunityUrl,

  [string]$CommunityId = "",
  [string]$ChannelUrl = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env"

if (-not (Test-Path $envFile)) {
  throw "Missing .env at $envFile — copy .env.example first"
}

$url = $CommunityUrl.Trim().TrimEnd("/")
if ($url -notmatch "^https?://t\.me/") {
  throw "COMMUNITY_URL must look like https://t.me/YourGroup or https://t.me/+InviteHash"
}

$content = Get-Content $envFile -Raw

function Set-EnvLine([string]$text, [string]$key, [string]$value) {
  if ($text -match "(?m)^$key=") {
    return ($text -replace "(?m)^$key=.*$", "$key=$value")
  }
  return $text.TrimEnd() + "`n$key=$value`n"
}

$content = Set-EnvLine $content "COMMUNITY_URL" $url
$content = Set-EnvLine $content "VITE_COMMUNITY_URL" $url

if ($CommunityId) {
  $content = Set-EnvLine $content "COMMUNITY_ID" $CommunityId
}

if ($ChannelUrl) {
  $ch = $ChannelUrl.Trim().TrimEnd("/")
  $content = Set-EnvLine $content "CHANNEL_URL" $ch
  $content = Set-EnvLine $content "VITE_CHANNEL_URL" $ch
}

Set-Content -Path $envFile -Value $content -Encoding UTF8 -NoNewline

Write-Host ""
Write-Host "  COMMUNITY_URL=$url"
if ($CommunityId) { Write-Host "  COMMUNITY_ID=$CommunityId" }
if ($ChannelUrl) { Write-Host "  CHANNEL_URL=$($ChannelUrl.Trim().TrimEnd('/'))" }
Write-Host ""
Write-Host "Next:"
Write-Host "  1. Restart bot:  npm run bot"
Write-Host "  2. Rebuild Mini App with community link:"
Write-Host "       `$env:GITHUB_PAGES='true'"
Write-Host "       `$env:VITE_COMMUNITY_URL='$url'"
Write-Host "       `$env:VITE_CHANNEL_URL='$(($ChannelUrl -replace '/$','') -or 'from .env')'"
Write-Host "       npm run build"
Write-Host "  3. Bot commands: /community  /chat  /channel"
Write-Host "  4. Pin the community link in your channel"
Write-Host ""
