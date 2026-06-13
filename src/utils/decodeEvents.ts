/**
 * Universal event decoding utility
 * Supports event decoding for multiple contracts
 */

import type { RuntimeEvent } from '../oasisQuery/oasis-nexus/api'
import type { RuntimeScope } from '../oasisQuery/types/searchScope'
import { ContractName } from '../contractsConfig/types'
import { getContractEventSignatures } from '../contractsConfig/eventSignatures/events'
import { decodeRuntimeEvents } from '../oasisQuery/app/services/events'
import { NETWORK_CONTRACTS } from '../contractsConfig/contracts'
import { SupportedChainId } from '../contractsConfig/types'

import { base64ToHex } from '../oasisQuery/app/utils/helpers'

/**
 * Normalize hex string (handles base64 from Nexus)
 */
const normalizeHex = (value: any): string | null => {
    if (typeof value !== 'string') return null
    if (value.startsWith('0x')) return value.toLowerCase()
    try {
        return base64ToHex(value).toLowerCase()
    } catch {
        return null
    }
}

/**
 * Resolve contract address (reuse existing logic)
 */
const resolveContractAddress = (
    scope: RuntimeScope,
    contractName: ContractName,
): `0x${string}` | null => {
    const networkToChainId: Partial<Record<RuntimeScope['network'], SupportedChainId>> = {
        testnet: SupportedChainId.SAPPHIRE_TESTNET,
        mainnet: SupportedChainId.SAPPHIRE_MAINNET,
    }

    const chainId = networkToChainId[scope.network]
    if (!chainId) {
        return null
    }

    const contractConfig = NETWORK_CONTRACTS[chainId]?.[contractName]
    return contractConfig?.address ?? null
}

/**
 * Decode events for a single contract, return native RuntimeEvent objects
 */
export const decodeContractEvents = (
    rawEvents: RuntimeEvent[],
    contractName: ContractName,
    scope: RuntimeScope,
): RuntimeEvent[] => {
    // Resolve contract address
    const contractAddress = resolveContractAddress(scope, contractName)
    if (!contractAddress) {
        console.warn(`⚠️  Unable to resolve contract address: ${contractName} (${scope.network}/${scope.layer})`)
        return []
    }

    const targetAddress = contractAddress.toLowerCase()
    const decodedEvents: RuntimeEvent[] = []
    const eventSignatures = getContractEventSignatures(contractName)

    for (const event of rawEvents) {
        if (event.type !== 'evm.log') continue

        const rawAddress = (event.body as any)?.address ?? (event.body as any)?.eth_address ?? (event.body as any)?.contract_address
        const address = normalizeHex(rawAddress)
        if (address !== targetAddress) continue

        // 1. If Nexus has already decoded this event, reuse the decoded name and parameters directly
        if (event.evm_log_name) {
            decodedEvents.push(event)
        } 
        // 2. If it is not decoded by Nexus (unverified contract), fall back to local ABI decoding and populate fields
        else if (eventSignatures && eventSignatures.length > 0) {
            try {
                const localDecoded = decodeRuntimeEvents([event], {
                    contractAddress,
                    eventSignatures,
                })
                if (localDecoded.length > 0) {
                    const decodedItem = localDecoded[0]
                    event.evm_log_name = decodedItem.eventName
                    event.evm_log_params = Object.entries(decodedItem.args || {}).map(([name, value]) => ({
                        name,
                        evm_type: '', // placeholder solidity type, not needed by our parameter extractor
                        value,
                    }))
                    decodedEvents.push(event)
                }
            } catch (err) {
                console.debug(`Skipped decoding log at block ${event.round} via local ABI`, err)
            }
        }
    }

    // Strip body and unused fields (tx_hash, tx_index, type) from raw events to reduce data volume (requested by user)
    return decodedEvents.map(event => {
        const { body, tx_hash, tx_index, type, ...rawWithoutUnused } = event as any
        return rawWithoutUnused as RuntimeEvent
    })
}

/**
 * Decode events for multiple contracts (auto-identify contracts)
 * If contract name is provided, only decode events for that contract
 * If not provided, will try all configured contracts
 */
export const decodeMultiContractEvents = (
    rawEvents: RuntimeEvent[],
    scope: RuntimeScope,
    contractName?: ContractName,
): Array<RuntimeEvent & { contract: ContractName }> => {
    const results: Array<RuntimeEvent & { contract: ContractName }> = []

    if (contractName) {
        // Only decode events for specified contract
        const decoded = decodeContractEvents(rawEvents, contractName, scope)
        results.push(...decoded.map(event => ({ ...event, contract: contractName })))
    } else {
        // Try decoding all configured contracts
        const contractsToTry: ContractName[] = [
            ContractName.BLIND_BOX,
            ContractName.EXCHANGE,
            ContractName.FUND_MANAGER,
            ContractName.USER_MANAGER,
        ]

        for (const contract of contractsToTry) {
            const decoded = decodeContractEvents(rawEvents, contract, scope)
            results.push(...decoded.map(event => ({ ...event, contract })))
        }
    }

    return results
}
