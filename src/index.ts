import './config/env' // Load environment variables (supports .env and .env.local)
import { fetchTruthBoxEvents } from './scripts/fetchTruthBoxEvents'
// import { fetchTruthNFTEvents } from './scripts/fetchTruthNFTEvents'
import { fetchExchangeEvents } from './scripts/fetchExchangeEvents'
import { fetchFundManagerEvents } from './scripts/fetchFundManagerEvents'
import { fetchUserManagerEvents } from './scripts/fetchUserManagerEvents'
import { fetchForwarderEvents } from './scripts/fetchForwarderEvents'
import { DEFAULT_SCOPE } from './config/sync'
import { getAllContractsSyncData,} from './core/state'
import { ContractName } from './contractsConfig/types'
import { CONTROLLER } from './controller'

async function main() {
  try {

    const default_start_block = 16435046
    
    let truthBoxLastBlock = default_start_block
    let exchangeLastBlock = default_start_block
    let fundManagerLastBlock = default_start_block
    let userManagerLastBlock = default_start_block
    let forwarderLastBlock = default_start_block

    // Get all contracts sync data from Supabase
    if (!CONTROLLER.restart) {
      const allSyncData = await getAllContractsSyncData(DEFAULT_SCOPE)
      truthBoxLastBlock = allSyncData[ContractName.TRUTH_BOX]?.last_synced_block || default_start_block
      exchangeLastBlock = allSyncData[ContractName.EXCHANGE]?.last_synced_block || default_start_block
      fundManagerLastBlock = allSyncData[ContractName.FUND_MANAGER]?.last_synced_block || default_start_block
      userManagerLastBlock = allSyncData[ContractName.USER_MANAGER]?.last_synced_block || default_start_block
      forwarderLastBlock = allSyncData[ContractName.FORWARDER]?.last_synced_block || default_start_block
      truthBoxLastBlock += 1
      exchangeLastBlock += 1
      fundManagerLastBlock += 1
      userManagerLastBlock += 1
      forwarderLastBlock += 1
    }

    // Fetch events from contracts according to current mode

    if (CONTROLLER.queryList.includes('truthBox') || CONTROLLER.queryList.includes('metadataBox')) {
      await fetchTruthBoxEvents(DEFAULT_SCOPE, truthBoxLastBlock)
    }
    
    if (CONTROLLER.queryList.includes('exchange')) {
      await fetchExchangeEvents(DEFAULT_SCOPE, exchangeLastBlock)
    }

    if (CONTROLLER.queryList.includes('fundManager')) {
      await fetchFundManagerEvents(DEFAULT_SCOPE, fundManagerLastBlock)
    }

    if (CONTROLLER.queryList.includes('userManager')) {
      await fetchUserManagerEvents(DEFAULT_SCOPE, userManagerLastBlock)
    }

    if (CONTROLLER.queryList.includes('forwarder')) {
      await fetchForwarderEvents(DEFAULT_SCOPE, forwarderLastBlock)
    }

    console.log(`\n✅ Sync completed successfully!\n`)

  } catch (error) {
    console.error('❌ Failed to sync events:', error)
    process.exitCode = 1
  }
}

void main()
