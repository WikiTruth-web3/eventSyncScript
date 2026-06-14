import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { supabase } from '../../config/supabase.config'
import { ContractName } from '../../contractsConfig/types'
import type { RuntimeEvent } from '../../oasisQuery/oasis-nexus/api'
import { DecodedContractEvent } from '../../utils/getContractsEventArgs'

/**
 * Handle Paused event for Forwarder
 */
export const handlePaused = async (
    scope: RuntimeScope,
    event: DecodedContractEvent<ContractName.FORWARDER, 'Paused'>,
): Promise<void> => {
    const { error } = await (supabase.from('forwarder_state') as any).upsert({
        id: 'forwarder',
        paused: true,
    })

    if (error) {
        console.warn(`⚠️  Failed to update forwarder_state (paused=true):`, error.message)
    } else {
        console.log(`✅ Updated forwarder_state (paused=true)`)
    }
}

/**
 * Handle Unpaused event for Forwarder
 */
export const handleUnpaused = async (
    scope: RuntimeScope,
    event: DecodedContractEvent<ContractName.FORWARDER, 'Unpaused'>,
): Promise<void> => {
    const { error } = await (supabase.from('forwarder_state') as any).upsert({
        id: 'forwarder',
        paused: false,
    })

    if (error) {
        console.warn(`⚠️  Failed to update forwarder_state (paused=false):`, error.message)
    } else {
        console.log(`✅ Updated forwarder_state (paused=false)`)
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
    if (contract !== ContractName.FORWARDER) return

    for (const event of events) {
        const eventName = event.evm_log_name
        if (eventName === 'Paused') {
            await handlePaused(scope, event as DecodedContractEvent<ContractName.FORWARDER, 'Paused'>)
        } else if (eventName === 'Unpaused') {
            await handleUnpaused(scope, event as DecodedContractEvent<ContractName.FORWARDER, 'Unpaused'>)
        }
    }
}
