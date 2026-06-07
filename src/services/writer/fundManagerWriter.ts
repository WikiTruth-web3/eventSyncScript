// src/services/supabase/fundManagerWriter.ts
// import type { RuntimeContractSyncResult } from '../../core/sync/runtimeContractSyncer'
import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { ContractName } from '../../contractsConfig/types'
import { isSupabaseConfigured } from '../../config/supabase'
import { ensureUserIdExist } from './ensureUsersId'
import { getSupabaseClient } from '../../config/supabase'
import { getEventArgAsString, sanitizeForSupabase } from '../../utils/getEventArgs'
import { getEventArg } from '../../utils/eventArgs'
import { normalizeHash } from '../../utils/eventArgs'
import type { DecodedRuntimeEvent } from '../../oasisQuery/app/services/events'
import type { FundManagerEventType } from '../../contractsConfig/eventSignatures/eventType'
import { extractTimestamp } from '../../utils/extractTimestamp'
import { generateRecordId } from '../../utils/generateId'

/**
 * Convert transaction hash to BYTEA
 */
const hashToBytea = (hash: string): Uint8Array => {
    // Remove 0x prefix
    const hex = hash.startsWith('0x') ? hash.slice(2) : hash
    // Convert to Uint8Array
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
    }
    return bytes
}

/**
 * Handle OrderAmountPaid event
 * Insert into payments table
 */
export const handlePayment = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    const userId = getEventArgAsString(event, 'userId')
    const token = getEventArgAsString(event, 'token')
    const amount = getEventArgAsString(event, 'amount')

    if (!boxId || !userId || !token || !amount) return

    const supabase = getSupabaseClient()
    const timestamp = extractTimestamp(event)
    const recordId = generateRecordId(event)
    const txHash = normalizeHash(event.raw.tx_hash ?? event.raw.eth_tx_hash)
    const blockNumber = event.raw.round ?? 0

    if (!txHash) return

    const paymentData = sanitizeForSupabase({
        network: scope.network,
        layer: scope.layer,
        id: recordId,
        box_id: boxId,
        user_id: userId,
        token: token.toLowerCase(),
        amount: amount,
        timestamp: timestamp,
        transaction_hash: hashToBytea(txHash),
        block_number: String(blockNumber),
    }) as Record<string, unknown>

    const { error } = await supabase
        .from('payments')
        .upsert(paymentData, {
            onConflict: 'network,layer,id'
        })

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
    event: DecodedRuntimeEvent<Record<string, unknown>>,
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

    const supabase = getSupabaseClient()
    const timestamp = extractTimestamp(event)
    const recordId = generateRecordId(event)
    const txHash = normalizeHash(event.raw.tx_hash ?? event.raw.eth_tx_hash)
    const blockNumber = event.raw.round ?? 0

    if (!txHash) return

    const withdrawData = sanitizeForSupabase({
        network: scope.network,
        layer: scope.layer,
        id: recordId,
        token: token.toLowerCase(),
        box_list: boxList,
        user_id: userId,
        amount: amount,
        timestamp: timestamp,
        transaction_hash: hashToBytea(txHash),
        block_number: String(blockNumber),
    }) as Record<string, unknown>

    const { error } = await supabase
        .from('withdraws')
        .upsert(withdrawData, {
            onConflict: 'network,layer,id'
        })

    if (error) {
        console.error(`❌ Failed to insert withdraw for user ${userId} :`, error.message)
        console.error(`   Error info:`, JSON.stringify(error, null, 2))
    } else {
        console.log(`✅ Inserted withdraw for user ${userId} `)
    }
}

export const handleRefundAmountWithdraw = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
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

    const supabase = getSupabaseClient()
    const timestamp = extractTimestamp(event)
    const recordId = generateRecordId(event)
    const txHash = normalizeHash(event.raw.tx_hash ?? event.raw.eth_tx_hash)
    const blockNumber = event.raw.round ?? 0

    if (!txHash) return

    const withdrawData = sanitizeForSupabase({
        network: scope.network,
        layer: scope.layer,
        id: recordId,
        token: token.toLowerCase(),
        box_list: boxList,
        user_id: userId,
        amount: amount,
        timestamp: timestamp,
        transaction_hash: hashToBytea(txHash),
        block_number: String(blockNumber),
    }) as Record<string, unknown>

    const { error } = await supabase
        .from('withdraws')
        .upsert(withdrawData, {
            onConflict: 'network,layer,id'
        })

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
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    const token = getEventArgAsString(event, 'token')
    const amount = getEventArgAsString(event, 'amount')
    const rewardTypeRaw = getEventArg<unknown>(event, 'rewardType')

    if (!boxId || !token || !amount || rewardTypeRaw === undefined) return

    const rewardTypeNum = typeof rewardTypeRaw === 'bigint' ? Number(rewardTypeRaw) : Number(rewardTypeRaw)
    console.log ('reward_uint8:',rewardTypeNum)
    const rewardTypeMap: Record<number, 'Minter' | 'Seller' | 'Completer' | 'Total'> = {
        0: 'Minter',
        1: 'Seller',
        2: 'Completer',
        3: 'Total',
    }
    let rewardType
    if (rewardTypeNum === 0) {
        rewardType = 'Minter'
    } else {
        rewardType = rewardTypeMap[rewardTypeNum] || 'Total'
    }

    const supabase = getSupabaseClient()
    const timestamp = extractTimestamp(event)
    const recordId = generateRecordId(event)
    const txHash = normalizeHash(event.raw.tx_hash ?? event.raw.eth_tx_hash)
    const blockNumber = event.raw.round ?? 0

    if (!txHash) return

    const rewardData = sanitizeForSupabase({
        network: scope.network,
        layer: scope.layer,
        id: recordId,
        box_id: boxId,
        token: token.toLowerCase(),
        amount: amount,
        reward_type: rewardType,
        timestamp: timestamp,
        transaction_hash: hashToBytea(txHash),
        block_number: String(blockNumber),
    }) as Record<string, unknown>

    const { error } = await supabase
        .from('rewards_addeds')
        .upsert(rewardData, {
            onConflict: 'network,layer,id'
        })

    if (error) {
        console.error(`❌ Failed to insert reward for box ${boxId} (${rewardType}):`, error.message)
        console.error(`   Error info:`, JSON.stringify(error, null, 2))
    } else {
        console.log(`✅ Inserted reward for box ${boxId} (${rewardType})`)
    }
}


/**
 * Handle RewardsWithdraw event
 * Insert into withdraws table (withdraw_type: 'Reward')
 */
export const handleRewardsWithdraw = async (
    scope: RuntimeScope,
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const userId = getEventArgAsString(event, 'userId')
    const token = getEventArgAsString(event, 'token')
    const amount = getEventArgAsString(event, 'amount')

    if (!userId || !token || !amount) return

    const supabase = getSupabaseClient()
    const timestamp = extractTimestamp(event)
    const recordId = generateRecordId(event)
    const txHash = normalizeHash(event.raw.tx_hash ?? event.raw.eth_tx_hash)
    const blockNumber = event.raw.round ?? 0

    if (!txHash) return

    const withdrawData = sanitizeForSupabase({
        network: scope.network,
        layer: scope.layer,
        id: recordId,
        token: token.toLowerCase(),
        box_list: [], 
        user_id: userId,
        amount: amount,
        timestamp: timestamp,
        withdraw_type: 'Reward',
        transaction_hash: hashToBytea(txHash),
        block_number: String(blockNumber),
    }) as Record<string, unknown>

    const { error } = await supabase
        .from('withdraws')
        .upsert(withdrawData, {
            onConflict: 'network,layer,id'
        })

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
    event: DecodedRuntimeEvent<Record<string, unknown>>,
): Promise<void> => {
    const supabase = getSupabaseClient()
    const isPaused = event.eventName === 'Paused'

    const { error } = await supabase
        .from('fund_manager_state')
        .upsert({
            network: scope.network,
            layer: scope.layer,
            id: 'fundManager',
            paused: isPaused,
        }, {
            onConflict: 'network,layer,id',
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
    const supabase = getSupabaseClient()
    
    const { error } = await supabase
        .from('fund_manager_state')
        .upsert(
            {
                network: scope.network,
                layer: scope.layer,
                id: 'fundManager',
            },
            {
                onConflict: 'network,layer,id',
            }
        )

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
    events: DecodedRuntimeEvent<any>[],
): Promise<void> => {
    if (!isSupabaseConfigured()) {
        console.warn('⚠️  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured, skipping database write')
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
        const eventNameA = a.eventName as FundManagerEventType
        const eventNameB = b.eventName as FundManagerEventType
        const priorityA = getPriority(eventNameA)
        const priorityB = getPriority(eventNameB)
        return priorityA - priorityB
    })

    console.log(`📝 Processing FundManager events with priority sorting...`)

    for (const event of sortedEvents) {
        const eventName = event.eventName as FundManagerEventType
        switch (eventName) {
            case 'Payment':
                await handlePayment(scope, event)
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

