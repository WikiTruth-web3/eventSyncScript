import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { getSupabaseClient } from '../../config/supabase'
import { isSupabaseConfigured } from '../../config/supabase'
import { ContractName } from '../../contractsConfig/types'
import type { DecodedRuntimeEvent } from '../../oasisQuery/app/services/events'

/**
 * Handle Paused / Unpaused events for Forwarder
 * Update forwarder_state table
 */
export const handleForwarderState = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const supabase = getSupabaseClient()
    const isPaused = event.eventName === 'Paused'

    const { error } = await supabase
        .from('forwarder_state')
        .upsert({
            network: scope.network,
            layer: scope.layer,
            id: 'forwarder',
            paused: isPaused,
        }, {
            onConflict: 'network,layer,id',
        })

    if (error) {
        console.warn(`⚠️  Failed to update forwarder_state (paused=${isPaused}):`, error.message)
    } else {
        console.log(`✅ Updated forwarder_state (paused=${isPaused})`)
    }
}

/**
 * Process Forwarder contract events and write to Supabase
 */
export const persistForwarderSync = async (
    scope: RuntimeScope,
    contract: ContractName,
    events: DecodedRuntimeEvent<any>[],
): Promise<void> => {
    if (!isSupabaseConfigured()) {
        console.warn('⚠️  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured, skipping database write')
        return
    }

    if (contract !== ContractName.FORWARDER) return

    for (const event of events) {
        if (event.eventName === 'Paused' || event.eventName === 'Unpaused') {
            await handleForwarderState(scope, event)
        }
    }
}
