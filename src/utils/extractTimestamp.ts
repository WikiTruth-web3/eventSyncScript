// import type { RuntimeEvent } from '../oasisQuery/oasis-nexus/api'

// export const extractTimestamp = (event: RuntimeEvent, otherTimestamp?: number ): string => {
//     const timestampStr = event.timestamp // "timestamp": "2025-11-21T15:12:40Z", needs to be converted to seconds timestamp
//     let timestamp = Math.floor(Date.now() / 1000)
//     if (timestampStr) {
//         timestamp = new Date(timestampStr).getTime()
//         // console.log('timestamp:', timestamp/1000)
//     } 
//     if (otherTimestamp) {
//         timestamp += otherTimestamp
//     }

//     return String(timestamp/1000)
// }

// export const extractRound = (event: RuntimeEvent): string => {
//     const round = event.round
//     if (round !== undefined && round !== null) {
//         return String(round)
//     }

//     return "0";
// }


