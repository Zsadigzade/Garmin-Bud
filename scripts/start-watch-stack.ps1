# Starts garmin-bud serve + Cloudflare tunnel for the Connect IQ watch widget.
# Run from repo root: .\scripts\start-watch-stack.ps1

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Stop-PortListener([int]$Port) {
    $connections = netstat -ano | Select-String ":$Port\s"
    foreach ($line in $connections) {
        if ($line -match "\sLISTENING\s+(\d+)\s*$") {
            $pid = [int]$Matches[1]
            Write-Host "Stopping process on port $Port (PID $pid)..."
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host "GarminBud watch stack startup"
Write-Host ""

# Free port if a stale server is running
Stop-PortListener -Port 3847
Start-Sleep -Seconds 1

# Start HTTP server
Write-Host "Starting garmin-bud serve..."
$serveJob = Start-Job -ScriptBlock {
    Set-Location $using:RepoRoot
    npx garmin-bud serve 2>&1
}

Start-Sleep -Seconds 3

try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:3847/health" -TimeoutSec 10
    Write-Host "Server OK: $($health.status)"
} catch {
    Write-Host "Server failed to start. Job output:"
    Receive-Job $serveJob
    throw
}

# Start tunnel
if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "cloudflared not found. Install with: scoop install cloudflared"
    Write-Host "Server is running locally at http://127.0.0.1:3847"
    exit 1
}

Write-Host "Starting Cloudflare tunnel..."
$tunnelJob = Start-Job -ScriptBlock {
    cloudflared tunnel --url http://127.0.0.1:3847 2>&1
}

$tunnelUrl = $null
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    $output = Receive-Job $tunnelJob -ErrorAction SilentlyContinue
    if ($output -match "(https://[a-z0-9-]+\.trycloudflare\.com)") {
        $tunnelUrl = $Matches[1]
        break
    }
}

if (-not $tunnelUrl) {
    Write-Host "Tunnel started but URL not detected yet. Check tunnel job output."
} else {
    Write-Host ""
    Write-Host "=== Watch widget settings (Garmin Connect Mobile) ==="
    Write-Host "Server URL: $tunnelUrl"
    Write-Host "API Key:    (copy GARMIN_MCP_API_KEY from .env)"
    Write-Host ""
    Write-Host "Test: curl -H `"Authorization: Bearer YOUR_KEY`" $tunnelUrl/api/watch"
}

Write-Host ""
Write-Host "Server and tunnel are running in background jobs."
Write-Host "Stop with: Get-Job | Stop-Job; Get-Job | Remove-Job"
Write-Host "Or close this PowerShell session."

# Keep script alive so jobs stay attached to session
while ($true) {
    Start-Sleep -Seconds 60
    if ($serveJob.State -eq "Failed") {
        Write-Host "Server job failed:"
        Receive-Job $serveJob
        break
    }
}
