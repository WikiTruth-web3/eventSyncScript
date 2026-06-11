import { ContractName } from '../contractsConfig/types'
import type { RuntimeScope } from '../oasisQuery/types/searchScope'
import { syncRuntimeContractEvents } from '../sync-engine/sync'
import { DEFAULT_SCOPE,} from '../config/sync'
import { saveEventDataToFile, shouldSaveEventDataToFile } from '../dev-tools/saveEventDataToFile'
import { updateSyncStatus } from '../sync-engine/state'
import { persistBlindBoxSync } from '../services/writer/blindBoxWriter'
import { CONTROLLER } from '../controller'
import type { DecodedRuntimeEvent } from '../oasisQuery/app/services/events'

export interface FetchBlindBoxEventsResult {
  outputPath: string | null 
  block_number: number
  events: DecodedRuntimeEvent<Record<string, unknown>>[]
}

/**
 * Fetch BlindBox contract events
 * @param scope - Runtime scope
 * @param lastSyncedBlock - Last synced block height (optional), if not provided, uses contract config's startBlock
 * @returns Result containing output path and latest event block height
 */
export async function fetchBlindBoxEvents(
  scope: RuntimeScope = DEFAULT_SCOPE,
  lastSyncedBlock: number,
): Promise<FetchBlindBoxEventsResult> {
  console.log(`🌐 Querying BlindBox: network=${scope.network}, layer=${scope.layer}`)

  const syncResult = await syncRuntimeContractEvents<Record<string, unknown>>({
    scope,
    contract: ContractName.BLIND_BOX,
    limit: Number(process.env.EVENT_SYNC_LIMIT ),
    batchSize: Number(process.env.EVENT_SYNC_BATCH_SIZE),
    fromRound: lastSyncedBlock,
  })
  const decodedEvents = syncResult.decodedEvents

  // NOTE: Important to reverse the events to make sure the events are in the right order
  decodedEvents.reverse()

  console.log(`✅ Fetched ${decodedEvents.length} decoded events (total ${syncResult.fetchResult.totalFetched} raw events, fetched ${syncResult.fetchResult.pagesFetched} pages)`)

  // Phase 2: Process each contract independently in a specific order to handle dependencies
  if (CONTROLLER.writeToDatabase && decodedEvents.length > 0) {
    await persistBlindBoxSync(DEFAULT_SCOPE, ContractName.BLIND_BOX, decodedEvents)
  }


  console.log(`📊 Sync status: from block ${syncResult.cursorBefore.lastBlock} to ${syncResult.cursorAfter.lastBlock}`)

  // Return latest event block height
  const block_number = syncResult.cursorAfter.lastBlock

  // Phase 3: Update sync status ====================================
  if (CONTROLLER.isUpdateLastBlock) {
    await updateSyncStatus(DEFAULT_SCOPE, ContractName.BLIND_BOX, block_number)
  }
  // Optional: Save raw event data to file (for debugging)
  // Enable via environment variable EVENT_SYNC_SAVE_JSON=true
  let outputPath: string | null = null
  if (shouldSaveEventDataToFile()) {
    outputPath = await saveEventDataToFile(scope, ContractName.BLIND_BOX, syncResult)
  }

  return {
    outputPath,
    block_number,
    events: decodedEvents,
  }
}
