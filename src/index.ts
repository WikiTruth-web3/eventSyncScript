import './config/env' // Load environment variables (supports .env and .env.local)
import { fetchTruthBoxEvents } from './scripts/fetchTruthBoxEvents'
import { fetchTruthNFTEvents } from './scripts/fetchTruthNFTEvents'
import { fetchExchangeEvents } from './scripts/fetchExchangeEvents'
import { fetchFundManagerEvents } from './scripts/fetchFundManagerEvents'
import { fetchUserIdEvents } from './scripts/fetchUserIdEvents'
import { DEFAULT_SCOPE } from './config/sync'
import { getAllContractsSyncData, updateSyncStatus } from './core/state'
import { ContractName } from './contractsConfig/types'
import { CONTROLLER } from './controller'

async function main() {
  try {

    const default_start_block = 14458354
    
    let truthBoxLastBlock = default_start_block
    let truthNFTLastBlock = default_start_block
    let exchangeLastBlock = default_start_block
    let fundManagerLastBlock = default_start_block
    let userIdLastBlock = default_start_block

    // Get all contracts sync data from Supabase
    if (!CONTROLLER.restart) {
      const allSyncData = await getAllContractsSyncData(DEFAULT_SCOPE)
      truthBoxLastBlock = allSyncData[ContractName.TRUTH_BOX]?.last_synced_block || default_start_block
      truthNFTLastBlock = allSyncData[ContractName.TRUTH_NFT]?.last_synced_block || default_start_block
      exchangeLastBlock = allSyncData[ContractName.EXCHANGE]?.last_synced_block || default_start_block
      fundManagerLastBlock = allSyncData[ContractName.FUND_MANAGER]?.last_synced_block || default_start_block
      userIdLastBlock = allSyncData[ContractName.USER_ID]?.last_synced_block || default_start_block
    }

    // Fetch events from contracts according to current mode

    if (CONTROLLER.queryList.includes('truthBox') || CONTROLLER.queryList.includes('metadataBox')) {
      await fetchTruthBoxEvents(DEFAULT_SCOPE, truthBoxLastBlock)
    }
    
    if (CONTROLLER.queryList.includes('truthNFT')) {
      await fetchTruthNFTEvents(DEFAULT_SCOPE, truthNFTLastBlock)
    }

    if (CONTROLLER.queryList.includes('exchange')) {
      await fetchExchangeEvents(DEFAULT_SCOPE, exchangeLastBlock)
    }

    if (CONTROLLER.queryList.includes('fundManager')) {
      await fetchFundManagerEvents(DEFAULT_SCOPE, fundManagerLastBlock)
    }

    if (CONTROLLER.queryList.includes('userId')) {
      await fetchUserIdEvents(DEFAULT_SCOPE, userIdLastBlock)
    }

    console.log(`\n✅ Sync completed successfully!\n`)

  } catch (error) {
    console.error('❌ Failed to sync events:', error)
    process.exitCode = 1
  }
}

void main()
