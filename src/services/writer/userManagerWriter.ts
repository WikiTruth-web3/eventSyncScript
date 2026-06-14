import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { ContractName } from '../../contractsConfig/types'
import { supabase } from '../../config/supabase.config'
import * as DBTypes from '../../types/dataBase'
import { getEventArgAsString, DecodedContractEvent } from '../../utils/getContractsEventArgs'
import type { RuntimeEvent } from '../../oasisQuery/oasis-nexus/api'

/**
 * Handle Blacklisted event
 * Update user_addresses table is_blacklisted field
 * 'event Blacklisted(address user, bool status)',
 */
export const handleBlacklisted = async (
    scope: RuntimeScope,
    event: DecodedContractEvent<ContractName.USER_MANAGER, 'Blacklisted'>,
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
    const addressData: DBTypes.UserAddress = {
        id: address.toLowerCase(),
        is_blacklisted: isBlacklisted,
    }

    const { error } = await (supabase.from('user_addresses') as any).upsert(addressData)

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
    if (contract !== ContractName.USER_MANAGER) return 

    // Process all events
    for (const event of events) {
        const eventName = event.evm_log_name
        if (eventName === 'Blacklisted') {
            await handleBlacklisted(scope, event as DecodedContractEvent<ContractName.USER_MANAGER, 'Blacklisted'>)
        }
    }
}
