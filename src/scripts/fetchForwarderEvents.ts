import { ContractName } from '../contractsConfig/types'
import type { RuntimeScope } from '../oasisQuery/types/searchScope'
import { syncRuntimeContractEvents } from '../sync-engine/sync'
import { DEFAULT_SCOPE } from '../config/sync'
import { saveEventDataToFile, shouldSaveEventDataToFile } from '../dev-tools/saveEventDataToFile'
import { updateSyncStatus } from '../sync-engine/state'
import { persistForwarderSync } from '../services/writer/forwarderWriter'
import { CONTROLLER } from '../controller'
import type { RuntimeEvent } from '../oasisQuery/oasis-nexus/api'

export interface FetchForwarderEventsResult {
    outputPath: string | null
    block_number: number
    events: RuntimeEvent[]
}

/**
 * Fetch Forwarder contract events
 */
export async function fetchForwarderEvents(
    scope: RuntimeScope = DEFAULT_SCOPE,
    lastSyncedBlock: number,
): Promise<FetchForwarderEventsResult> {
    console.log(`🌐 Querying Forwarder events: network=${scope.network}, layer=${scope.layer}`)

    const syncResult = await syncRuntimeContractEvents<Record<string, unknown>>({
        scope,
        contract: ContractName.FORWARDER,
        limit: Number(process.env.EVENT_SYNC_LIMIT),
        batchSize: Number(process.env.EVENT_SYNC_BATCH_SIZE),
        fromRound: lastSyncedBlock,
    })
    const decodedEvents = syncResult.decodedEvents

    decodedEvents.reverse()

    console.log(`✅ Fetched ${decodedEvents.length} decoded events for Forwarder`)

    if (CONTROLLER.writeToDatabase && decodedEvents.length > 0) {
        await persistForwarderSync(DEFAULT_SCOPE, ContractName.FORWARDER, decodedEvents)
    }


    const block_number = syncResult.cursorAfter.lastBlock

    if (CONTROLLER.isUpdateLastBlock) {
        await updateSyncStatus(DEFAULT_SCOPE, ContractName.FORWARDER, block_number)
    }
    let outputPath: string | null = null
    if (shouldSaveEventDataToFile()) {
        outputPath = await saveEventDataToFile(scope, ContractName.FORWARDER, decodedEvents)
    }

    return {
        outputPath,
        block_number,
        events: decodedEvents,
    }
}
