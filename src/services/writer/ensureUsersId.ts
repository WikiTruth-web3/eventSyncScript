import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import type { DecodedRuntimeEvent } from '../../oasisQuery/app/services/events'
import { db } from '../../config/db.client'
import { sanitizeForDb, getEventArgAsString } from '../../utils/getEventArgs'
import { Database } from '../../types/dataBase'

/**
 * Process all events to ensure users records exist
 * Note: Events are processed in order, use batch upsert for better performance

 */
export const ensureUserIdExist = async (
    scope: RuntimeScope,
    events: DecodedRuntimeEvent<any>[],
) => {
    const userIds = new Set<string>()

    // Collect userId from all events (use common utility, correctly handle 0 values)
    for (const event of events) {
        const userId = getEventArgAsString(event, 'userId')
        if (userId) {
            userIds.add(userId)
        }
    }

    if (userIds.size === 0) return

    // Batch upsert to avoid multiple queries
    const userRecords = Array.from(userIds).map(userId => ({
        network: scope.network as 'testnet' | 'mainnet',
        layer: scope.layer as 'sapphire',
        id: userId,
    }))
    
    // Sanitize objects to ensure no BigInt
    const sanitizedUserRecords = userRecords.map(record => 
        sanitizeForDb(record) as Database['public']['Tables']['users']['Insert']
    )
    
    const { error } = await db.upsert('users', sanitizedUserRecords)

    if (error) {
        console.warn(`⚠️  Failed to upsert users:`, error.message)
    } else {
        console.log(`✅ Users upserted:`, userIds)
    }
}

