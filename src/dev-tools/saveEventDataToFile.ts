/**
 * Utility function to save event data to JSON files
 * Mainly for debugging purposes, can be disabled in production environment
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { RuntimeScope } from '../oasisQuery/types/searchScope'
import { ContractName } from '../contractsConfig/types'
import { OUTPUT_CONFIG } from '../config/sync'
import type { RuntimeContractSyncResult } from '../sync-engine/sync/runtimeContractSyncer'

export interface FilteredEventData {
    eth_tx_hash?: string
    evm_log_name?: string
    evm_log_params?: any[]
    round: number
    timestamp: string
}

export interface EventDataPayload {
    fetchedAt: string
    scope: RuntimeScope
    contract: ContractName
    cursorBefore: {
        lastBlock: number
        lastLogIndex?: number
        lastTimestamp?: string
        lastEventId?: string
    }
    cursorAfter: {
        lastBlock: number
        lastLogIndex?: number
        lastTimestamp?: string
        lastEventId?: string
    }
    pagesFetched: number
    totalFetched: number
    eventCount: number
    rawEvents: FilteredEventData[]
}

/**
 * Resolve output file path
 * @param scope - Runtime scope
 * @param contract - Contract name
 * @returns Output file path
 */
const resolveOutputPath = (scope: RuntimeScope, contract: ContractName): string => {
    const filename = `${contract.toLowerCase()}Events-${scope.network}-${scope.layer}.json`
    return path.resolve(process.cwd(), OUTPUT_CONFIG.OUTPUT_DIR_RAW_EVENTS, filename)
}

/**
 * Build event data payload
 * @param scope - Runtime scope
 * @param contract - Contract name
 * @param syncResult - Sync result
 * @returns Event data payload
 */
const buildEventDataPayload = (
    scope: RuntimeScope,
    contract: ContractName,
    syncResult: RuntimeContractSyncResult,
): EventDataPayload => {
    const filteredEvents = syncResult.fetchResult.rawEvents.map(event => ({
        eth_tx_hash: event.eth_tx_hash ?? event.tx_hash,
        evm_log_name: event.evm_log_name,
        evm_log_params: event.evm_log_params,
        round: event.round,
        timestamp: event.timestamp,
    }))

    return {
        fetchedAt: new Date().toISOString(),
        scope,
        contract,
        cursorBefore: syncResult.cursorBefore,
        cursorAfter: syncResult.cursorAfter,
        pagesFetched: syncResult.fetchResult.pagesFetched,
        totalFetched: syncResult.fetchResult.totalFetched,
        eventCount: syncResult.fetchResult.rawEvents.length,
        rawEvents: filteredEvents,
    }
}

/**
 * Save event data to JSON file
 * @param scope - Runtime scope
 * @param contract - Contract name
 * @param syncResult - Sync result
 * @returns Saved file path, returns null if save fails
 */
export const saveEventDataToFile = async (
    scope: RuntimeScope,
    contract: ContractName,
    syncResult: RuntimeContractSyncResult,
): Promise<string | null> => {
    try {
        const payload = buildEventDataPayload(scope, contract, syncResult)
        const outputPath = resolveOutputPath(scope, contract)

        // Ensure directory exists
        await fs.mkdir(path.dirname(outputPath), { recursive: true })

        // Write file
        await fs.writeFile(outputPath, JSON.stringify(payload, null, 2), 'utf8')

        console.log(`📝 Saved raw event data to ${outputPath}`)
        return outputPath
    } catch (error) {
        console.warn(
            `⚠️  Failed to save event data to file:`,
            error instanceof Error ? error.message : String(error),
        )
        return null
    }
}

/**
 * Check if event data should be saved to file
 * Can be controlled via environment variable EVENT_SYNC_SAVE_JSON (save when set to 'true' or '1')
 * @returns Whether to save
 */
export const shouldSaveEventDataToFile = (): boolean => {
    const envValue = process.env.EVENT_SYNC_SAVE_JSON
    return envValue === 'true' || envValue === '1'
}

