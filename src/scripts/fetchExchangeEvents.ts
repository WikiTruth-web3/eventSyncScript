import { ContractName } from '../contractsConfig/types'
import type { RuntimeScope } from '../oasisQuery/types/searchScope'
import { syncRuntimeContractEvents } from '../core/sync'
import { DEFAULT_SCOPE,} from '../config/sync'
import { saveEventDataToFile, shouldSaveEventDataToFile } from '../local/saveEventDataToFile'
import { decodeContractEvents } from '../utils/decodeEvents'
import { updateSyncStatus } from '../core/state'
import { CONSTANTS } from '../index'
import { persistExchangeSync } from '../services/supabase/exchangeWriter'
import type { DecodedRuntimeEvent } from '../oasisQuery/app/services/events'

export interface FetchExchangeEventsResult {
  outputPath: string | null
  block_number: number
  events: DecodedRuntimeEvent<Record<string, unknown>>[]
}

/**
 * Fetch Exchange contract events
 * @param scope - Runtime scope
 * @param lastSyncedBlock - Last synced block height (optional), if not provided, uses contract config's startBlock
 */
export async function fetchExchangeEvents(
  scope: RuntimeScope = DEFAULT_SCOPE,
  lastSyncedBlock?: number,
): Promise<FetchExchangeEventsResult> {
  console.log(`🌐 Querying Exchange: network=${scope.network}, layer=${scope.layer}`)

  const syncResult = await syncRuntimeContractEvents({
    scope,
    contract: ContractName.EXCHANGE,
    limit: Number(process.env.EVENT_SYNC_LIMIT),
    batchSize: Number(process.env.EVENT_SYNC_BATCH_SIZE),
    fromRound: lastSyncedBlock,
  })

  // Decode events using unified decoding utility function
  const decodedEvents = decodeContractEvents(
    syncResult.fetchResult.rawEvents,
    ContractName.EXCHANGE,
    scope,
  )

  // NOTE: Important to reverse the events to make sure the events are in the right order
  decodedEvents.reverse()

  console.log(`✅ Fetched ${decodedEvents.length} decoded events (total ${syncResult.fetchResult.totalFetched} raw events, fetched ${syncResult.fetchResult.pagesFetched} pages)`)

  // Phase 2: Process each contract independently in a specific order to handle dependencies
  if (CONSTANTS.writeToSupabase && decodedEvents.length > 0) {
    await persistExchangeSync(DEFAULT_SCOPE, ContractName.EXCHANGE, decodedEvents)
  }

  let outputPath: string | null = null
  if (shouldSaveEventDataToFile()) {
    outputPath = await saveEventDataToFile(scope, ContractName.EXCHANGE, syncResult)
  }

  console.log(`📊 Sync status: from block ${syncResult.cursorBefore.lastBlock} to ${syncResult.cursorAfter.lastBlock}`)

  const block_number = syncResult.cursorAfter.lastBlock

  // Phase 3: Update sync status
      if (CONSTANTS.isUpdateLastBlock) {
        await updateSyncStatus(DEFAULT_SCOPE, ContractName.EXCHANGE, block_number)
      }

  return {
    outputPath,
    block_number,
    events: decodedEvents,
  }
}

