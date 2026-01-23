import { ContractName } from '../contractsConfig/types'
import type { RuntimeScope } from '../oasisQuery/types/searchScope'
import { syncRuntimeContractEvents } from '../core/sync'
import { DEFAULT_SCOPE,} from '../config/sync'
import { persistFundManagerSync } from '../services/supabase/fundManagerWriter'
import { saveEventDataToFile, shouldSaveEventDataToFile } from '../utils/saveEventDataToFile'
import { decodeContractEvents } from '../utils/decodeEvents'
import { updateSyncStatus } from '../core/state'

export interface FetchFundManagerEventsResult {
    outputPath: string | null
    block_number: number
}

/**
 * Fetch FundManager contract events
 * @param scope - Runtime scope
 * @param lastSyncedBlock - Last synced block height (optional), if not provided, uses contract config's startBlock
 * @param syncToSupabase - Whether to sync to Supabase database
 * @param updateSyncBlock - Whether to update sync status (default true)
 */
export async function fetchFundManagerEvents(
    scope: RuntimeScope = DEFAULT_SCOPE,
    lastSyncedBlock: number,
    syncToSupabase: boolean = true,
    updateSyncBlock: boolean = true
): Promise<FetchFundManagerEventsResult> {
    console.log(`🌐 Querying FundManager: network=${scope.network}, layer=${scope.layer}`)

    const syncResult = await syncRuntimeContractEvents({
        scope,
        contract: ContractName.FUND_MANAGER,
        limit: Number(process.env.EVENT_SYNC_LIMIT),
        batchSize: Number(process.env.EVENT_SYNC_BATCH_SIZE),
        fromRound: lastSyncedBlock,
    })

    // Decode events using unified decoding utility function
    const decodedEvents = decodeContractEvents(
        syncResult.fetchResult.rawEvents,
        ContractName.FUND_MANAGER,
        scope,
    )

    console.log(`✅ Fetched ${decodedEvents.length} decoded events (total ${syncResult.fetchResult.totalFetched} raw events, fetched ${syncResult.fetchResult.pagesFetched} pages)`)

    const syncResultWithDecodedEvents = {
        ...syncResult,
        fetchResult: {
            ...syncResult.fetchResult,
            events: decodedEvents,
        },
    }

    // ✅ Write to database
    if (syncToSupabase) {
        await persistFundManagerSync(scope, ContractName.FUND_MANAGER, syncResultWithDecodedEvents)
    }

    let outputPath: string | null = null
    if (shouldSaveEventDataToFile()) {
        outputPath = await saveEventDataToFile(scope, ContractName.FUND_MANAGER, syncResult)
    }

    console.log(`📊 Sync status: from block ${syncResult.cursorBefore.lastBlock} to ${syncResult.cursorAfter.lastBlock}`)

    const block_number = syncResult.cursorAfter.lastBlock

    // Update sync status
    if (updateSyncBlock && syncToSupabase) {
        await updateSyncStatus(scope, ContractName.FUND_MANAGER, block_number)
    }

    return {
        outputPath,
        block_number,
    }
}

