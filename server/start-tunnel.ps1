# Local test ke liye: Node server + cloudflared quick tunnel (free, no account).
# Pehle cloudflared install karein:  winget install --id Cloudflare.cloudflared
# Phir:  powershell -ExecutionPolicy Bypass -File server\start-tunnel.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $PSScriptRoot '.env'

if (-not (Test-Path $envFile)) {
  Copy-Item (Join-Path $PSScriptRoot '.env.example') $envFile
  Write-Host "Created server\.env - ELEVENLABS_API_KEY yahan paste karein, phir dobara chalaayein." -ForegroundColor Yellow
  notepad $envFile
  exit 1
}

$key = (Get-Content $envFile | Where-Object { $_ -match '^ELEVENLABS_API_KEY=' }) -replace '^ELEVENLABS_API_KEY=', ''
if (-not $key.Trim()) {
  Write-Host "server\.env mein ELEVENLABS_API_KEY khali hai." -ForegroundColor Yellow
  exit 1
}

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
  Write-Host "cloudflared install nahi hai. Chalane ke liye: winget install --id Cloudflare.cloudflared" -ForegroundColor Yellow
  exit 1
}

$port = 8787
$server = Start-Process -FilePath 'node' -ArgumentList (Join-Path $PSScriptRoot 'standalone.js') `
  -WorkingDirectory $root -PassThru -WindowStyle Minimized
Write-Host "Node server started (pid $($server.Id)) on port $port" -ForegroundColor Green

Start-Sleep -Seconds 2
$tunnel = Start-Process -FilePath 'cloudflared' -ArgumentList 'tunnel','--url',"http://localhost:$port" `
  -PassThru -NoNewWindow -RedirectStandardOutput (Join-Path $env:TEMP 'cf-out.txt') -RedirectStandardError (Join-Path $env:TEMP 'cf-err.txt')

$url = $null
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 1
  $raw = (Get-Content (Join-Path $env:TEMP 'cf-err.txt') -ErrorAction SilentlyContinue) -join "`n"
  if ($raw -match 'https://[a-z0-9-]+\.trycloudflare\.com') { $url = $Matches[0]; break }
}

if ($url) {
  Write-Host ""
  Write-Host "PUBLIC ENDPOINT: $url/callback" -ForegroundColor Cyan
  Write-Host "Is URL ko index.html ke CALLBACK_ENDPOINT mein daalein. Band karne ke liye Ctrl+C." -ForegroundColor Cyan
} else {
  Write-Host "Tunnel URL nahi mila. Logs: $env:TEMP\cf-err.txt" -ForegroundColor Yellow
}

Write-Host "Band karne ke liye: Stop-Process -Id $($server.Id),$($tunnel.Id)"
while (-not $server.HasExited) { Start-Sleep -Seconds 5 }
