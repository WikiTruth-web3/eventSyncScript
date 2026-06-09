import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { isDbConfigured, db } from '../../config/db.client'
import { Database } from '../../types/dataBase'
import { ContractName } from '../../contractsConfig/types'
import type { DecodedRuntimeEvent } from '../../oasisQuery/app/services/events'
import type { ForwarderEventType } from '../../contractsConfig/eventSignatures/eventType'

/**
 * Handle Paused / Unpaused events for Forwarder
 * Update forwarder_state table
 */
export const handleForwarderState = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const isPaused = event.eventName === 'Paused'

    const { error } = await db
        .from('forwarder_state')
        .upsert({
            network: scope.network as 'testnet' | 'mainnet',
            layer: scope.layer as 'sapphire',
            id: 'forwarder',
            paused: isPaused,
        } as Database['public']['Tables']['forwarder_state']['Insert'], {
            onConflict: 'network,layer,id',
        })

    if (error) {
        console.warn(`⚠️  Failed to update forwarder_state (paused=${isPaused}):`, error.message)
    } else {
        console.log(`✅ Updated forwarder_state (paused=${isPaused})`)
    }
}

/**
 * Process Forwarder contract events and write to Database
 */
export const persistForwarderSync = async (
    scope: RuntimeScope,
    contract: ContractName,
    events: DecodedRuntimeEvent<any>[],
): Promise<void> => {
    if (!isDbConfigured()) {
        console.warn('⚠️  Database URL / secret not configured, skipping database write')
        return
    }

    if (contract !== ContractName.FORWARDER) return

    for (const event of events) {
        const eventName = event.eventName as ForwarderEventType
        if (eventName === 'Paused' || eventName === 'Unpaused') {
            await handleForwarderState(scope, event)
        }
    }
}
