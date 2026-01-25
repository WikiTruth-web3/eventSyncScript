import type { DecodedRuntimeEvent } from '../oasisQuery/app/services/events'


interface EventErrorFix {
    contractAddress: string,
    contractName: string,
    txHash: string
    eventName: string
    paramName: string
    incorrectValue: string
    correctValue: string
    round: number
}

const TruthBox_event_FIXES_BoxCreated: EventErrorFix[] = [
    {
        contractAddress: "GuwBl7DdwEEjk4E/hjOCdI2lwB4=",
        contractName: 'TruthBox',
        txHash: '777172dd777fcb7bd53c585f587d71ef380e1f54ee1807758fbb61854b64f42f',
        eventName: 'BoxCreated', 
        paramName: 'userId', 
        incorrectValue: '2', 
        correctValue: '1', 
        round: 14484034,
    }
]

export function fixEventErrorParam_BoxCreated(
    event: DecodedRuntimeEvent<Record<string, unknown>>,
    paramName: string,
    originalValue: string
): string {
    const txHash = event.raw.tx_hash ?? event.raw.eth_tx_hash
    const round = event.raw.round
    const eventName = event.eventName

    // Match by txHash, eventName, and paramName. 
    // txHash is unique enough that we don't strictly need to check contractAddress here,
    // which makes the tool more robust if the 'body' was deleted to save space.
    const fix = TruthBox_event_FIXES_BoxCreated.find(f =>
        f.txHash === txHash &&
        f.eventName === eventName &&
        f.paramName === paramName &&
        f.incorrectValue === originalValue &&
        f.round === round
    )

    if (fix) {
        return fix.correctValue
    }

    return originalValue
}

const Exchange_event_FIXES_BoxPurchased: EventErrorFix[] = [
    {
        contractAddress: "/UxM+osd868/egemMLL7umtFtA0=",
        contractName: 'Exchange',
        txHash: 'f2381b7079cee11324c57c18a2c6103163fa65c6ee59200ffa6be7a434257e98',
        eventName: 'BoxPurchased',
        paramName: 'userId',
        incorrectValue: '4',
        correctValue: '3',
        round: 14770892
    },

]

export function fixEventErrorParam_BoxPurchased(
    event: DecodedRuntimeEvent<Record<string, unknown>>,
    paramName: string,
    originalValue: string
): string {
    const txHash = event.raw.tx_hash ?? event.raw.eth_tx_hash
    const round = event.raw.round
    const eventName = event.eventName

    // Match by txHash, eventName, and paramName. 
    // txHash is unique enough that we don't strictly need to check contractAddress here,
    // which makes the tool more robust if the 'body' was deleted to save space.
    const fix = Exchange_event_FIXES_BoxPurchased.find(f =>
        f.txHash === txHash &&
        f.eventName === eventName &&
        f.paramName === paramName &&
        f.incorrectValue === originalValue &&
        f.round === round
    )

    if (fix) {
        return fix.correctValue
    }

    return originalValue
}

const Exchange_event_FIXES_BidPlaced: EventErrorFix[] = [
    {
        contractAddress: "/UxM+osd868/egemMLL7umtFtA0=",
        contractName: 'Exchange',
        txHash: '967e5c6cd6b61874864c1d006f914fb00ffa2cd6fbf0aaca8d0e19074178ab37',
        eventName: 'BidPlaced',
        paramName: 'userId',
        incorrectValue: '3',
        correctValue: '2',
        round: 14770576,
    }
]

export function fixEventErrorParam_BidPlaced(
    event: DecodedRuntimeEvent<Record<string, unknown>>,
    paramName: string,
    originalValue: string
): string {
    const txHash = event.raw.tx_hash ?? event.raw.eth_tx_hash
    const round = event.raw.round
    const eventName = event.eventName

    // Match by txHash, eventName, and paramName. 
    // txHash is unique enough that we don't strictly need to check contractAddress here,
    // which makes the tool more robust if the 'body' was deleted to save space.
    const fix = Exchange_event_FIXES_BidPlaced.find(f =>
        f.txHash === txHash &&
        f.eventName === eventName &&
        f.paramName === paramName &&
        f.incorrectValue === originalValue &&
        f.round === round
    )

    if (fix) {
        return fix.correctValue
    }

    return originalValue
}