

import type { DecodedRuntimeEvent } from '../oasisQuery/app/services/events'
import { normalizeHash } from './eventArgs'

/**
 * Generate record ID: transaction_hash
 */
export const generateRecordId = (event: DecodedRuntimeEvent<Record<string, unknown>>): string => {
    const txHash = normalizeHash(event.raw.tx_hash ?? event.raw.eth_tx_hash)
    const timestamp = Date.now()
    return `${event.eventName}-${txHash}-${timestamp}`
}
