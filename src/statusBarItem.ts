import * as vscode from 'vscode';
import { UsageData } from './usageClient';
import { formatDuration, formatPct } from './format';

export class ClaudePulseStatusBar implements vscode.Disposable {
    private readonly _item: vscode.StatusBarItem;
    private _lastData: UsageData | undefined;
    private _lastPinned: string = 'fiveHour';

    constructor() {
        this._item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this._item.command = 'claudePulse.showPicker';
        this._item.show();
    }

    showLoading(): void {
        this._item.text = '$(loading~spin) Claude: loading…';
        this._item.tooltip = undefined;
        this._item.backgroundColor = undefined;
    }

    showError(msg: string): void {
        this._item.text = `$(warning) Claude: ${msg}`;
        this._item.tooltip = undefined;
        this._item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    }

    update(data: UsageData, pinnedMetric: string): void {
        this._lastData = data;
        this._lastPinned = pinnedMetric;
        this._render(data, pinnedMetric);
    }

    getLastData(): UsageData | undefined { return this._lastData; }
    getLastPinned(): string { return this._lastPinned; }

    private _render(data: UsageData, pinned: string): void {
        let text = 'Claude: —';
        let utilization = 0;

        if (pinned === 'fiveHour' && data.fiveHour) {
            utilization = data.fiveHour.utilization;
            const reset = data.fiveHour.resetsAt ? ` · resets ${formatDuration(data.fiveHour.resetsAt)}` : '';
            text = `Claude: ${formatPct(utilization)}${reset}`;
        } else if (pinned === 'sevenDay' && data.sevenDay) {
            utilization = data.sevenDay.utilization;
            const reset = data.sevenDay.resetsAt ? ` · resets ${formatDuration(data.sevenDay.resetsAt)}` : '';
            text = `Claude: ${formatPct(utilization)}${reset}`;
        } else if (pinned === 'extraUsage' && data.extraUsage?.isEnabled) {
            const used = data.extraUsage.usedCredits ?? 0;
            const limit = data.extraUsage.monthlyLimit ?? 0;
            utilization = data.extraUsage.utilization ?? 0;
            text = `Claude: $${used.toFixed(2)} / $${limit.toFixed(2)}`;
        }

        this._item.text = text;
        this._item.backgroundColor =
            utilization >= 0.8 ? new vscode.ThemeColor('statusBarItem.errorBackground')
            : utilization >= 0.5 ? new vscode.ThemeColor('statusBarItem.warningBackground')
            : undefined;
        this._item.tooltip = this._buildTooltip(data);
    }

    private _buildTooltip(data: UsageData): vscode.MarkdownString {
        const lines: string[] = ['**ClaudePulse — Usage Overview**', ''];
        if (data.fiveHour) {
            const reset = data.fiveHour.resetsAt ? ` — resets in ${formatDuration(data.fiveHour.resetsAt)}` : '';
            lines.push(`**5h window:** ${formatPct(data.fiveHour.utilization)} used${reset}`);
        }
        if (data.sevenDay) {
            const reset = data.sevenDay.resetsAt ? ` — resets in ${formatDuration(data.sevenDay.resetsAt)}` : '';
            lines.push(`**7-day:** ${formatPct(data.sevenDay.utilization)} used${reset}`);
        }
        if (data.extraUsage?.isEnabled) {
            const used = (data.extraUsage.usedCredits ?? 0).toFixed(2);
            const limit = (data.extraUsage.monthlyLimit ?? 0).toFixed(2);
            lines.push(`**Extra usage:** $${used} / $${limit}`);
        }
        const md = new vscode.MarkdownString(lines.join('\n\n'));
        md.isTrusted = false;
        return md;
    }

    dispose(): void {
        this._item.dispose();
    }
}
