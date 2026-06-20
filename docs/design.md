# Claude Code Stats — VS Code Extension

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

**Response shape:**
```json
{
  "five_hour":        { "utilization": 0.73, "resets_at": "2026-06-20T18:00:00Z" },
  "seven_day":        { "utilization": 0.41, "resets_at": "2026-06-27T00:00:00Z" },
  "seven_day_sonnet": { "utilization": 0.12, "resets_at": "2026-06-27T00:00:00Z" },
  "extra_usage": {
    "is_enabled": true,
    "monthly_limit": 100,
    "used_credits": 7.42,
    "utilization": 0.074
  }
}
```

**Auth token source:** `~/.claude/.credentials.json` — a plain JSON file on disk, not stored in VS Code SecretStorage. Readable by any extension.

The token is an OAuth Bearer token. On a 401, re-read the credentials file and retry once — Claude Code will have refreshed the token by the time the user is active. Only implement the refresh call (`POST /v1/oauth/token`) if this passive approach proves flaky in practice.

## Architecture

```
Extension
├── credentialsReader.ts   — reads ~/.claude/.credentials.json, extracts accessToken
├── usageClient.ts         — GET /api/oauth/usage, returns typed UsageData
├── statusBarItem.ts       — vscode.StatusBarItem, formats the pinned metric
├── usagePoller.ts         — configurable interval, wires the above together
└── extension.ts           — activate/deactivate, registers commands
```

**On 401:** Re-read credentials file and retry once. If still 401, show degraded state (e.g. `Claude: auth error`).

## Configuration

VS Code settings (`claudeCodeStats.*`):

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `pollIntervalMinutes` | number | 5 | How often to poll. Minimum enforced at 5. |
| `pinnedMetric` | enum | `fiveHour` | Which metric shows in the status bar. Values: `fiveHour`, `sevenDay`, `extraUsage`. |

`pinnedMetric` is also writable from the click popup so it never requires opening settings manually.

## Status Bar Display

Primary (always visible) — shows the pinned metric:
```
Claude: 73% · resets 1h 22m      ← fiveHour or sevenDay
Claude: $7.42 / $100.00           ← extraUsage
```

On hover tooltip — always shows the full breakdown regardless of pinned metric:
```
5h window:   73% used — resets in 1h 22m
7-day:       41% used — resets in 6d 14h
Extra usage: $7.42 / $100.00
```

Click — opens a quick-pick:
```
$(pulse)       5h window    73% · resets 1h 22m      [pin]
$(calendar)    7-day        41% · resets 6d 14h       [pin]
$(credit-card) Extra usage  $7.42 / $100.00           [pin]
──────────────────────────────────────────
$(refresh)     Refresh now
```

Selecting a `[pin]` item updates `pinnedMetric` and closes the picker. Selecting "Refresh now" triggers an immediate poll.

## Key Data Types

```typescript
interface TimeWindow {
  utilization: number;   // 0–1
  resetsAt?: string;     // ISO 8601
}

interface UsageData {
  fiveHour?: TimeWindow;
  sevenDay?: TimeWindow;
  sevenDaySonnet?: TimeWindow;
  extraUsage?: {
    isEnabled: boolean;
    monthlyLimit?: number;
    usedCredits?: number;
    utilization?: number;
  };
}
```

## Distribution

Publish to the VS Code Marketplace. Setup is one-time:

1. Microsoft account (existing Outlook/GitHub-via-Microsoft account works)
2. Azure DevOps organization — free tier at `dev.azure.com`
3. Publisher profile at `marketplace.visualstudio.com/manage`
4. PAT scoped to `Marketplace (Publish)` from Azure DevOps
5. `npm install -g @vscode/vsce` → `vsce publish`

Extensions go live within minutes. No review queue, no fee. Verified publisher badge (checkmark) requires a registered domain for DNS verification — skip it, it's cosmetic only.

## Development Notes

- **anthropic-beta header:** The existing extension sends an internal beta header (`yw` constant in the bundle). Test the endpoint without it first; grab the value from the bundle if a 4xx comes back.
