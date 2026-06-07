// src/services/supabase/userIdWriter.ts
import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { ContractName } from '../../contractsConfig/types'
import { isSupabaseConfigured } from '../../config/supabase'
import { getSupabaseClient } from '../../config/supabase'
import { getEventArgAsString, sanitizeForSupabase } from '../../utils/getEventArgs'
import type { DecodedRuntimeEvent } from '../../oasisQuery/app/services/events'
import type { UserManagerEventType } from '../../contractsConfig/eventSignatures/eventType'

/**
 * Handle Blacklisted event
 * Update user_addresses table is_blacklisted field
 * 'event Blacklisted(address user, bool status)',
 */
export const handleBlacklisted = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const user = getEventArgAsString(event, 'user')
    const status = getEventArgAsString(event, 'status')

    if (!user || status === undefined || status === null) return

    const isBlacklisted = status === 'true' || status === '1'

    await _updateAddressBlacklist(scope, user, isBlacklisted)
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
 * Process UserManager contract events and write to Supabase
 */
export const persistUserManagerSync = async (
    scope: RuntimeScope,
    contract: ContractName,
    events: DecodedRuntimeEvent<any>[],
): Promise<void> => {
    if (!isSupabaseConfigured()) {
        console.warn('⚠️  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured, skipping database write')
        return
    }

    if (contract !== ContractName.USER_MANAGER) return 

    // Process all events
    for (const event of events) {
        const eventName = event.eventName as UserManagerEventType
        if (eventName === 'Blacklisted') {
            await handleBlacklisted(scope, event)
        }
    }
}
