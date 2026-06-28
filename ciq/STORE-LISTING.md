# GarminBud — Connect IQ Store Listing

Use this document when submitting the widget to the [Garmin Developer Portal](https://developer.garmin.com/connect-iq/submit-an-app/).

## App name

GarminBud

## Category

Health & Fitness → Widget

## Version

1.1.0

## Short description

Your Garmin Connect data and Claude AI on your wrist — recovery, sleep, activity, stress, VO2 max, and more.

## Full description

GarminBud shows your Garmin Connect data directly on your watch — and lets you ask Claude AI questions about your health, right from your wrist.

Open the widget for a compact daily overview, then swipe or tap through 9 cards:
• Daily overview — recovery, sleep, stress, VO2 max at a glance
• Recovery — score with color-coded progress ring
• Sleep — hours and quality score
• Activity — latest workout with duration, distance, and avg heart rate
• Stress — daily average
• VO2 max — value and trend
• Heart rate — resting HR and max
• AI Insight — a daily one-line tip from Claude based on your health data
• Ask AI — pick from preset questions and get a response from Claude on your watch

Color-coded values make your status easy to scan. If your server is temporarily unreachable, the widget shows your last cached summary.

SETUP REQUIRED
GarminBud connects to your own self-hosted server (free, open source):
1. Install garmin-bud on your PC or Mac
2. Run: garmin-bud serve
3. Expose it over HTTPS (e.g. Cloudflare Tunnel)
4. In Garmin Connect → Connect IQ → GarminBud settings, enter your HTTPS tunnel URL
5. Open the dashboard link printed by the server — pair your watch with one tap and optionally add your Anthropic API key to unlock AI features

No API key required for health data. Claude AI features require a free Anthropic account (bring your own key).

GarminBud does not run AI on your watch. It sends your prompt to your local server, which calls Claude on your behalf and returns the response.

Unofficial community project — not affiliated with Garmin Ltd.

Setup guide: https://github.com/Zsadigzade/garmin-bud

## Privacy policy URL

`https://github.com/Zsadigzade/Garmin-Bud/blob/main/docs/PRIVACY-POLICY.md`

## Required assets

| Asset | Path | Size |
|-------|------|------|
| Launcher icon | `ciq/resources/drawables/launcher_icon.png` | 40×40 |
| Store icon | `ciq/store/store_icon.png` | 130×130 |
| Screenshots | Capture from Connect IQ simulator | 1–3 per supported device family |

## Developer account checklist

1. Create a Garmin developer account at https://developer.garmin.com
2. Sign the Connect IQ developer agreement
3. App registered at https://apps.garmin.com/apps/e9204b53-2eea-4851-9071-8ce7e6839589
4. Build a release binary:

```powershell
cd ciq
.\build.ps1 -Device fr70
# After testing individual devices:
monkeyc -f monkey.jungle -o bin/GarminBud.prg -y developer_key.der -d all -w
```

6. Upload the `.prg`, icons, screenshots, and listing copy
7. Include setup instructions in review notes

## Review notes for Garmin

- The app requires a user-provided Server URL in Connect IQ settings; the API key is obtained automatically via an on-watch pairing flow (no manual entry)
- The widget only calls the user-configured HTTPS endpoint
- No Garmin Connect credentials are stored on the watch
- Claude AI features require the user to supply their own Anthropic API key via the companion web dashboard; AI is optional
- Only the Communications permission is used
- The companion server is open source and user-hosted

## Supported devices

See `ciq/manifest.xml` for the current product list, including Forerunner 70 (`fr70`), Forerunner 570 (`fr57042mm`, `fr57047mm`), Fenix, Epix, Venu, vivoactive, MARQ, and Instinct 3 families.

## Setup summary for users

1. Install and configure `garmin-bud` on a computer
2. Run `garmin-bud serve` (or `.\scripts\start-watch-stack.ps1` to also start the tunnel)
3. Start an HTTPS tunnel to port 3847 (Cloudflare Tunnel recommended)
4. In Garmin Connect Mobile → Connect IQ → GarminBud settings:
   - **Server URL:** your HTTPS tunnel URL (only field required)
5. Open the dashboard URL printed by the server — approve the pairing code shown on the watch
6. Optionally add an Anthropic API key in the dashboard to enable AI features
7. Sync the watch and add the widget to your widget loop

See also: [ciq/README.md](README.md), [docs/WEB-MCP.md](../docs/WEB-MCP.md)
