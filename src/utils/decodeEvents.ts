/**
 * Universal event decoding utility
 * Supports event decoding for multiple contracts
 */

import type { RuntimeEvent } from '../oasisQuery/oasis-nexus/api'
import type { RuntimeScope } from '../oasisQuery/types/searchScope'
import { ContractName } from '../contractsConfig/types'
import { getContractEventSignatures } from '../contractsConfig/eventSignatures/events'
import { decodeRuntimeEvents, type DecodedRuntimeEvent } from '../oasisQuery/app/services/events'
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
 * Decode events for a single contract
 */
export const decodeContractEvents = <TArgs = Record<string, unknown>>(
    rawEvents: RuntimeEvent[],
    contractName: ContractName,
    scope: RuntimeScope,
): DecodedRuntimeEvent<TArgs>[] => {
    // Resolve contract address
    const contractAddress = resolveContractAddress(scope, contractName)
    if (!contractAddress) {
        console.warn(`⚠️  Unable to resolve contract address: ${contractName} (${scope.network}/${scope.layer})`)
        return []
    }

    const targetAddress = contractAddress.toLowerCase()
    
    // Check if manual decoding is enabled (default to true)
    const enableDecoding = process.env.ENABLE_EVENT_DECODING !== 'false'

    let decodedEvents: DecodedRuntimeEvent<TArgs>[] = []

    if (enableDecoding) {
        // Get event signatures
        const eventSignatures = getContractEventSignatures(contractName)
        if (!eventSignatures || eventSignatures.length === 0) {
            console.warn(`⚠️  Contract ${contractName} has no event signature configuration`)
            return []
        }

        // Decode events using manual ABI (for Proxy contracts or encrypted events)
        decodedEvents = decodeRuntimeEvents<TArgs>(rawEvents, {
            contractAddress,
            eventSignatures,
        })
    } else {
        // Use Nexus intuitive events (for standard contracts already indexed by Nexus)
        for (const event of rawEvents) {
            if (event.type !== 'evm.log') continue
            
            const rawAddress = (event.body as any)?.address ?? (event.body as any)?.eth_address ?? (event.body as any)?.contract_address
            const address = normalizeHex(rawAddress)
            
            if (address === targetAddress && (event as any).evm_log_name) {
                const args: Record<string, unknown> = {}
                const params = (event as any).evm_log_params || []
                for (const param of params) {
                    if (param.name) {
                        args[param.name] = param.value
                    }
                }

                decodedEvents.push({
                    eventName: (event as any).evm_log_name,
                    args: args as TArgs,
                    raw: event,
                })
            }
        }
    }

    // Strip the large body field from raw events to reduce data volume (requested by user)
    return decodedEvents.map(event => {
        const { body, ...rawWithoutBody } = event.raw as any
        return {
            ...event,
            raw: rawWithoutBody
        }
    })
}

/**
 * Decode events for multiple contracts (auto-identify contracts)
 * If contract name is provided, only decode events for that contract
 * If not provided, will try all configured contracts
 */
export const decodeMultiContractEvents = <TArgs = Record<string, unknown>>(
    rawEvents: RuntimeEvent[],
    scope: RuntimeScope,
    contractName?: ContractName,
): Array<DecodedRuntimeEvent<TArgs> & { contract: ContractName }> => {
    const results: Array<DecodedRuntimeEvent<TArgs> & { contract: ContractName }> = []

    if (contractName) {
        // Only decode events for specified contract
        const decoded = decodeContractEvents<TArgs>(rawEvents, contractName, scope)
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
            const decoded = decodeContractEvents<TArgs>(rawEvents, contract, scope)
            results.push(...decoded.map(event => ({ ...event, contract })))
        }
    }

    return results
}

