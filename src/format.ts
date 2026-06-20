export function formatDuration(isoDate: string): string {
    const ms = new Date(isoDate).getTime() - Date.now();
    if (ms <= 0) { return 'now'; }
    const totalMinutes = Math.floor(ms / 60_000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const mins = totalMinutes % 60;
    if (days > 0) { return `${days}d ${hours}h`; }
    if (hours > 0) { return `${hours}h ${mins}m`; }
    return `${mins}m`;
}

export function formatPct(utilization: number): string {
    return `${Math.round(utilization * 100)}%`;
}
