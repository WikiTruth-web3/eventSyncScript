// src/services/supabase/truthNFTWriter.ts
import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { db } from '../../config/db.client'
import { sanitizeForDb } from '../../utils/getEventArgs'
import { Database } from '../../types/dataBase'
import { getEventArgAsString } from '../../utils/getEventArgs'
import type { DecodedRuntimeEvent } from '../../oasisQuery/app/services/events'

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
  const addressData = sanitizeForDb({
    network: scope.network as 'testnet' | 'mainnet',
    layer: scope.layer as 'sapphire',
    id: address.toLowerCase(),
    is_blacklisted: false,
  }) as Database['public']['Tables']['user_addresses']['Insert']

  const { error } = await db
    .from('user_addresses')
    .upsert(addressData, {
      onConflict: 'network,layer,id',
    })

  if (error) {
    console.warn(`⚠️  Failed to upsert user address ${address}:`, error.message)
  } else {
    console.log(`✅ User address ${address} upserted`)
  }
}

export const ensureAddressExist = async (
    scope: RuntimeScope,
    events: DecodedRuntimeEvent<any>[],
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
        network: scope.network as 'testnet' | 'mainnet',
        layer: scope.layer as 'sapphire',
        id: address.toLowerCase(),
        is_blacklisted: false,
    }))
    
    // Sanitize objects to ensure no BigInt
    const sanitizedAddressRecords = addressRecords.map(record => 
        sanitizeForDb(record) as Database['public']['Tables']['user_addresses']['Insert']
    )
    
    const { error } = await db
        .from('user_addresses')
        .upsert(sanitizedAddressRecords, {
            onConflict: 'network,layer,id',
        })

    if (error) {
        console.warn(`⚠️  Failed to upsert users:`, error.message)
    } else {
        console.log(`✅ Users upserted:`, addresses)
    }
}
