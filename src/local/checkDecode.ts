
import rawEventsTruthBox from '../../data/rawEvents/truth_boxEvents-testnet-sapphire.json'

async function main () {
    const truthBoxEvents = rawEventsTruthBox.rawEvents
    const eventCount = rawEventsTruthBox.eventCount
    const isEqual = eventCount === truthBoxEvents.length
    
    console.log('truthBox_events length is:', truthBoxEvents.length)
    console.log('truthBox_events length is equal?:', isEqual)
}

void main()
// npm src/local/checkDecode.ts
