import { ContractName } from '../contractsConfig/types'
import type { DecodedRuntimeEvent } from '../oasisQuery/app/services/events'
import { 
  getEventArgAsString as rawGetEventArgAsString,
  getEventArgAsBoolean as rawGetEventArgAsBoolean,
  hasEventArg as rawHasEventArg,
} from './getEventArgs'
import { getEventArg as rawGetEventArg } from './eventArgs'

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

// 2. 将合约名称映射到具体的事件及其参数
export interface ContractEventMap {
  [ContractName.BLIND_BOX]: BlindBoxEventArgs
  [ContractName.EXCHANGE]: ExchangeEventArgs
  [ContractName.FUND_MANAGER]: FundManagerEventArgs
  [ContractName.USER_MANAGER]: UserManagerEventArgs
  [ContractName.FORWARDER]: ForwarderEventArgs
  [ContractName.ADDRESS_MANAGER]: Record<string, never>
  [ContractName.SIWE_AUTH]: Record<string, never>
}

// 3. 定义强类型的 DecodedContractEvent
export type DecodedContractEvent<
  C extends ContractName,
  E extends keyof ContractEventMap[C]
> = Omit<DecodedRuntimeEvent<unknown>, 'args'> & {
  eventName: E
  args: ContractEventMap[C][E]
}

// 4. 重构并导出强类型的参数提取函数（通过 keyof TArgs 限制 key）
export function getEventArgAsString<
  TArgs extends Record<string, any>,
  K extends keyof TArgs
>(
  event: DecodedRuntimeEvent<TArgs> | (Omit<DecodedRuntimeEvent<unknown>, 'args'> & { args: TArgs }),
  key: K
): string | undefined {
  return rawGetEventArgAsString(event as any, key as string)
}

export function getEventArgAsBoolean<
  TArgs extends Record<string, any>,
  K extends keyof TArgs
>(
  event: DecodedRuntimeEvent<TArgs> | (Omit<DecodedRuntimeEvent<unknown>, 'args'> & { args: TArgs }),
  key: K
): boolean {
  return rawGetEventArgAsBoolean(event as any, key as string)
}

export function getEventArgValue<
  TArgs extends Record<string, any>,
  K extends keyof TArgs
>(
  event: DecodedRuntimeEvent<TArgs> | (Omit<DecodedRuntimeEvent<unknown>, 'args'> & { args: TArgs }),
  key: K
): TArgs[K] | undefined {
  return rawGetEventArg<TArgs[K]>(event as any, key as string)
}

export function hasEventArg<
  TArgs extends Record<string, any>,
  K extends keyof TArgs
>(
  event: DecodedRuntimeEvent<TArgs> | (Omit<DecodedRuntimeEvent<unknown>, 'args'> & { args: TArgs }),
  key: K
): boolean {
  return rawHasEventArg(event as any, key as string)
}
