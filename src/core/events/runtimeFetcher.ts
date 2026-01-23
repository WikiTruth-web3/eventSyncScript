import { ContractName } from '../../contractsConfig/types'
import { useRuntimeContractEvents } from '../../oasisQuery/app/hooks/useRuntimeContractEvents'
import type { RuntimeContractEventSource, EventFetchResult } from './types'

export async function fetchRuntimeContractEvents<TArgs = Record<string, unknown>>(
  source: RuntimeContractEventSource,
): Promise<EventFetchResult<TArgs>> {
  const {
    scope,
    contract,
    eventNames,
    eventFilters,
    limit = 500,
    offset = 0,
    batchSize = 200,
    maxPages,
    fromRound,
    toRound,
    fromTimestamp,
    toTimestamp,
    useEvmSignatureFilter = false,
  } = source

  if (!Object.values(ContractName).includes(contract)) {
    throw new Error(`Unsupported contract ${String(contract)}`)
  }

  const result = await useRuntimeContractEvents<TArgs>({
    scope,
    contract,
    limit,
    offset,
    eventNames,
    eventFilters,
    batchSize,
    maxPages,
    fromRound,
    toRound,
    fromTimestamp,
    toTimestamp,
    useEvmSignatureFilter,
  })

  return {
    scope,
    contract,
    events: result.events,
    rawEvents: result.rawEvents,
    contractAddress: result.address,
    pagesFetched: result.pagesFetched,
    totalFetched: result.totalFetched,
    metadata: {
      limit,
      offset,
      eventFilters,
      eventNames,
    },
  }
}
