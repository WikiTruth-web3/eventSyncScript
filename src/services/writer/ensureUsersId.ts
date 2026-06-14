import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import type { RuntimeEvent } from '../../oasisQuery/oasis-nexus/api'
import { supabase } from '../../config/supabase.config'
import { getEventArgAsString } from '../../utils/getContractsEventArgs'

/**
 * Process all events to ensure users records exist
 * Note: Events are processed in order, use batch upsert for better performance
 */
export const ensureUserIdExist = async (
    scope: RuntimeScope,
    events: RuntimeEvent[],
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
        id: userId,
    }))
    
    const { error } = await (supabase.from('users') as any).upsert(userRecords)

    if (error) {
        console.warn(`⚠️  Failed to upsert users:`, error.message)
    } else {
        console.log(`✅ Users upserted:`, userIds)
    }
}
