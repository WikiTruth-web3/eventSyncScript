// src/services/supabase/exchangeWriter.ts
// import type { RuntimeContractSyncResult } from '../../core/sync/runtimeContractSyncer'
import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { ContractName } from '../../contractsConfig/types'
import { isDbConfigured, db } from '../../config/db.client'
import { ensureUserIdExist } from './ensureUsersId'
import { getEventArgAsString, sanitizeForDb } from '../../utils/getEventArgs'
import type { DecodedRuntimeEvent } from '../../oasisQuery/app/services/events'
import type { ExchangeEventType } from '../../contractsConfig/eventSignatures/eventType'
import { extractTimestamp } from '../../utils/extractTimestamp'
import { getBoolean } from '../../utils/getBoolean'
import { Database } from '../../types/dataBase'

/**
 * Handle BoxListed event
 * Update boxes table: listed_mode, accepted_token, listed_timestamp, seller_id
 */
export const handleBoxListed = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    const userId = getEventArgAsString(event, 'userId')
    const acceptedToken = getEventArgAsString(event, 'acceptedToken')

    if (!boxId || !userId) return

    const timestamp = extractTimestamp(event)

    const updates = sanitizeForDb({
        seller_id: userId,
        listed_timestamp: timestamp,
    }) as Database['public']['Tables']['boxes']['Update']

    if (acceptedToken) {
        updates.accepted_token = acceptedToken.toLowerCase()
    }

    const { error } = await db
        .from('boxes')
        .update(updates)
        .match({ network: scope.network as 'testnet' | 'mainnet', layer: scope.layer as 'sapphire', id: boxId })

    if (error) {
        console.warn(`⚠️  Failed to update box ${boxId} for BoxListed:`, error.message)
    } else {
        console.log(`✅ Box ${boxId} updated listed_mode: ${updates.listed_mode}, accepted_token: ${updates.accepted_token}, listed_timestamp: ${updates.listed_timestamp}, seller_id: ${updates.seller_id}`)
    }
}

/**
 * Handle BoxPurchased event
 * Update boxes table: buyer_id, purchase_timestamp
 */
const _updateBuyerPurchaseTimestamp = async (
    scope: RuntimeScope,
    boxId: string,
    userId: string,
    timestamp: string,
): Promise<void> => {
    const updates = sanitizeForDb({
        buyer_id: userId,
        purchase_timestamp: timestamp,
    }) as Database['public']['Tables']['boxes']['Update']

    const { error } = await db
        .from('boxes')
        .update(updates)
        .match({ network: scope.network as 'testnet' | 'mainnet', layer: scope.layer as 'sapphire', id: boxId })

    if (error) {
        console.warn(`⚠️  Failed to update box ${boxId} buyer_id: ${userId} and purchase_timestamp: ${timestamp}`, error.message)
    } else {
        console.log(`✅ Box ${boxId} updated buyer_id: ${userId} and purchase_timestamp: ${timestamp}`)
    }
}

export const handleBoxPurchased = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    const userId = getEventArgAsString(event, 'userId')

    if (!boxId || !userId) return

    const timestamp = extractTimestamp(event)

    _updateBuyerPurchaseTimestamp(scope, boxId, userId, timestamp)
}

/**
 * Handle BidPlaced event
 * Insert into box_bidders table
 * Note: Primary key of box_bidders table is (network, layer, id, bidder_id)
 * Multiple bids from the same bidder for the same box will only keep one record
 * Note: Assumes box already exists (created by TruthBox contract events), if not exists will be handled by database foreign key constraint
 */
export const handleBidPlaced = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    const timestamp = extractTimestamp(event)
    const userId = getEventArgAsString(event, 'userId')

    // Only skip if boxId or userId is undefined (0 is a valid value)
    if (boxId === undefined || userId === undefined) {
        console.warn(`⚠️  BidPlaced event missing boxId or userId:`, { boxId, userId })
        return
    }
    _updateBuyerPurchaseTimestamp(scope, boxId, userId, timestamp)

    const boxBidderId = `${boxId}-${userId}`
    
    // Use upsert to handle duplicate bids (ignore on primary key conflict)
    // Note: id and bidder_id need to be string-formatted numbers (PostgreSQL NUMERIC type)
    // Note: Assumes box already exists (created by TruthBox contract events), if not exists will be handled by database foreign key constraint
    const bidderData = sanitizeForDb({
        network: scope.network as 'testnet' | 'mainnet',
        layer: scope.layer as 'sapphire',
        id: boxBidderId,
        box_id: boxId,
        bidder_id: userId,
    }) as Database['public']['Tables']['box_bidders']['Insert']

    // First insert bidder record
    const { error: bidderError } = await db
        .from('box_bidders')
        .upsert(bidderData, {
            onConflict: 'network,layer,id',
        })

    if (bidderError) {
        console.error(`❌ Failed to upsert bidder ${userId} for box ${boxId}:`, bidderError.message)
    } else {
        console.log(`✅ Bidder ${userId} upserted for box ${boxId}`)
    }

}

/**
 * Handle CompleterAssigned event
 * Update boxes table: completer_id, complete_timestamp
 */
export const handleCompleterAssigned = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    const userId = getEventArgAsString(event, 'userId')

    if (!boxId || !userId) return

    const timestamp = extractTimestamp(event)

    const updates = sanitizeForDb({
        completer_id: userId,
        complete_timestamp: timestamp,
    }) as Database['public']['Tables']['boxes']['Update']

    const { error } = await db
        .from('boxes')
        .update(updates)
        .match({ network: scope.network as 'testnet' | 'mainnet', layer: scope.layer as 'sapphire', id: boxId })

    if (error) {
        console.warn(`⚠️  Failed to update box ${boxId} for CompleterAssigned:`, error.message)
    } else {
        console.log(`✅ Box ${boxId} updated completer_id: ${userId} and complete_timestamp: ${timestamp}`)
    }
}

/**
 * Handle RequestDeadlineChanged event
 * Update boxes table: request_refund_deadline
 */
export const handleRequestDeadlineChanged = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    const deadline = getEventArgAsString(event, 'deadline')

    if (!boxId || !deadline) return

    const updates = sanitizeForDb({
        request_refund_deadline: deadline,
    }) as Database['public']['Tables']['boxes']['Update']

    const { error } = await db
        .from('boxes')
        .update(updates)
        .match({ network: scope.network as 'testnet' | 'mainnet', layer: scope.layer as 'sapphire', id: boxId })

    if (error) {
        console.warn(`⚠️  Failed to update box ${boxId} for RequestDeadlineChanged:`, error.message)
    } else {
        console.log(`✅ Box ${boxId} updated request_refund_deadline: ${deadline}`)
    }
}

/**
 * Handle ReviewDeadlineChanged event
 * Update boxes table: review_deadline
 */
export const handleReviewDeadlineChanged = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    const deadline = getEventArgAsString(event, 'deadline')

    if (!boxId || !deadline) return

    const updates = sanitizeForDb({
        review_deadline: deadline,
    }) as Database['public']['Tables']['boxes']['Update']

    const { error } = await db
        .from('boxes')
        .update(updates)
        .match({ network: scope.network as 'testnet' | 'mainnet', layer: scope.layer as 'sapphire', id: boxId })

    if (error) {
        console.warn(`⚠️  Failed to update box ${boxId} for ReviewDeadlineChanged:`, error.message)
    } else {
        console.log(`✅ Box ${boxId} updated review_deadline: ${deadline}`)
    }
}

/**
 * Handle RefundPermitChanged event
 * Update boxes table: refund_permit
 */
export const handleRefundPermitChanged = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    if (!boxId) return

    // permission is a boolean value, get directly from event args
    const permissionRaw = (event.args as Record<string, unknown>)?.permission
    const permission = getBoolean(permissionRaw, boxId)

    const updates = sanitizeForDb({
        refund_permit: permission,
    }) as Database['public']['Tables']['boxes']['Update']

    const { error } = await db
        .from('boxes')
        .update(updates)
        .match({ network: scope.network as 'testnet' | 'mainnet', layer: scope.layer as 'sapphire', id: boxId })

    if (error) {
        console.warn(`⚠️  Failed to update box ${boxId} for RefundPermitChanged:`, error.message)
    } else {
        console.log(`✅ Box ${boxId} updated refund_permit: ${permission}`)
    }
}

/**
 * Process Exchange contract events and write to Supabase
 * Internal Priority (per rules.md):
 * 1. BoxListed
 * 2. BoxPurchased, BidPlaced
 * 3. Others (CompleterAssigned, RequestDeadlineChanged, ReviewDeadlineChanged, RefundPermitChanged)
 */
export const persistExchangeSync = async (
    scope: RuntimeScope,
    contract: ContractName,
    events: DecodedRuntimeEvent<any>[],
): Promise<void> => {
    if (!isDbConfigured()) {
        console.warn('⚠️  Database URL / secret not configured, skipping database write')
        return
    }

    if (contract !== ContractName.EXCHANGE) return 

    // ✅ First ensure users records exist (process userId from all events)
    await ensureUserIdExist(scope, events)


    const getPriority = (eventName: ExchangeEventType): number => {
        if (eventName === 'BoxListed') return 1
        if (eventName === 'BoxPurchased' || eventName === 'BidPlaced') return 2
        return 3
    }

    const sortedEvents = events.sort((a, b) => {
        const eventNameA = a.eventName as ExchangeEventType
        const eventNameB = b.eventName as ExchangeEventType
        const priorityA = getPriority(eventNameA)
        const priorityB = getPriority(eventNameB)
        return priorityA - priorityB
    })

    console.log(`📝 Processing Exchange events with priority sorting...`)

    for (const event of sortedEvents) {
        const eventName = event.eventName as ExchangeEventType
        switch (eventName) {
            case 'BoxListed':
                await handleBoxListed(scope, event)
                break
            case 'BoxPurchased':
                await handleBoxPurchased(scope, event)
                break
            case 'BidPlaced':
                await handleBidPlaced(scope, event)
                break
            case 'CompleterAssigned':
                await handleCompleterAssigned(scope, event)
                break
            case 'RequestDeadlineChanged':
                await handleRequestDeadlineChanged(scope, event)
                break
            case 'ArbitrationDeadineChanged':
                await handleReviewDeadlineChanged(scope, event)
                break
            case 'RefundPermitChanged':
                await handleRefundPermitChanged(scope, event)
                break
        }
    }
}

