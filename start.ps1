# AI Ecom Workbench - One-click launcher
# Double-click start.bat to run this.
# This script auto-loads .env into the Node process before start.

$ErrorActionPreference = 'Continue'
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectDir

# Locate Node (WorkBuddy managed, fall back to PATH)
$NodeExe = $null
$candidates = @(
  "C:\Users\lenovo\.workbuddy\binaries\node\versions\22.22.2\node.exe",
  "C:\Users\lenovo\.workbuddy\binaries\node\versions\22.12.0\node.exe"
)
foreach ($p in $candidates) { if (Test-Path $p) { $NodeExe = $p; break } }
if (-not $NodeExe) {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd) { $NodeExe = $cmd.Source }
}
if (-not $NodeExe) {
  Write-Host "[ERROR] Node.js not found." -ForegroundColor Red
  Write-Host "        Install from https://nodejs.org (LTS)" -ForegroundColor Red
  Read-Host "Press Enter to exit"
  exit 1
}

# Kill any old process on 8787
$conn = Get-NetTCPConnection -LocalPort 8787 -ErrorAction SilentlyContinue
if ($conn) {
  $pids = $conn | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($p in $pids) {
    Write-Host "[CLEAN] Killing PID $p on port 8787" -ForegroundColor Yellow
    Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Seconds 1
}

# Pre-load .env into process-level env vars so Node picks them up
if (Test-Path ".env") {
  Write-Host "[env] Loading .env" -ForegroundColor Cyan
  Get-Content .env | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
      $m = [regex]::Match($line, '^([A-Z0-9_]+)=(.*)$')
      if ($m.Success) {
        [System.Environment]::SetEnvironmentVariable($m.Groups[1].Value, $m.Groups[2].Value, "Process")
      }
    }
  }
} else {
  Write-Host "[WARN] .env not found, copying from .env.example" -ForegroundColor Yellow
  if (Test-Path ".env.example") {
    Copy-Item ".env.example" ".env" -Force
    Write-Host "[WARN] Created .env from template. Please fill in your API Key and re-run." -ForegroundColor Yellow
    notepad .env
  } else {
    Write-Host "[ERROR] .env.example missing too" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
  }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   AI Ecom Workbench - Starting..." -ForegroundColor Cyan
Write-Host "   Web UI: http://localhost:8787" -ForegroundColor Cyan
Write-Host "   (Close this window to stop the server)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

& $NodeExe server/index.js

Write-Host ""
Write-Host "[STOPPED] Server has stopped." -ForegroundColor Yellow
Read-Host "Press Enter to close"
