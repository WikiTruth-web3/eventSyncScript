// src/services/supabase/exchangeWriter.ts
import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { ContractName } from '../../contractsConfig/types'
import { supabase } from '../../config/supabase.config'
import { ensureUserIdExist } from './ensureUsersId'
import { getEventArgAsString, getEventArgAsBoolean, DecodedContractEvent } from '../../utils/getContractsEventArgs'
import type { RuntimeEvent } from '../../oasisQuery/oasis-nexus/api'
import type { ExchangeEventType } from '../../contractsConfig/eventSignatures/eventType'
import { timestampToNumber } from '../../utils/timestampToNumber'
import * as DBTypes from '../../types/dataBase'

/**
 * Handle BoxListed event
 * Update boxes table: listed_mode, accepted_token, listed_timestamp, seller_id
 */
export const handleBoxListed = async (
    scope: RuntimeScope,
    event: DecodedContractEvent<ContractName.EXCHANGE, 'BoxListed'>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    const userId = getEventArgAsString(event, 'userId')
    const acceptedToken = getEventArgAsString(event, 'acceptedToken')

    if (!boxId || !userId) return

    const timestamp = timestampToNumber(event.timestamp)

    const updates: DBTypes.Box = {
        seller_id: userId,
        listed_timestamp: timestamp,
    }

    if (acceptedToken) {
        updates.accepted_token = acceptedToken.toLowerCase()
    }

    const { error } = await (supabase.from('boxes') as any)
        .update(updates)
        .eq('id', boxId)

    if (error) {
        console.warn(`⚠️  Failed to update box ${boxId} for BoxListed:`, error.message)
    } else {
        console.log(`Box ${boxId} updated seller_id: ${userId} and listed_timestamp: ${timestamp}`)
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
    timestamp: number,
): Promise<void> => {
    const updates: DBTypes.Box = {
        buyer_id: userId,
        purchase_timestamp: timestamp,
    }

    const { error } = await (supabase.from('boxes') as any)
        .update(updates)
        .eq('id', boxId)

    if (error) {
        console.warn(`⚠️  Failed to update box ${boxId} buyer_id: ${userId} and purchase_timestamp: ${timestamp}`, error.message)
    } else {
        console.log(`✅ Box ${boxId} updated buyer_id: ${userId} and purchase_timestamp: ${timestamp}`)
    }
}

export const handleBoxPurchased = async (
    scope: RuntimeScope,
    event: DecodedContractEvent<ContractName.EXCHANGE, 'BoxPurchased'>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    const userId = getEventArgAsString(event, 'userId')

    if (!boxId || !userId) return

    const timestamp = timestampToNumber(event.timestamp)

    await _updateBuyerPurchaseTimestamp(scope, boxId, userId, timestamp)
}

/**
 * Handle BidPlaced event
 * Insert into box_bidders table
 * Note: Primary key of box_bidders table is id (boxId-UserId)
 */
export const handleBidPlaced = async (
    scope: RuntimeScope,
    event: DecodedContractEvent<ContractName.EXCHANGE, 'BidPlaced'>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    const userId = getEventArgAsString(event, 'userId')

    // Only skip if boxId or userId is undefined (0 is a valid value)
    if (boxId === undefined || userId === undefined) {
        console.warn(`⚠️  BidPlaced event missing boxId or userId:`, { boxId, userId })
        return
    }
    const timestamp = timestampToNumber(event.timestamp)
    await _updateBuyerPurchaseTimestamp(scope, boxId, userId, timestamp)

    const boxBidderId = `${boxId}-${userId}`
    
    const bidderData: DBTypes.BoxBidder = {
        id: boxBidderId,
        box_id: boxId,
        bidder_id: userId,
    }

    // First insert bidder record
    const { error: bidderError } = await (supabase.from('box_bidders') as any)
        .upsert(bidderData)

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
    event: DecodedContractEvent<ContractName.EXCHANGE, 'CompleterAssigned'>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    const userId = getEventArgAsString(event, 'userId')

    if (!boxId || !userId) return

    const timestamp = timestampToNumber(event.timestamp)

    const updates: DBTypes.Box = {
        completer_id: userId,
        complete_timestamp: timestamp,
    }

    const { error } = await (supabase.from('boxes') as any)
        .update(updates)
        .eq('id', boxId)

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
    event: DecodedContractEvent<ContractName.EXCHANGE, 'RequestDeadlineChanged'>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    const deadline = getEventArgAsString(event, 'deadline')

    if (!boxId || !deadline) return

    const updates: DBTypes.Box = {
        request_refund_deadline: Number(deadline),
    }

    const { error } = await (supabase.from('boxes') as any)
        .update(updates)
        .eq('id', boxId)

    if (error) {
        console.warn(`⚠️  Failed to update box ${boxId} for RequestDeadlineChanged:`, error.message)
    } else {
        console.log(`✅ Box ${boxId} updated request_refund_deadline: ${deadline}`)
    }
}

/**
 * Handle ArbitrationDeadineChanged event (ReviewDeadlineChanged)
 * Update boxes table: arbitration_deadline
 */
export const handleReviewDeadlineChanged = async (
    scope: RuntimeScope,
    event: DecodedContractEvent<ContractName.EXCHANGE, 'ArbitrationDeadineChanged'>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    const deadline = getEventArgAsString(event, 'deadline')

    if (!boxId || !deadline) return

    const updates: DBTypes.Box = {
        arbitration_deadline: Number(deadline),
    }

    const { error } = await (supabase.from('boxes') as any)
        .update(updates)
        .eq('id', boxId)

    if (error) {
        console.warn(`⚠️  Failed to update box ${boxId} for ArbitrationDeadineChanged:`, error.message)
    } else {
        console.log(`✅ Box ${boxId} updated arbitration_deadline: ${deadline}`)
    }
}

/**
 * Handle RefundPermitChanged event
 * Update boxes table: refund_permit
 */
export const handleRefundPermitChanged = async (
    scope: RuntimeScope,
    event: DecodedContractEvent<ContractName.EXCHANGE, 'RefundPermitChanged'>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    if (!boxId) return

    const permission = getEventArgAsBoolean(event, 'permission')

    const updates: DBTypes.Box = {
        refund_permit: permission,
    }

    const { error } = await (supabase.from('boxes') as any)
        .update(updates)
        .eq('id', boxId)

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
 * 3. Others (CompleterAssigned, RequestDeadlineChanged, ArbitrationDeadineChanged, RefundPermitChanged)
 */
export const persistExchangeSync = async (
    scope: RuntimeScope,
    contract: ContractName,
    events: RuntimeEvent[],
): Promise<void> => {
    if (contract !== ContractName.EXCHANGE) return 

    // ✅ First ensure users records exist (process userId from all events)
    await ensureUserIdExist(scope, events)

    const getPriority = (eventName: ExchangeEventType): number => {
        if (eventName === 'BoxListed') return 1
        if (eventName === 'BoxPurchased' || eventName === 'BidPlaced') return 2
        return 3
    }

    const sortedEvents = events.sort((a, b) => {
        const eventNameA = a.evm_log_name as ExchangeEventType
        const eventNameB = b.evm_log_name as ExchangeEventType
        const priorityA = getPriority(eventNameA)
        const priorityB = getPriority(eventNameB)
        return priorityA - priorityB
    })

    console.log(`📝 Processing Exchange events with priority sorting...`)

    for (const event of sortedEvents) {
        const eventName = event.evm_log_name
        switch (eventName) {
            case 'BoxListed':
                await handleBoxListed(scope, event as DecodedContractEvent<ContractName.EXCHANGE, 'BoxListed'>)
                break
            case 'BoxPurchased':
                await handleBoxPurchased(scope, event as DecodedContractEvent<ContractName.EXCHANGE, 'BoxPurchased'>)
                break
            case 'BidPlaced':
                await handleBidPlaced(scope, event as DecodedContractEvent<ContractName.EXCHANGE, 'BidPlaced'>)
                break
            case 'CompleterAssigned':
                await handleCompleterAssigned(scope, event as DecodedContractEvent<ContractName.EXCHANGE, 'CompleterAssigned'>)
                break
            case 'RequestDeadlineChanged':
                await handleRequestDeadlineChanged(scope, event as DecodedContractEvent<ContractName.EXCHANGE, 'RequestDeadlineChanged'>)
                break
            case 'ArbitrationDeadineChanged':
                await handleReviewDeadlineChanged(scope, event as DecodedContractEvent<ContractName.EXCHANGE, 'ArbitrationDeadineChanged'>)
                break
            case 'RefundPermitChanged':
                await handleRefundPermitChanged(scope, event as DecodedContractEvent<ContractName.EXCHANGE, 'RefundPermitChanged'>)
                break
        }
    }
}
