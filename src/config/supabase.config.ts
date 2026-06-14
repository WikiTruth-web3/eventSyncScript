import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as DBTypes from '../types/dataBase';

const supabaseConfig = {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
};

// console.log('--- supabaseConfig init ---');
// console.log('SUPABASE_URL:', supabaseConfig.url ? 'defined' : 'empty');
// console.log('SUPABASE_ANON_KEY:', supabaseConfig.anonKey ? 'defined' : 'empty');
// console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseConfig.serviceRoleKey ? 'defined' : 'empty');


if (!supabaseConfig.url || !supabaseConfig.anonKey) {
    throw new Error('Missing Supabase configuration, please check environment variables SUPABASE_URL and SUPABASE_ANON_KEY');
}

export function createSupabaseClient(): SupabaseClient<SupabaseDatabase> {
    return createClient<SupabaseDatabase>(supabaseConfig.url, supabaseConfig.anonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
        },
    });
}

export function createSupabaseServiceClient(): SupabaseClient<SupabaseDatabase> {
    if (!supabaseConfig.serviceRoleKey) {
        throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY, cannot create service client');
    }

    return createClient<SupabaseDatabase>(supabaseConfig.url, supabaseConfig.serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}

export const supabase: SupabaseClient<SupabaseDatabase> = supabaseConfig.serviceRoleKey
    ? createSupabaseServiceClient()
    : createSupabaseClient();


export interface SupabaseDatabase {
    public: {
        Tables: {
            boxes: {
                Row: DBTypes.Box;
                Insert: Partial<DBTypes.Box> & Pick<DBTypes.Box, 'id' | 'minter_id' | 'status' | 'create_timestamp' | 'token_id'>;
                Update: Partial<DBTypes.Box>;
            };
            metadata_boxes: {
                Row: DBTypes.MetadataBox;
                Insert: Partial<DBTypes.MetadataBox> & Pick<DBTypes.MetadataBox, 'id'>;
                Update: never; // Cannot update metadata once created
            };
            users: {
                Row: DBTypes.User;
                Insert: DBTypes.User;
                Update: never;
            };
            user_addresses: {
                Row: DBTypes.UserAddress;
                Insert: DBTypes.UserAddress;
                Update: Partial<DBTypes.UserAddress>;
            };
            box_bidders: {
                Row: DBTypes.BoxBidder;
                Insert: DBTypes.BoxBidder;
                Update: never;
            };
            payments: {
                Row: DBTypes.Payment;
                Insert: DBTypes.Payment;
                Update: never;
            };
            order_refund_withdraws: {
                Row: DBTypes.OrderRefundWithdraw;
                Insert: DBTypes.OrderRefundWithdraw;
                Update: never;
            };
            rewards_addeds: {
                Row: DBTypes.RewardsAdded;
                Insert: DBTypes.RewardsAdded;
                Update: never;
            };
            box_rewards: {
                Row: DBTypes.BoxReward;
                Insert: never; // Managed by database trigger
                Update: never;
            };
            user_rewards: {
                Row: DBTypes.UserReward;
                Insert: never; // Managed by database trigger
                Update: never;
            };
            rewards_withdraws: {
                Row: DBTypes.RewardsWithdraw;
                Insert: never; // Managed by database trigger
                Update: never;
            };
            box_user_order_amounts: {
                Row: DBTypes.BoxUserOrderAmount;
                Insert: never; // Managed by database trigger
                Update: never;
            };
            box_status_statistical: {
                Row: DBTypes.BoxStatusStatistical;
                Insert: never; // Managed by database trigger
                Update: never;
            };
            fund_manager_state: {
                Row: DBTypes.FundManagerState;
                Insert: Partial<DBTypes.FundManagerState>;
                Update: Partial<DBTypes.FundManagerState>;
            };
            forwarder_state: {
                Row: DBTypes.ForwarderState;
                Insert: Partial<DBTypes.ForwarderState>;
                Update: Partial<DBTypes.ForwarderState>;
            };
            token_total_amounts: {
                Row: DBTypes.TokenTotalAmount;
                Insert: never; // Managed by database trigger
                Update: never;
            };
            sync_status: {
                Row: DBTypes.SyncStatus;
                Insert: DBTypes.SyncStatus;
                Update: DBTypes.SyncStatus;
            };
        };
        Functions: {
            search_boxes: {
                Args: {
                    search_query?: string | null;
                    status_filter?: number[] | null;
                    type_of_crime_filter?: string[] | null;
                    country_filter?: string[] | null;
                    accepted_token_filter?: string[] | null;
                    listed_mode_filter?: number[] | null;
                    label_filter?: string[] | null;
                    min_price?: number | null;
                    max_price?: number | null;
                    min_timestamp?: number | null;
                    max_timestamp?: number | null;
                    sort_by?: 'relevance' | 'price' | 'event_date' | 'box_id';
                    sort_direction?: 'asc' | 'desc';
                    limit_count?: number;
                    offset_count?: number;
                };
                Returns: {
                    id: string;
                    title: string | null;
                    description: string | null;
                    type_of_crime: string | null;
                    country: string | null;
                    state: string | null;
                    label: string[] | null;
                    status: number;
                    listed_mode: number | null;
                    price: string;
                    deadline: string;
                    buyer_id: string | null;
                    nft_image: string | null;
                    box_image: string | null;
                    nft_image_r2: string | null;
                    box_image_r2: string | null;
                    event_date: string | null;
                    create_timestamp: string;
                    accepted_token: string | null;
                    relevance: number;
                }[];
            };
        };
    };
}
