import { ContractName } from '../contractsConfig/types'
import { ContractEventMap } from '../contractsConfig/eventSignatures/eventMap'
import type { RuntimeEvent } from '../oasisQuery/oasis-nexus/api'

const rawGetEventArg = <T = unknown>(event: RuntimeEvent, key: string): T | undefined => {
  const param = (event.evm_log_params as Array<{ name: string; value: unknown }> | undefined)?.find(
    p => p.name === key,
  )
  return param?.value as T | undefined
}

// 3. 定义强类型的 DecodedContractEvent
export interface DecodedContractEvent<
  C extends ContractName,
  E extends keyof ContractEventMap[C]
> extends Omit<RuntimeEvent, 'evm_log_name'> {
  evm_log_name: E & string
}

// 自动提取强类型 Event 参数的工具类型
export type GetEventArgs<Event> = Event extends DecodedContractEvent<infer C, infer E>
  ? (E extends keyof ContractEventMap[C] ? ContractEventMap[C][E] : Record<string, any>)
  : Record<string, any>

// 4. 重构并导出强类型的参数提取函数（依据 event 本身强类型自动限制 key，提供默认泛型无缝兼容 legacy 场景）
export function getEventArgAsString<
  Event extends RuntimeEvent = RuntimeEvent
>(
  event: Event,
  key: keyof GetEventArgs<Event> & string
): string | undefined {
  const value = rawGetEventArg<unknown>(event, key)
  if (value === undefined || value === null) {
    return ''
  }
  if (typeof value === 'bigint') {
    return value.toString()
  }
  return String(value)
}

export function getEventArgAsBoolean<
  Event extends RuntimeEvent = RuntimeEvent
>(
  event: Event,
  key: keyof GetEventArgs<Event> & string
): boolean {
  const value = rawGetEventArg<unknown>(event, key)
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
  Event extends RuntimeEvent = RuntimeEvent,
  K extends keyof GetEventArgs<Event> & string = any
>(
  event: Event,
  key: K
): GetEventArgs<Event>[K] | undefined {
  return rawGetEventArg<GetEventArgs<Event>[K]>(event, key)
}

export function hasEventArg<
  Event extends RuntimeEvent = RuntimeEvent
>(
  event: Event,
  key: keyof GetEventArgs<Event> & string
): boolean {
  const value = rawGetEventArg<unknown>(event, key)
  return value !== undefined && value !== null
}
