import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { ContractName } from '../../contractsConfig/types'
import { isDbConfigured, db } from '../../config/db.client'
import { Database } from '../../types/dataBase'
import { getEventArgAsString } from '../../utils/getContractsEventArgs'
import type { RuntimeEvent } from '../../oasisQuery/oasis-nexus/api'
import type { UserManagerEventType } from '../../contractsConfig/eventSignatures/eventType'


/**
 * Handle Blacklisted event
 * Update user_addresses table is_blacklisted field
 * 'event Blacklisted(address user, bool status)',
 */
export const handleBlacklisted = async (
    scope: RuntimeScope,
    event: RuntimeEvent,
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
    const addressData = {
        network: scope.network as 'testnet' | 'mainnet',
        layer: scope.layer as 'sapphire',
        id: address.toLowerCase(),
        is_blacklisted: isBlacklisted,
    } as Database['user_addresses']

    const { error } = await db.upsert('user_addresses', addressData)

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
    events: RuntimeEvent[],
): Promise<void> => {
    if (!isDbConfigured()) {
        console.warn('⚠️  Database URL / secret not configured, skipping database write')
        return
    }

    if (contract !== ContractName.USER_MANAGER) return 

    // Process all events
    for (const event of events) {
        const eventName = event.evm_log_name as UserManagerEventType
        if (eventName === 'Blacklisted') {
            await handleBlacklisted(scope, event)
        }
    }
}

