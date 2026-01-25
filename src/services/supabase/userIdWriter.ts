// src/services/supabase/userIdWriter.ts
import type { RuntimeContractSyncResult } from '../../core/sync/runtimeContractSyncer'
import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { ContractName } from '../../contractsConfig/types'
import { isSupabaseConfigured } from '../../config/supabase'
import { getSupabaseClient } from '../../config/supabase'
import { getEventArgAsString, sanitizeForSupabase } from '../../utils/getEventArgs'
import type { DecodedRuntimeEvent } from '../../oasisQuery/app/services/events'

/**
 * Handle Blacklist event
 * Update user_addresses table is_blacklisted field
 * 'event Blacklist(address user, bool status)',
 */
export const handleBlacklist = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const user = getEventArgAsString(event, 'user')
    const status = getEventArgAsString(event, 'status')

    if (!user || status === undefined || status === null) return

    const isBlacklisted = status === 'true' || status === '1'

    _updateAddressBlacklist(scope, user, isBlacklisted)
}

const _updateAddressBlacklist = async (
    scope: RuntimeScope,
    address: string,
    isBlacklisted: boolean,
): Promise<void> => {
    const supabase = getSupabaseClient()

    const addressData = sanitizeForSupabase({
        network: scope.network,
        layer: scope.layer,
        id: address.toLowerCase(),
        is_blacklisted: isBlacklisted,
    }) as Record<string, unknown>

    const { error } = await supabase
        .from('user_addresses')
        .upsert(addressData, {
            onConflict: 'network,layer,id',
        })

    if (error) {
        console.warn(`⚠️  Failed to update blacklist status for user ${address}:`, error.message)
    } else {
        console.log(`✅ Updated blacklist status for user ${address}`)
    }
}

/**
 * Process UserId contract events and write to Supabase
 */
export const persistUserIdSync = async (
    scope: RuntimeScope,
    contract: ContractName,
    events: DecodedRuntimeEvent<any>[],
): Promise<void> => {
    if (!isSupabaseConfigured()) {
        console.warn('⚠️  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured, skipping database write')
        return
    }

    if (contract !== ContractName.USER_ID) return 

    // Process all events
    for (const event of events) {
        if (event.eventName === 'Blacklist') {
            await handleBlacklist(scope, event)
        }
    }
}