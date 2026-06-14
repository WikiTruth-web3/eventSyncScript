// src/services/supabase/ensureAddress.ts
import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { supabase } from '../../config/supabase.config'
import * as DBTypes from '../../types/dataBase'
import { getEventArgAsString } from '../../utils/getContractsEventArgs'
import type { RuntimeEvent } from '../../oasisQuery/oasis-nexus/api'

/**
 * Create or update user address record
 * Note: user_addresses table only has basic fields, no other data, use upsert directly
 */
export const ensureUserAddressExists = async (
  scope: RuntimeScope,
  address: string,
): Promise<void> => {
  if (!address) return

  // Use upsert directly, won't error even if already exists
  const addressData: DBTypes.UserAddress = {
    id: address.toLowerCase(),
    is_blacklisted: false,
  }

  const { error } = await (supabase.from('user_addresses') as any).upsert(addressData)

  if (error) {
    console.warn(`⚠️  Failed to upsert user address ${address}:`, error.message)
  } else {
    console.log(`✅ User address ${address} upserted`)
  }
}

export const ensureAddressExist = async (
    scope: RuntimeScope,
    events: RuntimeEvent[],
    argName: string,
) => {
    const addresses = new Set<string>()

    // Collect userId from all events (use common utility, correctly handle 0 values)
    for (const event of events) {
        const address = getEventArgAsString(event, argName)
        if (address) {
            addresses.add(address)
        }
    }

    if (addresses.size === 0) return

    // Batch upsert to avoid multiple queries
    const addressRecords = Array.from(addresses).map(address => ({
        id: address.toLowerCase(),
        is_blacklisted: false,
    }))
    
    const { error } = await (supabase.from('user_addresses') as any).upsert(addressRecords)

    if (error) {
        console.warn(`⚠️  Failed to upsert users:`, error.message)
    } else {
        console.log(`✅ Users upserted:`, addresses)
    }
}
