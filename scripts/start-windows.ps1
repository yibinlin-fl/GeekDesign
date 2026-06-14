$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$api = Join-Path $root "apps\api"

Write-Host "Preparing GeekDesign local database..." -ForegroundColor Cyan
Push-Location $api
python -m app.db.bootstrap
Pop-Location

Write-Host "Starting GeekDesign API and web editor..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$api'; python -m uvicorn app.main:app --reload"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root'; pnpm dev"

Write-Host "Waiting for the web editor..." -ForegroundColor Cyan
Start-Sleep -Seconds 7
Start-Process "http://127.0.0.1:3000"
Write-Host "GeekDesign opened at http://127.0.0.1:3000" -ForegroundColor Green
