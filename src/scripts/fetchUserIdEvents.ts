import { ContractName } from '../contractsConfig/types'
import type { RuntimeScope } from '../oasisQuery/types/searchScope'
import { syncRuntimeContractEvents } from '../core/sync'
import { DEFAULT_SCOPE,} from '../config/sync'
import { saveEventDataToFile, shouldSaveEventDataToFile } from '../local/saveEventDataToFile'
import { decodeContractEvents } from '../utils/decodeEvents'
import { updateSyncStatus } from '../core/state'
import { persistUserIdSync } from '../services/supabase/userIdWriter'
import { CONSTANTS } from '../index'

import type { DecodedRuntimeEvent } from '../oasisQuery/app/services/events'

export interface FetchUserIdEventsResult {
    outputPath: string | null
    block_number: number
    events: DecodedRuntimeEvent<Record<string, unknown>>[]
}

/**
 * Fetch UserId contract events
 * @param scope - Runtime scope
 * @param lastSyncedBlock - Last synced block height (optional), if not provided, uses contract config's startBlock
 */
export async function fetchUserIdEvents(
    scope: RuntimeScope = DEFAULT_SCOPE,
    lastSyncedBlock: number,
): Promise<FetchUserIdEventsResult> {
    console.log(`🌐 Querying UserId events: network=${scope.network}, layer=${scope.layer}`)

    const syncResult = await syncRuntimeContractEvents({
        scope,
        contract: ContractName.USER_ID,
        limit: Number(process.env.EVENT_SYNC_LIMIT),
        batchSize: Number(process.env.EVENT_SYNC_BATCH_SIZE),
        fromRound: lastSyncedBlock,
    })

    // Decode events using unified decoding utility function
    const decodedEvents = decodeContractEvents(
        syncResult.fetchResult.rawEvents,
        ContractName.USER_ID,
        scope,
    )

    // NOTE: Important to reverse the events to make sure the events are in the right order
    decodedEvents.reverse()

    console.log(`✅ Fetched ${decodedEvents.length} decoded events (total ${syncResult.fetchResult.totalFetched} raw events, fetched ${syncResult.fetchResult.pagesFetched} pages)`)

    // Phase 2: Process each contract independently in a specific order to handle dependencies
    if (CONSTANTS.writeToSupabase && decodedEvents.length > 0) {
        await persistUserIdSync(DEFAULT_SCOPE, ContractName.USER_ID, decodedEvents)
    }

    let outputPath: string | null = null
    if (shouldSaveEventDataToFile()) {
        outputPath = await saveEventDataToFile(scope, ContractName.USER_ID, syncResult)
    }

    console.log(`📊 Sync status: from block ${syncResult.cursorBefore.lastBlock} to ${syncResult.cursorAfter.lastBlock}`)

    const block_number = syncResult.cursorAfter.lastBlock

    // Phase 3: Update sync status
    if (CONSTANTS.isUpdateLastBlock) {
      await updateSyncStatus(DEFAULT_SCOPE, ContractName.USER_ID, block_number)
    }

    return {
        outputPath,
        block_number,
        events: decodedEvents,
    }
}

