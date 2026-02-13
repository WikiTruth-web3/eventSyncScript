// src/services/supabase/boxesWriter.ts
import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { ContractName } from '../../contractsConfig/types' // Need to import value, not just type
import { getSupabaseClient } from '../../config/supabase'
import { getEventArg } from '../../utils/eventArgs'
import { ensureUserIdExist } from './ensureUsersId'
import { sanitizeForSupabase, getEventArgAsString, hasEventArg } from '../../utils/getEventArgs'
import type { DecodedRuntimeEvent } from '../../oasisQuery/app/services/events'
import { extractTimestamp } from '../../utils/extractTimestamp'
import { upsertMetadataFromEvents } from './metadataWriter'
import { CONTROLLER } from '../../controller'
import { fixEventErrorParam_BoxCreated } from '../../utils/fixEventsErrorParam'

/**
 * Handle BoxCreated event, create boxes record
 * Supports old contract (two parameters) and new contract (three parameters, includes boxInfoCID)
 * Use upsert to avoid duplicate key errors (update if box already exists)
 */
export const handleBoxCreated = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
) => {


    // Use common utility to safely extract event parameters (correctly handle 0 values)
    const boxId = getEventArgAsString(event, 'boxId')
    const userId_orignal = getEventArgAsString(event, 'userId')
    const userId = fixEventErrorParam_BoxCreated(event, 'userId', userId_orignal || '')
    const boxInfoCID = getEventArgAsString(event, 'boxInfoCID') // New contract includes this parameter

    // Only skip if boxId or userId is undefined (0 is a valid value)
    if (boxId === undefined || userId === undefined) return

    const supabase = getSupabaseClient()

    // Extract timestamp from event
    const createTimestamp = extractTimestamp(event)

    // Create new box record
    // Note: token_id needs to be string-formatted number, cannot use BigInt (cannot serialize)
    // Note: According to supabase.config.ts, box_info_cid is a required field (can be null)
    const boxData: Record<string, unknown> = {
        network: scope.network,
        layer: scope.layer,
        id: boxId,
        token_id: boxId, // PostgreSQL BIGINT can accept string-formatted numbers
        minter_id: userId,
        owner_address: '0x0000000000000000000000000000000000000000', // Default value, will be updated via Transfer event
        status: 0, // 0=Storing, 1=Selling, 2=Auctioning, 3=Paid, 4=Refunding, 5=Delaying, 6=Published, 7=Blacklisted
        listed_mode: null, // NULL=Not Listed, 1=Selling, 2=Auctioning
        price: '0',
        deadline: '0',
        create_timestamp: createTimestamp, // Required field: creation timestamp
        box_info_cid: null, // Required field, defaults to null
    }

    // If new contract's BoxCreated event contains boxInfoCID, also save it
    if (boxInfoCID) {
        // Sanitize CID (remove ipfs:// prefix)
        const sanitizedCid = boxInfoCID.replace(/^ipfs:\/\//, '')
        boxData.box_info_cid = sanitizedCid
    }

    // Sanitize entire object to ensure no BigInt
    const sanitizedBoxData = sanitizeForSupabase(boxData) as Record<string, unknown>
    
    // Use upsert to avoid duplicate key errors (update if box exists, otherwise insert)
    const { error } = await supabase
        .from('boxes')
        .upsert(sanitizedBoxData, {
            onConflict: 'network,layer,id', // Handle primary key conflict
        })

    if (error) {
        console.warn(`⚠️  Failed to upsert box ${boxId}:`, error.message)
    } else {
        console.log(`✅ Upserted box ${boxId}`)
    }

    if (
        CONTROLLER.writeList.includes('metadataBox') && 
        CONTROLLER.writeToSupabase
    ) {
        // write metadata
        if (boxInfoCID) {
            // get metadata from ipfs
            const blockHeight = event.raw.round ?? 0
            await upsertMetadataFromEvents(scope, boxId, boxInfoCID, blockHeight)
        }
    }

    
}

// export const handleBoxStatusChanged = async (
//     scope: RuntimeScope,
//     event: DecodedRuntimeEvent<Record<string, unknown>>,
// ) => {
    
// }

/**
 * Handle other events, update boxes record
 */
export const handleBoxUpdate = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
) => {

    // Use common utility to safely extract event parameters (correctly handle 0 values)
    const boxId = getEventArgAsString(event, 'boxId')
    if (!boxId) return

    const supabase = getSupabaseClient()
    const updates: Record<string, unknown> = {}

    switch (event.eventName) {
        case 'BoxStatusChanged':
            const statusRaw = getEventArg<unknown>(event, 'status')
            if (statusRaw !== undefined && statusRaw !== null) {
                const status = typeof statusRaw === 'bigint' ? Number(statusRaw) : Number(statusRaw)
                updates.status = status
                
                // Update listed_mode based on status: NULL=Not Listed, 1=Selling, 2=Auctioning
                if (status === 1 || status === 2) {
                    updates.listed_mode = status
                } else if (status === 6) {
                    updates.publish_timestamp = extractTimestamp(event)
                }
            }
            break

        case 'PriceChanged':
            const price = getEventArgAsString(event, 'price')
            if (price !== undefined) {
                updates.price = price
            }
            break

        case 'DeadlineChanged':
            const deadline = getEventArgAsString(event, 'deadline')
            if (deadline !== undefined) {
                updates.deadline = deadline
            } else {
                console.warn(`⚠️  DeadlineChanged event for box ${boxId} has undefined deadline`)
            }
            break

        case 'PrivateKeyPublished':
            const privateKey = getEventArgAsString(event, 'privateKey')
            const userId = getEventArgAsString(event, 'userId')
            if (privateKey !== undefined) {
                updates.private_key = privateKey
                updates.publisher_id = userId
            } else {
                console.warn(`⚠️  PrivateKeyPublished event for box ${boxId} has undefined privateKey`)
            }
            break

        // ... others
    }

    // Sanitize update object to ensure no BigInt
    const sanitizedUpdates = sanitizeForSupabase(updates) as Record<string, unknown>
    const { error } = await supabase
        .from('boxes')
        .update(sanitizedUpdates)
        .match({ network: scope.network, layer: scope.layer, id: boxId })

    if (error) {
        console.warn(`⚠️  Failed to update box ${boxId} (${event.eventName}):`, error.message)
    } else {
        console.log(`✅ Updated box ${boxId} (${event.eventName})`)
    }
}

/**
 * Process TruthBox contract events and write to Supabase
 * Internal Priority (per rules.md):
 * 1. BoxCreated
 * 2. Others
 * 3. BoxStatusChanged
 * 
 * Events with same priority are processed in chronological order.
 */
export const persistTruthBoxSync = async (
    scope: RuntimeScope,
    contract: ContractName,
    events: DecodedRuntimeEvent<any>[],
): Promise<void> => {
    if (contract !== ContractName.TRUTH_BOX) return

    // 1. Ensure all relevant users exist first (optional but good practice)
    await ensureUserIdExist(scope, events)
    
    // Sort events by priority then by chronological order (implied by reverse() above)
    const getPriority = (eventName: string): number => {
        if (eventName === 'BoxCreated') return 1
        if (eventName === 'BoxStatusChanged') return 3
        return 2
    }

    const sortedEvents = events.sort((a, b) => {
        const priorityA = getPriority(a.eventName)
        const priorityB = getPriority(b.eventName)
        if (priorityA !== priorityB) {
            return priorityA - priorityB
        }
        // If same priority, maintain chronological order (already sorted by reverse())
        // In a stable sort, we don't need to do anything here if they are already in order.
        // But since we want to be safe:
        return 0 
    })

    console.log(`📝 Processing TruthBox events with priority sorting...`)

    for (const event of sortedEvents) {
        if (event.eventName === 'BoxCreated') {
            await handleBoxCreated(scope, event)
        } else {
            await handleBoxUpdate(scope, event)
        }
    }
}
