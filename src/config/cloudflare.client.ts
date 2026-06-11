import { Database } from '../types/dataBase';

// Helper to convert transaction hash byte array to hex string
const hashToHexString = (hash: any): string => {
  if (hash instanceof Uint8Array || Array.isArray(hash)) {
    return '0x' + Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return String(hash);
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
  async update<TTable extends keyof Database['public']['Tables']>(
    table: TTable,
    updates: Database['public']['Tables'][TTable]['Update'],
    match: { network: string; layer: string; id: string }
  ): Promise<{ error: any }> {
    const layer = match.layer || 'sapphire';
    const network = match.network || 'testnet';
    const id = match.id;

    let operation = '';
    if (table === 'boxes') {
      operation = 'update-box';
    } else if (table === 'user_addresses') {
      operation = 'update-user-address';
    } else {
      operation = `update-${table}`;
    }

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
  async upsert<TTable extends keyof Database['public']['Tables']>(
    table: TTable,
    recordInput: Database['public']['Tables'][TTable]['Insert'] | Database['public']['Tables'][TTable]['Insert'][],
    options?: any // Keeping parameters compatible for easy replacement
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

    let operation = '';
    let payload = { ...record };

    // Clean layer and network as they are passed via URL path
    delete payload.layer;
    delete payload.network;

    if (table === 'users') {
      operation = 'user';
      payload = { userId: record.id };
    } else if (table === 'user_addresses') {
      operation = 'user-address';
      payload = { id: record.id, is_blacklisted: record.is_blacklisted ? 1 : 0 };
    } else if (table === 'boxes') {
      operation = 'box';
      payload = {
        ...payload,
        refund_permit: record.refund_permit ? 1 : 0,
        price: record.price ? String(record.price) : '0'
      };
    } else if (table === 'box_bidders') {
      operation = 'box-bidder';
      payload = { id: record.id, box_id: record.box_id, bidder_id: record.bidder_id };
    } else if (table === 'metadata_boxes') {
      operation = 'metadata';
      payload = { ...payload };
    } else if (table === 'sync_status') {
      operation = 'sync-status';
      payload = { contract_name: record.contract_name, last_synced_block: String(record.last_synced_block) };
    } else if (table === 'payments') {
      operation = 'payment';
      payload = {
        id: record.id,
        box_id: record.box_id,
        user_id: record.user_id,
        pay_type: record.pay_type || 'OrderAmount',
        token: record.token,
        amount: record.amount,
        timestamp: record.timestamp,
        transaction_hash: hashToHexString(record.transaction_hash)
      };
    } else if (table === 'rewards_addeds') {
      operation = 'reward-added';
      payload = {
        id: record.id,
        box_id: record.box_id,
        token: record.token,
        amount: record.amount,
        timestamp: record.timestamp,
        transaction_hash: hashToHexString(record.transaction_hash)
      };
    } else if (table === 'order_refund_withdraws') {
      operation = 'withdraw';
      payload = {
        id: record.id,
        token: record.token,
        box_id_list: record.box_id_list || [],
        user_id: record.user_id,
        amount: record.amount,
        timestamp: record.timestamp,
        transaction_hash: hashToHexString(record.transaction_hash)
      };
    } else if (table === 'rewards_withdraws') {
      operation = 'rewards-withdraw';
      payload = {
        id: record.id,
        user_id: record.user_id,
        token: record.token,
        amount: record.amount,
        timestamp: record.timestamp,
        transaction_hash: hashToHexString(record.transaction_hash)
      };
    } else if (table === 'fund_manager_state') {
      // Stub endpoint logic or ignored endpoints
      return { error: null };
    } else {
      return { error: { message: `Unsupported table upsert: ${table}` } };
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
