import { ContractName } from '../contractsConfig/types'
import type { RuntimeScope } from '../oasisQuery/types/searchScope'
import { syncRuntimeContractEvents } from '../sync-engine/sync'
import { DEFAULT_SCOPE,} from '../config/sync'
import { saveEventDataToFile, shouldSaveEventDataToFile } from '../dev-tools/saveEventDataToFile'
import { updateSyncStatus } from '../sync-engine/state'
import { persistUserManagerSync } from '../services/writer/userManagerWriter'
import { CONTROLLER } from '../controller'

import type { RuntimeEvent } from '../oasisQuery/oasis-nexus/api'

export interface FetchUserManagerEventsResult {
    outputPath: string | null
    block_number: number
    events: RuntimeEvent[]
}

/**
 * Fetch UserManager contract events
 * @param scope - Runtime scope
 * @param lastSyncedBlock - Last synced block height (optional), if not provided, uses contract config's startBlock
 */
export async function fetchUserManagerEvents(
    scope: RuntimeScope = DEFAULT_SCOPE,
    lastSyncedBlock: number,
): Promise<FetchUserManagerEventsResult> {
    console.log(`🌐 Querying UserManager events: network=${scope.network}, layer=${scope.layer}`)

    const syncResult = await syncRuntimeContractEvents<Record<string, unknown>>({
        scope,
        contract: ContractName.USER_MANAGER,
        limit: Number(process.env.EVENT_SYNC_LIMIT),
        batchSize: Number(process.env.EVENT_SYNC_BATCH_SIZE),
        fromRound: lastSyncedBlock,
    })
    const decodedEvents = syncResult.decodedEvents

    // NOTE: Important to reverse the events to make sure the events are in the right order
    decodedEvents.reverse()

    console.log(`✅ Fetched ${decodedEvents.length} decoded events for UserManager`)

    // Phase 2: Process each contract independently in a specific order to handle dependencies
    if (CONTROLLER.writeToDatabase && decodedEvents.length > 0) {
        await persistUserManagerSync(DEFAULT_SCOPE, ContractName.USER_MANAGER, decodedEvents)
    }


    console.log(`📊 Sync status: from block ${syncResult.cursorBefore.lastBlock} to ${syncResult.cursorAfter.lastBlock}`)

    const block_number = syncResult.cursorAfter.lastBlock

    // Phase 3: Update sync status
    if (CONTROLLER.isUpdateLastBlock) {
        await updateSyncStatus(DEFAULT_SCOPE, ContractName.USER_MANAGER, block_number)
    }
    let outputPath: string | null = null
    if (shouldSaveEventDataToFile()) {
        outputPath = await saveEventDataToFile(scope, ContractName.USER_MANAGER, decodedEvents)
    }

    return {
        outputPath,
        block_number,
        events: decodedEvents,
    }
}

