import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import type { DecodedRuntimeEvent } from '../../oasisQuery/app/services/events'
import { getSupabaseClient } from '../../config/supabase'
import { sanitizeForSupabase, getEventArgAsString } from '../../utils/getEventArgs'

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

    const supabase = getSupabaseClient()
    
    // Batch upsert to avoid multiple queries
    const userRecords = Array.from(userIds).map(userId => ({
        network: scope.network,
        layer: scope.layer,
        id: userId,
    }))
    
    // Sanitize objects to ensure no BigInt
    const sanitizedUserRecords = userRecords.map(record => 
        sanitizeForSupabase(record) as Record<string, unknown>
    )
    
    const { error } = await supabase
        .from('users')
        .upsert(sanitizedUserRecords, {
            onConflict: 'network,layer,id',
        })

    if (error) {
        console.warn(`⚠️  Failed to upsert users:`, error.message)
    } else {
        console.log(`✅ Users upserted:`, userIds)
    }
}

