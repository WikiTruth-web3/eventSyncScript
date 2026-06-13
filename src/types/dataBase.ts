/**
 * Database type definitions for Supabase PostgreSQL.
 * 
 * Defines a single, unified TypeScript interface for each table schema.
 * Matches the Postgres migrations and types.
 */

// ============================================
// 1. users table
// ============================================
export interface User {
  id: string; // UserId (bytes32 hex)
}

// ============================================
// 2. user_addresses table
// ============================================
export interface UserAddress {
  id: string; // userAddress (address)
  is_blacklisted: boolean;
}

// ============================================
// 3. boxes table
// ============================================
export interface Box {
  id: string; // boxId (uint256 stored as TEXT in PG/JS)
  token_id: string; // NFT tokenId (same as boxId, TEXT)
  box_info_cid: string | null;
  private_key: string | null;
  price: string; 
  deadline: string; 
  minter_id: string;
  publisher_id: string | null;
  seller_id: string | null;
  buyer_id: string | null;
  completer_id: string | null;
  status: number; // status BETWEEN 0 AND 7
  listed_mode: number | null; // listed_mode BETWEEN 1 AND 2
  accepted_token: string | null;
  refund_permit: boolean | null; 
  create_timestamp: string;
  publish_timestamp: string | null;
  listed_timestamp: string | null;
  purchase_timestamp: string | null;
  complete_timestamp: string | null;
  request_refund_deadline: string | null;
  arbitration_deadline: string | null; 
}

// ============================================
// 4. box_bidders table
// ============================================
export interface BoxBidder {
  id: string; // boxId-UserId
  box_id: string;
  bidder_id: string;
}

// ============================================
// 5. metadata_boxes table
// ============================================
export interface MetadataBox {
  id: string; // boxId
  type_of_crime: string | null;
  label: string[] | null; // Native text array in PG
  title: string | null;
  nft_image: string | null;
  box_image: string | null;
  box_image_r2: string | null;
  nft_image_r2: string | null;
  country: string | null;
  state: string | null;
  description: string | null;
  event_date: string | null;
  create_date: string | null;
  timestamp: number | null;
  mint_method: 'create' | 'createAndPublish' | null;
  file_list: string[] | null; // Native text array in PG
  password: string | null;
  encryption_slices_metadata_cid: any | null; // JSONB in PG
  encryption_file_cid: any[] | null; // JSONB[] array in PG
  encryption_passwords: any | null; // JSONB in PG
  public_key: string | null;
}

// ============================================
// 6. box_status_statistical table
// ============================================
export interface BoxStatusStatistical {
  id: string; // Singleton ID
  total_supply: number;
  status_0_supply: number;
  status_1_supply: number;
  status_2_supply: number;
  status_3_supply: number;
  status_4_supply: number;
  status_5_supply: number;
  status_6_supply: number;
  status_7_supply: number;
}

// ============================================
// 7. fund_manager_state table
// ============================================
export interface FundManagerState {
  id: string; // Singleton ID
  paused: boolean;
}

// ============================================
// 8. forwarder_state table
// ============================================
export interface ForwarderState {
  id: string; // Singleton ID
  paused: boolean;
}

// ============================================
// 9. sync_status table
// ============================================
export interface SyncStatus {
  contract_name: 'BLIND_BOX' | 'EXCHANGE' | 'FUND_MANAGER' | 'BOX_NFT' | 'USER_MANAGER' | 'FORWARDER';
  last_synced_block: string;
  last_synced_at: string;
}

// ============================================
// 10. payments table
// ============================================
export interface Payment {
  id: string; // Transaction hash - log index
  box_id: string;
  user_id: string;
  pay_type: 'OrderAmount' | 'DelayFee';
  token: string;
  amount: string;
  timestamp: string;
  transaction_hash: string;
}

// ============================================
// 11. order_refund_withdraws table
// ============================================
export interface OrderRefundWithdraw {
  id: string; // eventName-withdrawType-Transaction hash
  token: string;
  box_id_list: string[]; // Native array in PG
  user_id: string;
  withdraw_type: 'Order' | 'Refund';
  amount: string;
  timestamp: string;
  transaction_hash: string;
}

// ============================================
// 12. box_user_order_amounts table
// ============================================
export interface BoxUserOrderAmount {
  id: string; // user_id-box_id-token
  box_id: string;
  user_id: string;
  token: string;
  currentAmount: string;
}

// ============================================
// 13. rewards_addeds table
// ============================================
export interface RewardsAdded {
  id: string; // eventName-reward_added-Transaction hash
  box_id: string;
  user_id: string;
  token: string;
  amount: string;
  timestamp: string;
  transaction_hash: string;
}

// ============================================
// 14. box_rewards table
// ============================================
export interface BoxReward {
  id: string; // box_id-user_id-token
  box_id: string;
  user_id: string;
  token: string;
  totalAmount: string;
}

// ============================================
// 15. rewards_withdraws table
// ============================================
export interface RewardsWithdraw {
  id: string; // user_id-rewards-token
  user_id: string;
  token: string;
  amount: string;
}

// ============================================
// 16. user_rewards table
// ============================================
export interface UserReward {
  id: string; // user_id-user_rewards-token
  user_id: string;
  token: string;
  currentAmount: string;
  totalAmount: string;
}

// ============================================
// 17. token_total_amounts table
// ============================================
export interface TokenTotalAmount {
  id: string; // fundType-tokenAddress
  fund_type: 'PaymentOrder' | 'PaymentDelayFee' | 'OrderWithdraw' | 'RefundWithdraw' | 'RewardAdded' | 'RewardWithdraw';
  token: string;
  fund_manager_id: string;
  amount: string;
}

/**
 * Main Database mapping for general lookup.
 */
export interface Database {
  users: User;
  user_addresses: UserAddress;
  boxes: Box;
  box_bidders: BoxBidder;
  metadata_boxes: MetadataBox;
  box_status_statistical: BoxStatusStatistical;
  fund_manager_state: FundManagerState;
  forwarder_state: ForwarderState;
  sync_status: SyncStatus;
  payments: Payment;
  order_refund_withdraws: OrderRefundWithdraw;
  box_user_order_amounts: BoxUserOrderAmount;
  rewards_addeds: RewardsAdded;
  box_rewards: BoxReward;
  rewards_withdraws: RewardsWithdraw;
  user_rewards: UserReward;
  token_total_amounts: TokenTotalAmount;
}
