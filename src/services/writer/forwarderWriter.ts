import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { isDbConfigured, db } from '../../config/db.client'
import { Database } from '../../types/dataBase'
import { ContractName } from '../../contractsConfig/types'
import type { RuntimeEvent } from '../../oasisQuery/oasis-nexus/api'
import type { ForwarderEventType } from '../../contractsConfig/eventSignatures/eventType'

/**
 * Handle Paused / Unpaused events for Forwarder
 * Update forwarder_state table
 */
export const handleForwarderState = async (
    scope: RuntimeScope,
    event: RuntimeEvent,
): Promise<void> => {
    const isPaused = event.evm_log_name === 'Paused'

    const { error } = await db.upsert('forwarder_state', {
            network: scope.network as 'testnet' | 'mainnet',
            layer: scope.layer as 'sapphire',
            id: 'forwarder',
            paused: isPaused,
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
    events: RuntimeEvent[],
): Promise<void> => {
    if (!isDbConfigured()) {
        console.warn('⚠️  Database URL / secret not configured, skipping database write')
        return
    }

    if (contract !== ContractName.FORWARDER) return

    for (const event of events) {
        const eventName = event.evm_log_name as ForwarderEventType
        if (eventName === 'Paused' || eventName === 'Unpaused') {
            await handleForwarderState(scope, event)
        }
    }
}

