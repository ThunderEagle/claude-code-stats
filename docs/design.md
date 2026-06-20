# ClaudePulse — VS Code Extension

## Problem Statement

Claude Code surfaces usage limits (5h window, 7-day window) only through a modal dialog that requires active navigation. There's no ambient visibility into how much of your budget remains while you're working. The goal is a status bar item that shows this at a glance, always visible, zero friction.

## Proposed Solution

A VS Code extension that polls the Anthropic usage API and renders a user-selected metric directly in the status bar. Clicking the item opens a quick-pick with the full breakdown and lets the user switch which line is pinned to the bar.

## How the Data Works

Reverse-engineered from the Claude Code VS Code extension (`anthropic.claude-code`):

**Endpoint:**
```
GET https://api.anthropic.com/api/oauth/usage
Authorization: Bearer <access_token>
```

**Response shape (observed):**
```json
{
  "five_hour":        { "utilization": 73, "resets_at": "2026-06-20T18:00:00Z" },
  "seven_day":        { "utilization": 41, "resets_at": "2026-06-27T00:00:00Z" },
  "seven_day_sonnet": { "utilization": 12, "resets_at": "2026-06-27T00:00:00Z" },
  "extra_usage": {
    "is_enabled": true,
    "monthly_limit": 5000,
    "used_credits": 742,
    "utilization": 7.4
  }
}
```

**Field units (confirmed via live testing):**
- `five_hour.utilization`, `seven_day.utilization`: integer percentage, `0–100`
- `extra_usage.monthly_limit`, `extra_usage.used_credits`: integer cents — divide by 100 for display
- `extra_usage.utilization`: percentage, `0–100`
- `resets_at`: ISO 8601 UTC

**Auth token source:** `~/.claude/.credentials.json` — a plain JSON file on disk, not stored in VS Code SecretStorage. Field path: `claudeAiOauth.accessToken`.

The credentials file is re-read fresh on every poll so the token stays current without any explicit refresh logic. Claude Code handles token renewal; we just read whatever is on disk. On a missing file or 401, show degraded state and recover on the next poll.

## Architecture

```
Extension
├── credentialsReader.ts   — reads ~/.claude/.credentials.json, extracts accessToken
├── usageClient.ts         — GET /api/oauth/usage, maps snake_case→camelCase, converts units
├── statusBarItem.ts       — vscode.StatusBarItem (right-aligned), formats the pinned metric
├── usagePoller.ts         — configurable interval, reads credentials fresh each poll
├── format.ts              — formatDuration, formatPct helpers
└── extension.ts           — activate/deactivate, registers commands
```

## Configuration

VS Code settings (`claudePulse.*`):

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `claudePulse.pollIntervalMinutes` | number | 5 | How often to poll. Minimum enforced at 5. |
| `claudePulse.pinnedMetric` | enum | `fiveHour` | Which metric shows in the status bar. Values: `fiveHour`, `sevenDay`, `extraUsage`. |

`pinnedMetric` is also writable from the click popup so it never requires opening settings manually.

## Status Bar Display

Right-aligned. Primary (always visible) — shows the pinned metric:
```
Claude: 73% · resets 1h 22m      ← fiveHour or sevenDay
Claude: $7.42 / $50.00            ← extraUsage (cents converted to dollars)
```

Color coding by utilization: yellow ≥ 50%, red ≥ 80%.

On hover tooltip — always shows the full breakdown regardless of pinned metric:
```
5h window:   73% used — resets in 1h 22m
7-day:       41% used — resets in 6d 14h
Extra usage: $7.42 / $50.00
```

Click — opens a quick-pick:
```
$(pulse)       5h window    73% · resets 1h 22m
$(calendar)    7-day        41% · resets 6d 14h
$(credit-card) Extra usage  $7.42 / $50.00
──────────────────────────────────────────
$(refresh)     Refresh now
```

Selecting a metric row pins it and closes the picker. Selecting "Refresh now" triggers an immediate poll.

## Key Data Types

```typescript
interface TimeWindow {
  utilization: number;   // 0–100 (percentage)
  resetsAt?: string;     // ISO 8601
}

interface UsageData {
  fiveHour?: TimeWindow;
  sevenDay?: TimeWindow;
  sevenDaySonnet?: TimeWindow;
  extraUsage?: {
    isEnabled: boolean;
    monthlyLimit?: number;  // dollars (converted from API cents)
    usedCredits?: number;   // dollars (converted from API cents)
    utilization?: number;   // 0–100 (percentage)
  };
}
```

## Distribution

Publish via GitHub Actions on version tag push (`v*`). The workflow runs `tsc --noEmit` then `vsce publish`. PAT stored in GitHub Secrets as `VSCE_PAT`.

Extensions go live within minutes. No review queue, no fee. Verified publisher badge requires domain DNS verification — skip it, cosmetic only.

## Development Notes

- **anthropic-beta header:** The existing extension sends an internal beta header. Not required — endpoint responds correctly without it.
- **`seven_day_sonnet`:** Included in `UsageData` but not offered as a pinnable option; visible in tooltip if present.
