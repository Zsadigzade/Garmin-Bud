# Starts garmin-bud serve + Cloudflare tunnel for the Connect IQ watch widget.
# Run from repo root: .\scripts\start-watch-stack.ps1

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Stop-PortListener([int]$Port) {
    $connections = netstat -ano | Select-String ":$Port\s"
    foreach ($line in $connections) {
        if ($line -match "\sLISTENING\s+(\d+)\s*$") {
            $processId = [int]$Matches[1]
            Write-Host "Stopping process on port $Port (PID $processId)..."
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
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
for ($i = 0; $i -lt 45; $i++) {
    Start-Sleep -Seconds 1
    $output = Receive-Job $tunnelJob -ErrorAction SilentlyContinue
    if (-not $output) {
        continue
    }

    # Receive-Job may return an array; -match on arrays does not populate $Matches.
    $outputText = ($output | ForEach-Object { $_.ToString() }) -join "`n"
    $match = [regex]::Match(
        $outputText,
        "https://[-a-z0-9]+\.trycloudflare\.com",
        [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
    )

    if ($match.Success) {
        $tunnelUrl = $match.Value
        break
    }
}

if (-not $tunnelUrl) {
    Write-Host "Tunnel started but URL not detected yet. Recent tunnel output:"
    $pendingOutput = Receive-Job $tunnelJob -ErrorAction SilentlyContinue
    if ($pendingOutput) {
        $pendingOutput | ForEach-Object { Write-Host $_ }
    }
    Write-Host ""
    Write-Host "Look for a line like: https://xxxx.trycloudflare.com"
} else {
    $setupPath = Join-Path $RepoRoot ".garmin\watch-setup.json"
    New-Item -ItemType Directory -Force -Path (Split-Path $setupPath) | Out-Null
    @{ serverUrl = $tunnelUrl; updatedAt = (Get-Date).ToUniversalTime().ToString("o") } |
        ConvertTo-Json |
        Set-Content -Path $setupPath -Encoding utf8

    Write-Host ""
    # Read API key from .env for dashboard link
    $apiKey = ""
    if (Test-Path (Join-Path $RepoRoot ".env")) {
        $envLine = Get-Content (Join-Path $RepoRoot ".env") | Select-String "^GARMIN_MCP_API_KEY="
        if ($envLine) { $apiKey = ($envLine -replace "^GARMIN_MCP_API_KEY=", "").Trim() }
    }

    Write-Host "=== Watch widget setup ==="
    Write-Host "1. In Garmin Connect app -> Widget settings:"
    Write-Host "   Server URL: $tunnelUrl"
    Write-Host ""
    Write-Host "2. Open dashboard to pair watch + set Claude key:"
    if ($apiKey) {
        Write-Host "   $tunnelUrl/dashboard?token=$apiKey"
    } else {
        Write-Host "   $tunnelUrl/dashboard?token=YOUR_GARMIN_MCP_API_KEY"
    }
    Write-Host ""
    Write-Host "Saved to: $setupPath"
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
