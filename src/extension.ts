import * as vscode from 'vscode';
import { ClaudePulseStatusBar } from './statusBarItem';
import { UsagePoller } from './usagePoller';
import { UsageData } from './usageClient';
import { formatDuration, formatPct } from './format';

type PulseItem = vscode.QuickPickItem & { metric?: string; action?: 'refresh' };

export function activate(context: vscode.ExtensionContext): void {
    const statusBar = new ClaudePulseStatusBar();
    statusBar.showLoading();

    const pinnedMetric = (): string =>
        vscode.workspace.getConfiguration('claudePulse').get<string>('pinnedMetric') ?? 'fiveHour';

    const poller = new UsagePoller(
        (data: UsageData) => statusBar.update(data, pinnedMetric()),
        (err: Error) => statusBar.showError(err.message)
    );

    const showPicker = vscode.commands.registerCommand('claudePulse.showPicker', async () => {
        const data = statusBar.getLastData();
        if (!data) { return; }

        const items: PulseItem[] = [];

        if (data.fiveHour) {
            const reset = data.fiveHour.resetsAt ? ` · resets ${formatDuration(data.fiveHour.resetsAt)}` : '';
            items.push({
                label: '$(pulse)  5h window',
                description: `${formatPct(data.fiveHour.utilization)}${reset}`,
                metric: 'fiveHour',
            });
        }
        if (data.sevenDay) {
            const reset = data.sevenDay.resetsAt ? ` · resets ${formatDuration(data.sevenDay.resetsAt)}` : '';
            items.push({
                label: '$(calendar)  7-day',
                description: `${formatPct(data.sevenDay.utilization)}${reset}`,
                metric: 'sevenDay',
            });
        }
        if (data.extraUsage?.isEnabled) {
            const used = data.extraUsage.usedCredits ?? 0;
            const limit = data.extraUsage.monthlyLimit ?? 0;
            const remaining = Math.max(0, limit - used);
            items.push({
                label: '$(credit-card)  Extra usage',
                description: `$${used.toFixed(2)} / $${limit.toFixed(2)} ($${remaining.toFixed(2)} left)`,
                metric: 'extraUsage',
            });
        }

        items.push({ label: '', kind: vscode.QuickPickItemKind.Separator });
        items.push({ label: '$(refresh)  Refresh now', action: 'refresh' });

        const pick = await vscode.window.showQuickPick(items, {
            placeHolder: 'Pin a metric or refresh',
        });
        if (!pick) { return; }

        if (pick.action === 'refresh') {
            await poller.pollNow();
        } else if (pick.metric) {
            await vscode.workspace.getConfiguration('claudePulse').update(
                'pinnedMetric',
                pick.metric,
                vscode.ConfigurationTarget.Global
            );
            statusBar.update(data, pick.metric);
        }
    });

    const refresh = vscode.commands.registerCommand('claudePulse.refresh', () => {
        void poller.pollNow();
    });

    context.subscriptions.push(statusBar, poller, showPicker, refresh);
    poller.start();
}

export function deactivate(): void { /* subscriptions handle cleanup */ }
