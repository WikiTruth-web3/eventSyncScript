
import rawEventsBlindBox from '../../data/rawEvents/truth_boxEvents-testnet-sapphire.json'

async function main () {
    const blindBoxEvents = rawEventsBlindBox.rawEvents
    const eventCount = rawEventsBlindBox.eventCount
    const isEqual = eventCount === blindBoxEvents.length
    
    console.log('blindBox_events length is:', blindBoxEvents.length)
    console.log('blindBox_events length is equal?:', isEqual)
}

void main()
// npm src/local/checkDecode.ts
