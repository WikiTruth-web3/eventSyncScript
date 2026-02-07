import { ContractName } from '../contractsConfig/types'
import type { RuntimeScope } from '../oasisQuery/types/searchScope'
import { syncRuntimeContractEvents } from '../core/sync'
import { DEFAULT_SCOPE,} from '../config/sync'
import { saveEventDataToFile, shouldSaveEventDataToFile } from '../local/saveEventDataToFile'
import { updateSyncStatus } from '../core/state'
import { decodeContractEvents } from '../utils/decodeEvents'
import { persistTruthBoxSync } from '../services/supabase/truthBoxWriter'
import { CONTROLLER } from '../controller'
import type { DecodedRuntimeEvent } from '../oasisQuery/app/services/events'

export interface FetchTruthBoxEventsResult {
  outputPath: string | null 
  block_number: number
  events: DecodedRuntimeEvent<Record<string, unknown>>[]
}

/**
 * Fetch TruthBox contract events
 * @param scope - Runtime scope
 * @param lastSyncedBlock - Last synced block height (optional), if not provided, uses contract config's startBlock
 * @returns Result containing output path and latest event block height
 */
export async function fetchTruthBoxEvents(
  scope: RuntimeScope = DEFAULT_SCOPE,
  lastSyncedBlock: number,
): Promise<FetchTruthBoxEventsResult> {
  console.log(`🌐 Querying TruthBox: network=${scope.network}, layer=${scope.layer}`)

  const syncResult = await syncRuntimeContractEvents({
    scope,
    contract: ContractName.TRUTH_BOX,
    limit: Number(process.env.EVENT_SYNC_LIMIT ),
    batchSize: Number(process.env.EVENT_SYNC_BATCH_SIZE),
    fromRound: lastSyncedBlock,
  })

  // Decode events using unified decoding utility function (does not depend on underlying oasisQuery module's decoding results)
  const decodedEvents = decodeContractEvents(
    syncResult.fetchResult.rawEvents,
    ContractName.TRUTH_BOX,
    scope,
  )

  // NOTE: Important to reverse the events to make sure the events are in the right order
  decodedEvents.reverse()

  console.log(`✅ Fetched ${decodedEvents.length} decoded events (total ${syncResult.fetchResult.totalFetched} raw events, fetched ${syncResult.fetchResult.pagesFetched} pages)`)


  // Phase 2: Process each contract independently in a specific order to handle dependencies
  if (CONTROLLER.writeToSupabase && decodedEvents.length > 0) {
    await persistTruthBoxSync(DEFAULT_SCOPE, ContractName.TRUTH_BOX, decodedEvents)
  }

  // Optional: Save raw event data to file (for debugging)
  // Enable via environment variable EVENT_SYNC_SAVE_JSON=true
  let outputPath: string | null = null
  if (shouldSaveEventDataToFile()) {
    outputPath = await saveEventDataToFile(scope, ContractName.TRUTH_BOX, syncResult)
  }

  console.log(`📊 Sync status: from block ${syncResult.cursorBefore.lastBlock} to ${syncResult.cursorAfter.lastBlock}`)

  // Return latest event block height
  const block_number = syncResult.cursorAfter.lastBlock

  // Phase 3: Update sync status
  if (CONTROLLER.isUpdateLastBlock) {
    await updateSyncStatus(DEFAULT_SCOPE, ContractName.TRUTH_BOX, block_number)
  }

  return {
    outputPath,
    block_number,
    events: decodedEvents,
  }
}
