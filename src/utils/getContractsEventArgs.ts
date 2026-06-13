import { ContractName } from '../contractsConfig/types'
import type { RuntimeEvent } from '../oasisQuery/oasis-nexus/api'

const rawGetEventArg = <T = unknown>(event: RuntimeEvent, key: string): T | undefined => {
  const param = (event.evm_log_params as Array<{ name: string; value: unknown }> | undefined)?.find(
    p => p.name === key,
  )
  return param?.value as T | undefined
}

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
  [ContractName.SIWE_AUTH]: Record<string, never>
}

// 3. 定义强类型的 DecodedContractEvent
export interface DecodedContractEvent<
  C extends ContractName,
  E extends keyof ContractEventMap[C]
> extends Omit<RuntimeEvent, 'evm_log_name'> {
  evm_log_name: E & string
}

// 4. 重构并导出强类型的参数提取函数（通过 keyof TArgs 限制 key，提供默认泛型以无缝兼容非强类型场景）
export function getEventArgAsString<
  TArgs extends Record<string, any> = Record<string, any>,
  K extends keyof TArgs = any
>(
  event: RuntimeEvent,
  key: K
): string | undefined {
  const value = rawGetEventArg<unknown>(event, key as string)
  if (value === undefined || value === null) {
    return ''
  }
  if (typeof value === 'bigint') {
    return value.toString()
  }
  return String(value)
}

export function getEventArgAsBoolean<
  TArgs extends Record<string, any> = Record<string, any>,
  K extends keyof TArgs = any
>(
  event: RuntimeEvent,
  key: K
): boolean {
  const value = rawGetEventArg<unknown>(event, key as string)
  if (value === undefined || value === null) {
    return false
  }
  if (typeof value === 'boolean') {
    return value
  }
  const str = String(value).toLowerCase()
  return str === 'true' || str === '1'
}

export function getEventArgValue<
  TArgs extends Record<string, any> = Record<string, any>,
  K extends keyof TArgs = any
>(
  event: RuntimeEvent,
  key: K
): TArgs[K] | undefined {
  return rawGetEventArg<TArgs[K]>(event, key as string)
}

export function hasEventArg<
  TArgs extends Record<string, any> = Record<string, any>,
  K extends keyof TArgs = any
>(
  event: RuntimeEvent,
  key: K
): boolean {
  const value = rawGetEventArg<unknown>(event, key as string)
  return value !== undefined && value !== null
}


