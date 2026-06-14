// src/services/supabase/boxesWriter.ts
import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { ContractName } from '../../contractsConfig/types'
import { supabase } from '../../config/supabase.config'
import * as DBTypes from '../../types/dataBase';
import { ensureUserIdExist } from './ensureUsersId'
import { getEventArgAsString, DecodedContractEvent } from '../../utils/getContractsEventArgs'
import type { RuntimeEvent } from '../../oasisQuery/oasis-nexus/api'
import type { BlindBoxEventType } from '../../contractsConfig/eventSignatures/eventType'
import { timestampToNumber } from '../../utils/timestampToNumber'
import { upsertMetadataFromEvents } from './metadataWriter'
import { CONTROLLER } from '../../controller'

/**
 * Handle BoxCreated event, create boxes record
 * Supports old contract (two parameters) and new contract (three parameters, includes boxInfoCID)
 * Use upsert to avoid duplicate key errors (update if box already exists)
 */
export const handleBoxCreated = async (
    scope: RuntimeScope,
    event: DecodedContractEvent<ContractName.BLIND_BOX, 'BoxCreated'>,
) => {
    // Use common utility to safely extract event parameters (correctly handle 0 values)
    const boxId = getEventArgAsString(event, 'boxId')
    const userId = getEventArgAsString(event, 'userId')
    const boxInfoCID = getEventArgAsString(event, 'boxInfoCID') // New contract includes this parameter

    // Only skip if boxId or userId is undefined (0 is a valid value)
    if (boxId === undefined || userId === undefined) return

    // Create new box record
    // Note: token_id needs to be string-formatted number, cannot use BigInt (cannot serialize)
    // Note: According to supabase.config.ts, box_info_cid is a required field (can be null)
    const boxData: DBTypes.Box = {
        id: boxId,
        token_id: boxId, // PostgreSQL BIGINT can accept string-formatted numbers
        minter_id: userId,
        status: 0, // 0=Storing, 1=Selling, 2=Auctioning, 3=Paid, 4=Refunding, 5=Delaying, 6=Published, 7=Blacklisted
        listed_mode: null, // NULL=Not Listed, 1=Selling, 2=Auctioning
        price: '0',
        deadline: 0,
        create_timestamp: timestampToNumber(event.timestamp), // safely convert to seconds
        box_info_cid: null, // Required field, defaults to null
    }

    // If new contract's BoxCreated event contains boxInfoCID, also save it
    if (boxInfoCID) {
        // Sanitize CID (remove ipfs:// prefix)
        const sanitizedCid = boxInfoCID.replace(/^ipfs:\/\//, '')
        boxData.box_info_cid = sanitizedCid
    }

    // Use upsert to avoid duplicate key errors (update if box exists, otherwise insert)
    const { error } = await (supabase.from('boxes') as any)
        .upsert(boxData)

    if (error) {
        console.warn(`⚠️  Failed to upsert box ${boxId}:`, error.message)
    } else {
        console.log(`✅ Upserted box ${boxId}`)
    }

    if (
        CONTROLLER.queryList.includes('metadataBox') && 
        CONTROLLER.writeToDatabase
    ) {
        // write metadata
        if (boxInfoCID) {
            // get metadata from ipfs
            await upsertMetadataFromEvents(scope, boxId, boxInfoCID)
        }
    }
}

/**
 * Handle BoxStatusChanged event, update box status and listed_mode
 */
export const handleBoxStatusChanged = async (
    scope: RuntimeScope,
    event: DecodedContractEvent<ContractName.BLIND_BOX, 'BoxStatusChanged'>,
) => {
    const boxId = getEventArgAsString(event, 'boxId')
    if (!boxId) return

    const statusRaw = getEventArgAsString(event, 'status')
    if (statusRaw === undefined || statusRaw === null || statusRaw === '') return

    const status = Number(statusRaw)
    const updates: DBTypes.Box = {
        status
    }
    
    // Update listed_mode based on status: NULL=Not Listed, 1=Selling, 2=Auctioning
    if (status === 1 || status === 2) {
        updates.listed_mode = status
    } else if (status === 6) {
        updates.publish_timestamp = timestampToNumber(event.timestamp)
    }

    const { error } = await (supabase.from('boxes') as any)
        .update(updates)
        .eq('id', boxId)

    if (error) {
        console.warn(`⚠️  Failed to update box ${boxId} (BoxStatusChanged):`, error.message)
    } else {
        console.log(`✅ Updated box ${boxId} (BoxStatusChanged) status to ${status}`)
    }
}

/**
 * Handle PriceChanged event, update box price
 */
export const handlePriceChanged = async (
    scope: RuntimeScope,
    event: DecodedContractEvent<ContractName.BLIND_BOX, 'PriceChanged'>,
) => {
    const boxId = getEventArgAsString(event, 'boxId')
    if (!boxId) return

    const price = getEventArgAsString(event, 'price')
    if (price === undefined || price === '') return

    const updates: DBTypes.Box = {
        price
    }

    const { error } = await (supabase.from('boxes') as any)
        .update(updates)
        .eq('id', boxId)

    if (error) {
        console.warn(`⚠️  Failed to update box ${boxId} (PriceChanged):`, error.message)
    } else {
        console.log(`✅ Updated box ${boxId} (PriceChanged) price to ${price}`)
    }
}

/**
 * Handle DeadlineChanged event, update box deadline
 */
export const handleDeadlineChanged = async (
    scope: RuntimeScope,
    event: DecodedContractEvent<ContractName.BLIND_BOX, 'DeadlineChanged'>,
) => {
    const boxId = getEventArgAsString(event, 'boxId')
    if (!boxId) return

    const deadline = getEventArgAsString(event, 'deadline')
    if (deadline === undefined || deadline === '') {
        console.warn(`⚠️  DeadlineChanged event for box ${boxId} has undefined deadline`)
        return
    }

    const updates: DBTypes.Box = {
        deadline: Number(deadline)
    }

    const { error } = await (supabase.from('boxes') as any)
        .update(updates)
        .eq('id', boxId)

    if (error) {
        console.warn(`⚠️  Failed to update box ${boxId} (DeadlineChanged):`, error.message)
    } else {
        console.log(`✅ Updated box ${boxId} (DeadlineChanged) deadline to ${updates.deadline}`)
    }
}

/**
 * Process BlindBox contract events and write to Supabase
 * Internal Priority (per rules.md):
 * 1. BoxCreated (absolutely prioritized first)
 * 2. Others
 * 3. BoxStatusChanged
 */
export const persistBlindBoxSync = async (
    scope: RuntimeScope,
    contract: ContractName,
    events: RuntimeEvent[],
): Promise<void> => {
    if (contract !== ContractName.BLIND_BOX) return

    // 1. Ensure all relevant users exist first (optional but good practice)
    await ensureUserIdExist(scope, events as any)

    // 2. Separate BoxCreated events from other events
    const boxCreatedEvents = events.filter(event => event.evm_log_name === 'BoxCreated')
    const otherEvents = events.filter(event => event.evm_log_name !== 'BoxCreated')

    // 3. Process all BoxCreated events first to resolve dependency
    if (boxCreatedEvents.length > 0) {
        console.log(`📝 Processing ${boxCreatedEvents.length} BoxCreated events first...`)
        for (const event of boxCreatedEvents) {
            await handleBoxCreated(scope, event as DecodedContractEvent<ContractName.BLIND_BOX, 'BoxCreated'>)
        }
    }

    // 4. Sort and process other update events
    if (otherEvents.length > 0) {
        const getPriority = (eventName: BlindBoxEventType): number => {
            if (eventName === 'BoxStatusChanged') return 2 // run status changes last
            return 1 // run price/deadline changes first
        }

        const sortedOtherEvents = otherEvents.sort((a, b) => {
            const eventNameA = a.evm_log_name as BlindBoxEventType
            const eventNameB = b.evm_log_name as BlindBoxEventType
            const priorityA = getPriority(eventNameA)
            const priorityB = getPriority(eventNameB)
            return priorityA - priorityB
        })

        console.log(`📝 Processing ${sortedOtherEvents.length} other BlindBox update events...`)
        for (const event of sortedOtherEvents) {
            const eventName = event.evm_log_name
            switch (eventName) {
                case 'BoxStatusChanged':
                    await handleBoxStatusChanged(scope, event as DecodedContractEvent<ContractName.BLIND_BOX, 'BoxStatusChanged'>)
                    break
                case 'PriceChanged':
                    await handlePriceChanged(scope, event as DecodedContractEvent<ContractName.BLIND_BOX, 'PriceChanged'>)
                    break
                case 'DeadlineChanged':
                    await handleDeadlineChanged(scope, event as DecodedContractEvent<ContractName.BLIND_BOX, 'DeadlineChanged'>)
                    break
                default:
                    console.warn(`⚠️  Unknown event name: ${eventName}`)
            }
        }
    }
}
