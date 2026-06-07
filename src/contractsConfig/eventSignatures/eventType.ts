/** BlindBox contract event names */
export type BlindBoxEventType =
  | 'BoxCreated'
  | 'BoxStatusChanged'
  | 'PriceChanged'
  | 'DeadlineChanged';

/** Exchange contract event names */
export type ExchangeEventType =
  | 'BoxListed'
  | 'BoxPurchased'
  | 'BidPlaced'
  | 'CompleterAssigned'
  | 'RequestDeadlineChanged'
  | 'ArbitrationDeadineChanged'
  | 'RefundPermitChanged';

/** FundManager contract event names */
export type FundManagerEventType =
  | 'Payment'
  | 'OrderAmountWithdraw'
  | 'RefundAmountWithdraw'
  | 'RewardAdded'
  | 'RewardWithdraw';

/** UserManager contract event names */
export type UserManagerEventType =
  | 'Blacklisted';

/** Forwarder contract event names */
export type ForwarderEventType =
  | 'Paused'
  | 'Unpaused';

/** Union of all supported event types */
export type AllEventType =
  | BlindBoxEventType
  | ExchangeEventType
  | FundManagerEventType
  | UserManagerEventType
  | ForwarderEventType;

/** Map contract name to its event type union */
export const CONTRACT_EVENT_TYPE_MAP = {
  blindBox: undefined as unknown as BlindBoxEventType,
  exchange: undefined as unknown as ExchangeEventType,
  fundManager: undefined as unknown as FundManagerEventType,
  userManager: undefined as unknown as UserManagerEventType,
  forwarder: undefined as unknown as ForwarderEventType,
} as const;
