import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

interface CredentialsFile {
    claudeAiOauth?: {
        accessToken?: string;
    };
}

export async function readAccessToken(): Promise<string | null> {
    const credPath = path.join(os.homedir(), '.claude', '.credentials.json');
    try {
        const raw = await fs.readFile(credPath, 'utf-8');
        const creds = JSON.parse(raw) as CredentialsFile;
        return creds.claudeAiOauth?.accessToken ?? null;
    } catch {
        return null;
    }
}
