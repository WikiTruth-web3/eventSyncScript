import { Database } from '../types/dataBase';

// Map database table names to Cloudflare Worker API operation endpoints
const tableToOperationMap: Record<keyof Database, string> = {
  users: 'user',
  user_addresses: 'user-address',
  boxes: 'box',
  box_bidders: 'box-bidder',
  metadata_boxes: 'metadata',
  sync_status: 'sync-status',
  payments: 'payment',
  rewards_addeds: 'reward-added',
  order_refund_withdraws: 'order-refund-withdraw',
  rewards_withdraws: 'rewards-withdraw',
  box_status_statistical: 'query-stats', // Managed by D1 triggers, no direct upserts
  fund_manager_state: 'fund-manager-state',
  forwarder_state: 'forwarder-state',
  box_user_order_amounts: '', // Managed by D1 triggers
  box_rewards: '', // Managed by D1 triggers
  user_rewards: '', // Managed by D1 triggers
  token_total_amounts: '' // Managed by D1 triggers
}; 

export class CloudflareClient {
  private workerUrl: string;
  private clientSecret: string;

  constructor(workerUrl: string, clientSecret: string) {
    this.workerUrl = workerUrl.endsWith('/') ? workerUrl.slice(0, -1) : workerUrl;
    this.clientSecret = clientSecret;
  }

  /**
   * Get sync status of contract(s) from D1 database
   * @param network - 'testnet' | 'mainnet'
   * @param layer - 'sapphire'
   * @param contractName - Optional contract name to fetch single status, otherwise fetches all
   */
  async getSyncStatus(
    network: string,
    layer: string,
    contractName?: string
  ): Promise<{ data: any; error: any }> {
    const url = contractName
      ? `${this.workerUrl}/api/${layer}-${network}/db/sync-status?contract=${contractName}`
      : `${this.workerUrl}/api/${layer}-${network}/db/sync-status`;

    try {
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.clientSecret}`
        }
      });
      if (!res.ok) {
        const errData = (await res.json()) as any;
        return {
          data: null,
          error: {
            message: errData.message || 'HTTP Error',
            code: res.status === 404 ? 'PGRST116' : String(res.status)
          }
        };
      }
      const body = (await res.json()) as any;
      return { data: body.data || (contractName ? null : []), error: null };
    } catch (e: any) {
      return {
        data: null,
        error: {
          message: e.message || 'Network error',
          code: '500'
        }
      };
    }
  }

  /**
   * Update record in D1 database
   * @param table - Database table name
   * @param updates - Object containing fields to update
   * @param match - Filter criteria containing network, layer, and id
   */
  async update<TTable extends keyof Database>(
    table: TTable,
    updates: Partial<Database[TTable]>,
    match: { network: string; layer: string; id: string }
  ): Promise<{ error: any }> {
    const layer = match.layer || 'sapphire';
    const network = match.network || 'testnet';
    const id = match.id;

    const operation = table === 'boxes'
      ? 'update-box'
      : table === 'user_addresses'
      ? 'update-user-address'
      : `update-${table}`;

    const url = `${this.workerUrl}/api/${layer}-${network}/db/${operation}`;
    const payload = { id, updates };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.clientSecret}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = (await res.json()) as any;
        return { error: { message: errData.message || `HTTP error ${res.status}` } };
      }
      return { error: null };
    } catch (e: any) {
      return { error: { message: e.message || 'Network error during update' } };
    }
  }

  /**
   * Upsert record(s) into D1 database
   * @param table - Database table name
   * @param recordInput - Single record or array of records to insert
   */
  async upsert<TTable extends keyof Database>(
    table: TTable,
    recordInput: Partial<Database[TTable]> | Partial<Database[TTable]>[],
    options?: any
  ): Promise<{ error: any }> {
    if (Array.isArray(recordInput)) {
      if (recordInput.length === 0) return { error: null };
      try {
        const results = await Promise.all(
          recordInput.map(r => this.upsert(table, r, options))
        );
        const firstError = results.find((res: any) => res.error !== null);
        return firstError ? { error: firstError.error } : { error: null };
      } catch (e: any) {
        return { error: { message: e.message || 'Error during batch upsert' } };
      }
    }

    const record = recordInput as any;
    const layer = record.layer || 'sapphire';
    const network = record.network || 'testnet';

    const operation = tableToOperationMap[table];
    if (!operation) {
      return { error: { message: `Unsupported table upsert: ${table}` } };
    }

    // Prepare payload by removing path variables layer and network
    const payload = { ...record };
    delete payload.layer;
    delete payload.network;

    // Handle special case where Worker API expects userId instead of id for users
    if (table === 'users') {
      payload.userId = record.id;
      delete payload.id;
    }

    const url = `${this.workerUrl}/api/${layer}-${network}/db/${operation}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.clientSecret}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = (await res.json()) as any;
        return { error: { message: errData.message || `HTTP error ${res.status}` } };
      }
      return { error: null };
    } catch (e: any) {
      return { error: { message: e.message || 'Network error during upsert' } };
    }
  }
}
