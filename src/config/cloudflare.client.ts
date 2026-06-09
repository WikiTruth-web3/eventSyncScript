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

  from<TTable extends keyof Database['public']['Tables']>(table: TTable) {
    return {
      select: (fields: string) => {
        return {
          eq: (col1: string, val1: any) => {
            return {
              eq: (col2: string, val2: any) => {
                // Return a native Promise to pass TypeScript thenable checks.
                // In eventSyncScript, the chain is: eq('network', scope.network).eq('layer', scope.layer)
                // where val1 is network, val2 is layer
                const executor = async (resolve: any) => {
                  if (table === 'sync_status') {
                    const layer = val2;
                    const network = val1;
                    const url = `${this.workerUrl}/api/${layer}-${network}/db/sync-status`;
                    try {
                      const res = await fetch(url, {
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${this.clientSecret}`
                        }
                      });
                      if (!res.ok) {
                        const errData = (await res.json()) as any;
                        return resolve({ data: null, error: { message: errData.message || 'HTTP Error' } });
                      }
                      const body = (await res.json()) as any;
                      return resolve({ data: body.data || [], error: null });
                    } catch (e: any) {
                      return resolve({ data: null, error: { message: e.message || 'Network error' } });
                    }
                  }
                  return resolve({ data: null, error: { message: 'Unsupported GET table' } });
                };

                const p = new Promise(executor) as any;

                // Attach eq method on the Promise for longer chains:
                // e.g. eq('network', key.network).eq('layer', key.layer).eq('contract_name', key.contract).single()
                p.eq = (col3: string, val3: any) => {
                  return {
                    single: async () => {
                      if (table === 'sync_status') {
                        const layer = val2;
                        const network = val1;
                        const contractName = val3;
                        const url = `${this.workerUrl}/api/${layer}-${network}/db/sync-status?contract=${contractName}`;
                        try {
                          const res = await fetch(url, {
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${this.clientSecret}`
                            }
                          });
                          if (!res.ok) {
                            const errData = (await res.json()) as any;
                            return { data: null, error: { message: errData.message || 'HTTP Error', code: res.status === 404 ? 'PGRST116' : String(res.status) } };
                          }
                          const body = (await res.json()) as any;
                          if (!body.data) {
                            return { data: null, error: { message: 'Not Found', code: 'PGRST116' } };
                          }
                          return { data: body.data, error: null };
                        } catch (e: any) {
                          return { data: null, error: { message: e.message || 'Network error', code: '500' } };
                        }
                      }
                      return { data: null, error: { message: 'Unsupported GET table', code: '500' } };
                    }
                  };
                };

                return p;
              }
            };
          }
        };
      },

      update: (updates: Database['public']['Tables'][TTable]['Update']) => {
        return {
          match: async (query: any) => {
            const layer = query.layer || 'sapphire';
            const network = query.network || 'testnet';
            const id = query.id;

            let operation = '';
            if (table === 'boxes') operation = 'update-box';
            else if (table === 'user_addresses') operation = 'update-user-address';
            else operation = `update-${table}`;

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
        };
      },

      upsert: async (
        recordInput: Database['public']['Tables'][TTable]['Insert'] | Database['public']['Tables'][TTable]['Insert'][],
        options?: any
      ): Promise<{ error: any }> => {
        if (Array.isArray(recordInput)) {
          if (recordInput.length === 0) return { error: null };
          try {
            const results = await Promise.all(
              recordInput.map(r => this.from(table).upsert(r, options))
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

        // Clean layer/network as they are injected via endpoint path params
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
            pay_type: 'OrderAmount',
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
            user_id: record.user_id,
            amount: record.amount,
            timestamp: record.timestamp,
            transaction_hash: hashToHexString(record.transaction_hash)
          };
        } else if (table === 'withdraws') {
          if (record.withdraw_type === 'Reward') {
            operation = 'rewards-withdraw';
            payload = {
              id: record.id,
              user_id: record.user_id,
              token: record.token,
              amount: record.amount
            };
          } else {
            operation = 'withdraw';
            payload = {
              id: record.id,
              token: record.token,
              box_id_list: record.box_list || [],
              user_id: record.user_id,
              withdraw_type: record.withdraw_type,
              amount: record.amount,
              timestamp: record.timestamp,
              transaction_hash: hashToHexString(record.transaction_hash)
            };
          }
        } else if (table === 'fund_manager_state') {
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
    };
  }
}

// Export the class CloudflareClient as the main export

