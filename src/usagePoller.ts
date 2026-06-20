import * as vscode from 'vscode';
import { readAccessToken } from './credentialsReader';
import { fetchUsage, UsageData } from './usageClient';

export class UsagePoller implements vscode.Disposable {
    private _timer: ReturnType<typeof setInterval> | undefined;
    private _currentIntervalMinutes: number = 0;

    constructor(
        private readonly _onData: (data: UsageData) => void,
        private readonly _onError: (err: Error) => void
    ) {}

    start(): void {
        void this.pollNow();
        this._scheduleInterval();
    }

    async pollNow(): Promise<void> {
        const token = await readAccessToken();
        if (!token) {
            this._onError(new Error('credentials not found'));
            return;
        }
        try {
            const data = await fetchUsage(token);
            this._onData(data);
        } catch (err) {
            this._onError(err instanceof Error ? err : new Error(String(err)));
        }
        // Restart interval if config changed while we were polling
        this._scheduleIntervalIfChanged();
    }

    private _getIntervalMinutes(): number {
        const raw = vscode.workspace.getConfiguration('claudePulse').get<number>('pollIntervalMinutes') ?? 5;
        return Math.max(5, raw);
    }

    private _scheduleInterval(): void {
        const minutes = this._getIntervalMinutes();
        this._currentIntervalMinutes = minutes;
        if (this._timer !== undefined) {
            clearInterval(this._timer);
        }
        this._timer = setInterval(() => { void this.pollNow(); }, minutes * 60 * 1000);
    }

    private _scheduleIntervalIfChanged(): void {
        const minutes = this._getIntervalMinutes();
        if (minutes !== this._currentIntervalMinutes) {
            this._scheduleInterval();
        }
    }

    dispose(): void {
        if (this._timer !== undefined) {
            clearInterval(this._timer);
            this._timer = undefined;
        }
    }
}
