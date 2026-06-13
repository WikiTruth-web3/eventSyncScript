// src/services/supabase/fundManagerWriter.ts
// import type { RuntimeContractSyncResult } from '../../core/sync/runtimeContractSyncer'
import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { ContractName } from '../../contractsConfig/types'
import { isDbConfigured, db } from '../../config/db.client'
import { ensureUserIdExist } from './ensureUsersId'
import { sanitizeForDb } from '../../utils/bigInt'
import { getEventArgAsString, DecodedContractEvent } from '../../utils/getContractsEventArgs'
import { getEventArg } from '../../utils/eventArgs'
import { normalizeHash } from '../../utils/eventArgs'
import type { RuntimeEvent } from '../../oasisQuery/oasis-nexus/api'

import type { FundManagerEventType } from '../../contractsConfig/eventSignatures/eventType'

import { Database } from '../../types/dataBase'

/**
 * Handle OrderAmountPaid event
 * Insert into payments table
 */
export const handlePayment = async (
    scope: RuntimeScope,
    event: DecodedContractEvent<ContractName.FUND_MANAGER , 'Payment'>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    const userId = getEventArgAsString(event, 'userId')
    const token = getEventArgAsString(event, 'token')
    const amount = getEventArgAsString(event, 'amount')

    if (!boxId || !userId || !token || !amount) return

    const timestamp = event.timestamp
    const recordId = generateRecordId(event)

    const paymentData = sanitizeForDb({ 
        network: scope.network as 'testnet' | 'mainnet',
        layer: scope.layer as 'sapphire',
        id: recordId,
        box_id: boxId,
        user_id: userId,
        token: token.toLowerCase(),
        amount: amount,
        type:'any',
        timestamp: timestamp,
        transaction_hash: event.eth_tx_hash,
    }) as Database['public']['Tables']['payments']['Insert']

    const { error } = await db.upsert('payments', paymentData)

    if (error) {
        console.error(`❌ Failed to insert payment for box ${boxId}:`, error.message)
        console.error(`   Error info:`, JSON.stringify(error, null, 2))
    } else {
        console.log(`✅ Inserted payment for box ${boxId}`)
    }
}

/**
 * Handle OrderAmountWithdraw event
 * Insert into withdraw table
 */
export const handleOrderAmountWithdraw = async (
    scope: RuntimeScope,
    event: RuntimeEvent,
): Promise<void> => {
    const listRaw = getEventArg<unknown>(event, 'list')
    const token = getEventArgAsString(event, 'token')
    const userId = getEventArgAsString(event, 'userId')
    const amount = getEventArgAsString(event, 'amount')


    if (!listRaw || !token || !userId || !amount ) return

    const boxList = Array.isArray(listRaw)
        ? listRaw.map(item => String(item))
        : [String(listRaw)]

    // fundsType is uint8，0 = Order, 1 = Refund

    const recordId = generateRecordId(event)

    const withdrawData = sanitizeForDb({
        network: scope.network as 'testnet' | 'mainnet',
        layer: scope.layer as 'sapphire',
        id: recordId,
        token: token.toLowerCase(),
        box_id_list: boxList,
        user_id: userId,
        amount: amount,
        timestamp: event.timestamp,
        transaction_hash: event.eth_tx_hash,
    }) as Database['public']['Tables']['order_refund_withdraws']['Insert']

    const { error } = await db.upsert('order_refund_withdraws', withdrawData)

    if (error) {
        console.error(`❌ Failed to insert withdraw for user ${userId} :`, error.message)
        console.error(`   Error info:`, JSON.stringify(error, null, 2))
    } else {
        console.log(`✅ Inserted withdraw for user ${userId} `)
    }
}

export const handleRefundAmountWithdraw = async (
    scope: RuntimeScope,
    event: RuntimeEvent,
): Promise<void> => {
    const listRaw = getEventArgAsString(event, 'list')
    const token = getEventArgAsString(event, 'token')
    const userId = getEventArgAsString(event, 'userId')
    const amount = getEventArgAsString(event, 'amount')


    if (!listRaw || !token || !userId || !amount ) return

    const boxList = Array.isArray(listRaw)
        ? listRaw.map(item => String(item))
        : [String(listRaw)]

    // fundsType is uint8，0 = Order, 1 = Refund


    const recordId = generateRecordId(event)

    const withdrawData = sanitizeForDb({
        network: scope.network as 'testnet' | 'mainnet',
        layer: scope.layer as 'sapphire',
        id: recordId,
        token: token.toLowerCase(),
        box_id_list: boxList,
        user_id: userId,
        amount: amount,
        timestamp: event.timestamp,
        transaction_hash: event.eth_tx_hash,
    }) as Database['public']['Tables']['order_refund_withdraws']['Insert']

    const { error } = await db.upsert('order_refund_withdraws', withdrawData)

    if (error) {
        console.error(`❌ Failed to insert withdraw for user ${userId} :`, error.message)
        console.error(`   Error info:`, JSON.stringify(error, null, 2))
    } else {
        console.log(`✅ Inserted withdraw for user ${userId} `)
    }
}
/**
 * Handle RewardsAdded event
 * Insert into rewards_addeds table
 */
export const handleRewardAdded = async (
    scope: RuntimeScope,
    event: RuntimeEvent,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    const token = getEventArgAsString(event, 'token')
    const amount = getEventArgAsString(event, 'amount')

    if (!boxId || !token || !amount || rewardTypeRaw === undefined) return

    const recordId = generateRecordId(event)

    const rewardData = sanitizeForDb({
        network: scope.network as 'testnet' | 'mainnet',
        layer: scope.layer as 'sapphire',
        id: recordId,
        box_id: boxId,
        token: token.toLowerCase(),
        amount: amount,
        timestamp: event.timestamp,
        transaction_hash: event.eth_tx_hash,
    }) as Database['public']['Tables']['rewards_addeds']['Insert']

    const { error } = await db.upsert('rewards_addeds', rewardData)

    if (error) {
        console.error(`❌ Failed to insert reward for box ${boxId} :`, error.message)
        console.error(`   Error info:`, JSON.stringify(error, null, 2))
    } else {
        console.log(`✅ Inserted reward for box ${boxId} `)
    }
}


/**
 * Handle RewardsWithdraw event
 * Insert into withdraws table (withdraw_type: 'Reward')
 */
export const handleRewardsWithdraw = async (
    scope: RuntimeScope,
    event: RuntimeEvent,
): Promise<void> => {
    const userId = getEventArgAsString(event, 'userId')
    const token = getEventArgAsString(event, 'token')
    const amount = getEventArgAsString(event, 'amount')

    if (!userId || !token || !amount) return


    const recordId = generateRecordId(event)

    const withdrawData = sanitizeForDb({
        network: scope.network as 'testnet' | 'mainnet',
        layer: scope.layer as 'sapphire',
        id: recordId,
        token: token.toLowerCase(),
        box_id_list: [], 
        user_id: userId,
        amount: amount,
        timestamp: event.timestamp,
        transaction_hash: event.eth_tx_hash,
    }) as Database['public']['Tables']['rewards_withdraws']['Insert']

    const { error } = await db.upsert('rewards_withdraws', withdrawData)

    if (error) {
        console.error(`❌ Failed to insert reward withdraw for user ${userId}:`, error.message)
    } else {
        console.log(`✅ Inserted reward withdraw for user ${userId}`)
    }
}

/**
 * Handle Paused / Unpaused events for FundManager
 * Update fund_manager_state table
 */
export const handleFundManagerState = async (
    scope: RuntimeScope,
    event: RuntimeEvent,
): Promise<void> => {
    const isPaused = event.evm_log_name === 'Paused'

    const { error } = await db.upsert('fund_manager_state', {
            network: scope.network as 'testnet' | 'mainnet',
            layer: scope.layer as 'sapphire',
            id: 'fundManager',
            paused: isPaused,
        })

    if (error) {
        console.warn(`⚠️  Failed to update fund_manager_state (paused=${isPaused}):`, error.message)
    } else {
        console.log(`✅ Updated fund_manager_state (paused=${isPaused})`)
    }
}

/**
 * Ensure fund_manager_state record exists
 * This is required by token_total_amounts table foreign key constraint
 */
export const ensureFundManagerStateExists = async (scope: RuntimeScope): Promise<void> => {
    const { error } = await db.upsert('fund_manager_state', {
                network: scope.network as 'testnet' | 'mainnet',
                layer: scope.layer as 'sapphire',
                id: 'fundManager',
            })

    if (error) {
        console.warn(`⚠️  Failed to ensure fund_manager_state exists:`, error.message)
    } else {
        console.log(`✅ Ensured fund_manager_state exists`)
    }
}

/**
 * Process FundManager contract events and write to Supabase
 */
export const persistFundManagerSync = async (
    scope: RuntimeScope,
    contract: ContractName,
    events: RuntimeEvent[],
): Promise<void> => {
    if (!isDbConfigured()) {
        console.warn('⚠️  Database URL / secret not configured, skipping database write')
        return
    }

    if (contract !== ContractName.FUND_MANAGER) return 

    // ✅ First ensure fund_manager_state record exists
    await ensureFundManagerStateExists(scope)

    // ✅ Then ensure users records exist
    await ensureUserIdExist(scope, events)

    const getPriority = (eventName: FundManagerEventType): number => {
        if (eventName === 'Payment') return 1
        if (eventName === 'RewardAdded') return 2
        return 3
    }

    const sortedEvents = events.sort((a, b) => {
        const eventNameA = a.evm_log_name as FundManagerEventType
        const eventNameB = b.evm_log_name as FundManagerEventType
        const priorityA = getPriority(eventNameA)
        const priorityB = getPriority(eventNameB)
        return priorityA - priorityB
    })

    console.log(`📝 Processing FundManager events with priority sorting...`)

    for (const event of sortedEvents) {
        const eventName = event.evm_log_name as FundManagerEventType
        switch (eventName) {
            case 'Payment':
                await handlePayment(scope, event as DecodedContractEvent<ContractName.FUND_MANAGER , 'Payment'>)
                break
            case 'RewardAdded':
                await handleRewardAdded(scope, event)
                break
            case 'OrderAmountWithdraw':
                await handleOrderAmountWithdraw(scope, event)
                break
            case 'RefundAmountWithdraw':
                await handleRefundAmountWithdraw(scope, event)
                break
            case 'RewardWithdraw':
                await handleRewardsWithdraw(scope, event)
                break
        }
    }
}


