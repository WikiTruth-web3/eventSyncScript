// src/services/supabase/boxesWriter.ts
import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { ContractName } from '../../contractsConfig/types'
import { db } from '../../config/db.client'
import { Database } from '../../types/dataBase'
import { getEventArg } from '../../utils/eventArgs'
import { ensureUserIdExist } from './ensureUsersId'
import { sanitizeForDb } from '../../utils/bigInt'
import { getEventArgAsString, DecodedContractEvent } from '../../utils/getContractsEventArgs'
import type { RuntimeEvent } from '../../oasisQuery/oasis-nexus/api'

import type { BlindBoxEventType } from '../../contractsConfig/eventSignatures/eventType'
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
    const boxData: Database['boxes'] = {
        network: scope.network as 'testnet' | 'mainnet',
        layer: scope.layer as 'sapphire',
        id: boxId,
        token_id: boxId, // PostgreSQL BIGINT can accept string-formatted numbers
        minter_id: userId,
        status: 0, // 0=Storing, 1=Selling, 2=Auctioning, 3=Paid, 4=Refunding, 5=Delaying, 6=Published, 7=Blacklisted
        listed_mode: null, // NULL=Not Listed, 1=Selling, 2=Auctioning
        price: '0',
        deadline: '0',
        create_timestamp: event.timestamp, // Required field: creation timestamp
        box_info_cid: null, // Required field, defaults to null
    }

    // If new contract's BoxCreated event contains boxInfoCID, also save it
    if (boxInfoCID) {
        // Sanitize CID (remove ipfs:// prefix)
        const sanitizedCid = boxInfoCID.replace(/^ipfs:\/\//, '')
        boxData.box_info_cid = sanitizedCid
    }

    // Sanitize entire object to ensure no BigInt
    const sanitizedBoxData = sanitizeForDb(boxData) as Database['public']['Tables']['boxes']['Insert']
    
    // Use upsert to avoid duplicate key errors (update if box exists, otherwise insert)
    const { error } = await db.upsert('boxes', sanitizedBoxData)

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
 * Handle other events, update boxes record
 */
export const handleBoxUpdate = async (
    scope: RuntimeScope,
    event: RuntimeEvent,
) => {

    // Use common utility to safely extract event parameters (correctly handle 0 values)
    const boxId = getEventArgAsString(event, 'boxId')
    if (!boxId) return

    const updates: Database['public']['Tables']['boxes']['Update'] = {}

    switch (event.evm_log_name) {
        case 'BoxStatusChanged':
            const statusRaw = getEventArg<unknown>(event, 'status')
            if (statusRaw !== undefined && statusRaw !== null) {
                const status = typeof statusRaw === 'bigint' ? Number(statusRaw) : Number(statusRaw)
                updates.status = status
                
                // Update listed_mode based on status: NULL=Not Listed, 1=Selling, 2=Auctioning
                if (status === 1 || status === 2) {
                    updates.listed_mode = status
                } else if (status === 6) {
                    updates.publish_timestamp = event.timestamp
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

        // ... others
    }

    // Sanitize update object to ensure no BigInt
    const sanitizedUpdates = sanitizeForDb(updates) as Database['public']['Tables']['boxes']['Update']
    const { error } = await db.update('boxes', sanitizedUpdates, {
        network: scope.network as 'testnet' | 'mainnet',
        layer: scope.layer as 'sapphire',
        id: boxId
    })

    if (error) {
        console.warn(`⚠️  Failed to update box ${boxId} (${event.evm_log_name}):`, error.message)
    } else {
        console.log(`✅ Updated box ${boxId} (${event.evm_log_name})`)
    }
}

/**
 * Process BlindBox contract events and write to Supabase
 * Internal Priority (per rules.md):
 * 1. BoxCreated
 * 2. Others
 * 3. BoxStatusChanged
 * 
 * Events with same priority are processed in chronological order.
 */
export const persistBlindBoxSync = async (
    scope: RuntimeScope,
    contract: ContractName,
    events: RuntimeEvent[],
): Promise<void> => {
    if (contract !== ContractName.BLIND_BOX) return

    // 1. Ensure all relevant users exist first (optional but good practice)
    await ensureUserIdExist(scope, events)
    
    // Sort events by priority then by chronological order (implied by reverse() above)
    const getPriority = (eventName: BlindBoxEventType): number => {
        if (eventName === 'BoxCreated') return 1
        if (eventName === 'BoxStatusChanged') return 3
        return 2
    }

    const sortedEvents = events.sort((a, b) => {
        const eventNameA = a.evm_log_name as BlindBoxEventType
        const eventNameB = b.evm_log_name as BlindBoxEventType
        const priorityA = getPriority(eventNameA)
        const priorityB = getPriority(eventNameB)
        if (priorityA !== priorityB) {
            return priorityA - priorityB
        }
        return 0 
    })

    console.log(`📝 Processing BlindBox events with priority sorting...`)

    for (const event of sortedEvents) {
        const eventName = event.evm_log_name as BlindBoxEventType
        if (eventName === 'BoxCreated') {
            await handleBoxCreated(scope, event as any)
        } else {
            await handleBoxUpdate(scope, event)
        }
    }
}

