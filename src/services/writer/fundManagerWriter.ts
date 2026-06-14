// src/services/supabase/fundManagerWriter.ts
import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { ContractName } from '../../contractsConfig/types'
import { supabase } from '../../config/supabase.config'
import { ensureUserIdExist } from './ensureUsersId'
import { getEventArgAsString, DecodedContractEvent } from '../../utils/getContractsEventArgs'
import type { RuntimeEvent } from '../../oasisQuery/oasis-nexus/api'
import type { FundManagerEventType } from '../../contractsConfig/eventSignatures/eventType'
import { timestampToNumber } from '../../utils/timestampToNumber'

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

    const timestamp = timestampToNumber(event.timestamp)
    const txHash = event.eth_tx_hash || event.tx_hash || '0x00'
    const logIndex = (event.body as any)?.log_index ?? event.tx_index ?? 0
    const recordId = `${txHash}-${logIndex}`

    const paymentData = { 
        id: recordId,
        box_id: boxId,
        user_id: userId,
        token: token.toLowerCase(),
        amount: amount,
        pay_type: 'OrderAmount', // OrderAmount CHECK constraint
        timestamp: timestamp,
        transaction_hash: txHash,
    }

    const { error } = await (supabase.from('payments') as any).upsert(paymentData)

    if (error) {
        console.error(`❌ Failed to insert payment for box ${boxId}:`, error.message)
    } else {
        console.log(`✅ Inserted payment for box ${boxId}`)
    }
}

/**
 * Handle OrderAmountWithdraw event
 * Insert into order_refund_withdraws table
 */
export const handleOrderAmountWithdraw = async (
    scope: RuntimeScope,
    event: DecodedContractEvent<ContractName.FUND_MANAGER , 'OrderAmountWithdraw'>,
): Promise<void> => {
    // get contracts event parameters (list of box ids, token, userId, amount)
    const listRaw = (event.evm_log_params as Array<{ name: string; value: unknown }> | undefined)?.find(p => p.name === 'list')?.value
    const token = getEventArgAsString(event, 'token')
    const userId = getEventArgAsString(event, 'userId')
    const amount = getEventArgAsString(event, 'amount')

    if (!listRaw || !token || !userId || !amount) return

    const boxList = Array.isArray(listRaw)
        ? listRaw.map(item => String(item))
        : [String(listRaw)]

    const txHash = event.eth_tx_hash || event.tx_hash || '0x00'
    const recordId = `OrderAmountWithdraw-Order-${txHash}`

    const withdrawData = {
        id: recordId,
        token: token.toLowerCase(),
        box_id_list: boxList,
        user_id: userId,
        withdraw_type: 'Order', // NOT NULL check constraint
        amount: amount,
        timestamp: timestampToNumber(event.timestamp),
        transaction_hash: txHash,
    }

    const { error } = await (supabase.from('order_refund_withdraws') as any).upsert(withdrawData)

    if (error) {
        console.error(`❌ Failed to insert withdraw for user ${userId}:`, error.message)
    } else {
        console.log(`✅ Inserted withdraw for user ${userId}`)
    }
}

export const handleRefundAmountWithdraw = async (
    scope: RuntimeScope,
    event: DecodedContractEvent<ContractName.FUND_MANAGER , 'RefundAmountWithdraw'>,
): Promise<void> => {
    const listRaw = (event.evm_log_params as Array<{ name: string; value: unknown }> | undefined)?.find(p => p.name === 'list')?.value
    const token = getEventArgAsString(event, 'token')
    const userId = getEventArgAsString(event, 'userId')
    const amount = getEventArgAsString(event, 'amount')

    if (!listRaw || !token || !userId || !amount) return

    const boxList = Array.isArray(listRaw)
        ? listRaw.map(item => String(item))
        : [String(listRaw)]

    const txHash = event.eth_tx_hash || event.tx_hash || '0x00'
    const recordId = `RefundAmountWithdraw-Refund-${txHash}`

    const withdrawData = {
        id: recordId,
        token: token.toLowerCase(),
        box_id_list: boxList,
        user_id: userId,
        withdraw_type: 'Refund', // NOT NULL check constraint
        amount: amount,
        timestamp: timestampToNumber(event.timestamp),
        transaction_hash: txHash,
    }

    const { error } = await (supabase.from('order_refund_withdraws') as any).upsert(withdrawData)

    if (error) {
        console.error(`❌ Failed to insert refund withdraw for user ${userId}:`, error.message)
    } else {
        console.log(`✅ Inserted refund withdraw for user ${userId}`)
    }
}

/**
 * Handle RewardAdded event
 * Insert into rewards_addeds table
 */
export const handleRewardAdded = async (
    scope: RuntimeScope,
    event: DecodedContractEvent<ContractName.FUND_MANAGER , 'RewardAdded'>,
): Promise<void> => {
    const boxId = getEventArgAsString(event, 'boxId')
    const token = getEventArgAsString(event, 'token')
    const userId = getEventArgAsString(event, 'userId') // extract user_id
    const amount = getEventArgAsString(event, 'amount')

    if (!boxId || !token || !userId || !amount) return

    const txHash = event.eth_tx_hash || event.tx_hash || '0x00'
    const recordId = `RewardAdded-${userId}-${txHash}`

    const rewardData = {
        id: recordId,
        box_id: boxId,
        token: token.toLowerCase(),
        user_id: userId, // include required user_id
        amount: amount,
        timestamp: timestampToNumber(event.timestamp),
        transaction_hash: txHash,
    }

    const { error } = await (supabase.from('rewards_addeds') as any).upsert(rewardData)

    if (error) {
        console.error(`❌ Failed to insert reward for box ${boxId}:`, error.message)
    } else {
        console.log(`✅ Inserted reward for box ${boxId}`)
    }
}

/**
 * Handle RewardWithdraw event
 * Insert into rewards_withdraws table
 */
export const handleRewardsWithdraw = async (
    scope: RuntimeScope,
    event: DecodedContractEvent<ContractName.FUND_MANAGER , 'RewardWithdraw'>,
): Promise<void> => {
    const userId = getEventArgAsString(event, 'userId')
    const token = getEventArgAsString(event, 'token')
    const amount = getEventArgAsString(event, 'amount')

    if (!userId || !token || !amount) return

    const recordId = `${userId}-rewards-${token.toLowerCase()}`

    // rewards_withdraws table database schema: id, user_id, token, amount
    const withdrawData = {
        id: recordId,
        user_id: userId,
        token: token.toLowerCase(),
        amount: amount,
    }

    const { error } = await (supabase.from('rewards_withdraws') as any).upsert(withdrawData)

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

    const { error } = await (supabase.from('fund_manager_state') as any).upsert({
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
    const { error } = await (supabase.from('fund_manager_state') as any).upsert({
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
        const eventName = event.evm_log_name
        switch (eventName) {
            case 'Payment':
                await handlePayment(scope, event as DecodedContractEvent<ContractName.FUND_MANAGER , 'Payment'>)
                break
            case 'RewardAdded':
                await handleRewardAdded(scope, event as DecodedContractEvent<ContractName.FUND_MANAGER , 'RewardAdded'>)
                break
            case 'OrderAmountWithdraw':
                await handleOrderAmountWithdraw(scope, event as DecodedContractEvent<ContractName.FUND_MANAGER , 'OrderAmountWithdraw'>)
                break
            case 'RefundAmountWithdraw':
                await handleRefundAmountWithdraw(scope, event as DecodedContractEvent<ContractName.FUND_MANAGER , 'RefundAmountWithdraw'>)
                break
            case 'RewardWithdraw':
                await handleRewardsWithdraw(scope, event as DecodedContractEvent<ContractName.FUND_MANAGER , 'RewardWithdraw'>)
                break
            case 'Paused':
            case 'Unpaused':
                await handleFundManagerState(scope, event)
                break
        }
    }
}
