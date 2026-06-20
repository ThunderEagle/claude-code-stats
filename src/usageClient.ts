import * as https from 'https';

export interface TimeWindow {
    utilization: number;
    resetsAt?: string;
}

export interface UsageData {
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

export class AuthError extends Error {
    constructor() { super('auth error'); }
}

export class NetworkError extends Error {
    constructor(statusCode: number) { super(`HTTP ${statusCode}`); }
}

interface RawResponse {
    five_hour?: { utilization: number; resets_at?: string };
    seven_day?: { utilization: number; resets_at?: string };
    seven_day_sonnet?: { utilization: number; resets_at?: string };
    extra_usage?: {
        is_enabled: boolean;
        monthly_limit?: number;
        used_credits?: number;
        utilization?: number;
    };
}

export function fetchUsage(token: string): Promise<UsageData> {
    return new Promise((resolve, reject) => {
        const req = https.get(
            'https://api.anthropic.com/api/oauth/usage',
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'User-Agent': 'ClaudePulse-VSCode/0.1.0',
                },
            },
            (res) => {
                if (res.statusCode === 401) {
                    res.resume();
                    return reject(new AuthError());
                }
                if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                    res.resume();
                    return reject(new NetworkError(res.statusCode ?? 0));
                }

                const chunks: Buffer[] = [];
                res.on('data', (chunk: Buffer) => chunks.push(chunk));
                res.on('end', () => {
                    try {
                        const raw = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as RawResponse;
                        resolve({
                            fiveHour: raw.five_hour
                                ? { utilization: raw.five_hour.utilization, resetsAt: raw.five_hour.resets_at }
                                : undefined,
                            sevenDay: raw.seven_day
                                ? { utilization: raw.seven_day.utilization, resetsAt: raw.seven_day.resets_at }
                                : undefined,
                            sevenDaySonnet: raw.seven_day_sonnet
                                ? { utilization: raw.seven_day_sonnet.utilization, resetsAt: raw.seven_day_sonnet.resets_at }
                                : undefined,
                            extraUsage: raw.extra_usage
                                ? {
                                    isEnabled: raw.extra_usage.is_enabled,
                                    monthlyLimit: raw.extra_usage.monthly_limit !== undefined ? raw.extra_usage.monthly_limit / 100 : undefined,
                                    usedCredits: raw.extra_usage.used_credits !== undefined ? raw.extra_usage.used_credits / 100 : undefined,
                                    utilization: raw.extra_usage.utilization,
                                }
                                : undefined,
                        });
                    } catch {
                        reject(new NetworkError(0));
                    }
                });
                res.on('error', reject);
            }
        );
        req.on('error', reject);
        req.end();
    });
}
