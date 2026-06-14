import { ContractName } from '../types'

// 1. 各个合约的事件参数 Interface 定义
export interface BlindBoxEventArgs {
  BoxCreated: {
    boxId: bigint
    userId: string
    boxInfoCID: string
  }
  BoxStatusChanged: {
    boxId: bigint
    status: number
  }
  PriceChanged: {
    boxId: bigint
    price: bigint
  }
  DeadlineChanged: {
    boxId: bigint
    deadline: bigint
  }
}

export interface ExchangeEventArgs {
  BoxListed: {
    boxId: bigint
    userId: string
    acceptedToken: string
  }
  BoxPurchased: {
    boxId: bigint
    userId: string
  }
  BidPlaced: {
    boxId: bigint
    userId: string
  }
  CompleterAssigned: {
    boxId: bigint
    userId: string
  }
  RequestDeadlineChanged: {
    boxId: bigint
    deadline: bigint
  }
  ArbitrationDeadineChanged: {
    boxId: bigint
    deadline: bigint
  }
  RefundPermitChanged: {
    boxId: bigint
    permission: boolean
  }
}

export interface FundManagerEventArgs {
  Payment: {
    boxId: bigint
    userId: string
    token: string
    amount: bigint
    pt: number
  }
  OrderAmountWithdraw: {
    list: bigint[]
    token: string
    userId: string
    amount: bigint
  }
  RefundAmountWithdraw: {
    list: bigint[]
    token: string
    userId: string
    amount: bigint
  }
  RewardAdded: {
    boxId: bigint
    userId: string
    token: string
    amount: bigint
  }
  RewardWithdraw: {
    userId: string
    token: string
    amount: bigint
  }
}

export interface UserManagerEventArgs {
  Blacklisted: {
    user: string
    status: boolean
  }
}

export interface ForwarderEventArgs {
  Paused: {
    account: string
  }
  Unpaused: {
    account: string
  }
}

// 2. 将合约名称映射 to 具体的事件及其参数
export interface ContractEventMap {
  [ContractName.BLIND_BOX]: BlindBoxEventArgs
  [ContractName.EXCHANGE]: ExchangeEventArgs
  [ContractName.FUND_MANAGER]: FundManagerEventArgs
  [ContractName.USER_MANAGER]: UserManagerEventArgs
  [ContractName.FORWARDER]: ForwarderEventArgs
  [ContractName.ADDRESS_MANAGER]: Record<string, never>
  // [ContractName.SIWE_AUTH]: Record<string, never>
}
