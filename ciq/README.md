# GarminBud Connect IQ Widget

Display GarminBud recovery, sleep, activity, stress, and VO2 max on your Garmin watch.

The widget calls `GET /api/watch` on your running `garmin-bud serve` instance (via HTTPS tunnel). It does **not** run AI on the watch — it shows a compact summary from your local GarminBud server.

## Prerequisites

1. **GarminBud server running**
   ```bash
   garmin-bud serve
   ```

2. **HTTPS tunnel** (required — watches need HTTPS)
   ```bash
   cloudflared tunnel --url http://127.0.0.1:3847
   ```
   Copy the `https://*.trycloudflare.com` URL.

3. **API key** from your `.env`:
   ```env
   GARMIN_MCP_API_KEY=your-key-here
   ```

4. **[Connect IQ SDK](https://developer.garmin.com/connect-iq/sdk/)** installed

5. **Developer key** from [Garmin Developer Portal](https://developer.garmin.com/connect-iq/submit-an-app/)

## Configure the widget

After sideloading, open **Garmin Connect Mobile** → your device → **Connect IQ** → **GarminBud** → settings:

| Setting | Value |
|---------|-------|
| **Server URL** | Your tunnel URL, e.g. `https://abc.trycloudflare.com` (no trailing slash) |
| **API Key** | Your `GARMIN_MCP_API_KEY` from `.env` |

Sync your watch after saving settings.

## Build and sideload

**Quick build** (uses active SDK from Garmin Connect IQ SDK Manager):

```powershell
cd "C:\Users\zsadi\Desktop\#Garmin\ciq"
.\build.ps1
# Default device: fenix847mm (Fenix 8 47mm)
```

**SDK location on this machine:**

```
C:\Users\zsadi\AppData\Roaming\Garmin\ConnectIQ\Sdks\connectiq-sdk-win-9.2.0-2026-06-09-92a1605b2\bin\
```

**Manual build:**

```powershell
$SdkBin = "$env:APPDATA\Garmin\ConnectIQ\Sdks\connectiq-sdk-win-9.2.0-2026-06-09-92a1605b2\bin"
monkeyc -f monkey.jungle -o bin/GarminBud.prg -y developer_key.der -d fenix847mm -w
```

First run generates `developer_key.der` via OpenSSL if missing.

**Simulator:**

```powershell
monkeydo bin/GarminBud.prg fenix847mm
connectiq
```

## Using the widget

1. Add the **GarminBud** widget to your watch face widget loop
2. Open it — it fetches fresh data from your server
3. **Tap** to cycle through cards:
   - Recovery (score + label)
   - Sleep (hours + score)
   - Activity (name + distance)
   - Stress (average + label)
   - VO2 Max (value + trend)

Tap again on error/config screens to retry.

## API endpoint

The server exposes:

```http
GET /api/watch
Authorization: Bearer YOUR_GARMIN_MCP_API_KEY
```

Example response:

```json
{
  "recovery": { "score": 72, "label": "Light" },
  "sleep": { "hours": 7.5, "score": 85, "label": "Great" },
  "activity": { "name": "Morning Run", "distance_km": 5.2, "date": "2026-06-26 07:30:00" },
  "stress": { "avg": 28, "label": "Medium" },
  "vo2max": { "value": 48.5, "trend": "stable" },
  "updated_at": "2026-06-26T21:00:00.000Z"
}
```

Each field is `null` if that metric is unavailable — the widget shows "No data" for that card.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Set URL + API key..." | Configure settings in Garmin Connect Mobile and sync |
| "Could not reach GarminBud" | Ensure `garmin-bud serve` and tunnel are running; URL must be HTTPS |
| -400 on device | Response must be JSON object with `Content-Type: application/json` (GarminBud handles this) |
| Stale data | Re-open the widget to fetch again |

## Connect IQ Store

This widget is for sideloading during development. Publishing to the Connect IQ Store requires a Garmin developer account and app review — a separate step from the npm/GitHub release.

See also: [docs/WEB-MCP.md](../docs/WEB-MCP.md), [README.md](../README.md).
