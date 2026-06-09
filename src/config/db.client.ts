import { CloudflareClient } from './cloudflare.client';

const dbConfig = {
    workerUrl: process.env.CLOUDFLARE_WORKER_URL || '',
    clientSecret: process.env.SYNC_CLIENT_SECRET || '',
};

// Validate configuration
export const isDbConfigured = (): boolean =>
    Boolean(dbConfig.workerUrl && dbConfig.clientSecret);

let dbInstance: CloudflareClient | null = null;

export function getDbClient(): CloudflareClient {
    if (!isDbConfigured()) {
        throw new Error('Missing Database configuration, please check environment variables CLOUDFLARE_WORKER_URL and SYNC_CLIENT_SECRET');
    }
    if (!dbInstance) {
        dbInstance = new CloudflareClient(dbConfig.workerUrl, dbConfig.clientSecret);
    }
    return dbInstance;
}

export const db = getDbClient();
