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
    if ('onlyWrite' in CONTROLLER) {
        console.log(`🚀 Starting sync in onlyWrite: ${CONTROLLER.mode}${CONTROLLER.onlyWrite ? ` (${CONTROLLER.onlyWrite})` : ''}`)
    } else {
        console.log(`🚀 Starting sync in mode: ${CONTROLLER.mode}`)
    }

    if (!CONTROLLER.writeToSupabase && CONTROLLER.mode === 'AllData') {
      console.log('🌐 Note: writeToSupabase is disabled. Data will be fetched but not persisted.')
    }

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
    const runAll = CONTROLLER.mode === 'AllData'
    const onlyWrite = 'onlyWrite' in CONTROLLER ? CONTROLLER.onlyWrite : ''

    if (runAll || onlyWrite === 'truthBox' || onlyWrite === 'metadataBox') {
      await fetchTruthBoxEvents(DEFAULT_SCOPE, truthBoxLastBlock)
    }
    
    if (runAll || onlyWrite === 'truthNFT') {
      await fetchTruthNFTEvents(DEFAULT_SCOPE, truthNFTLastBlock)
    }

    if (runAll || onlyWrite === 'exchange') {
      await fetchExchangeEvents(DEFAULT_SCOPE, exchangeLastBlock)
    }

    if (runAll || onlyWrite === 'fundManager') {
      await fetchFundManagerEvents(DEFAULT_SCOPE, fundManagerLastBlock)
    }

    if (runAll || onlyWrite === 'userId') {
      await fetchUserIdEvents(DEFAULT_SCOPE, userIdLastBlock)
    }

    console.log(`\n✅ Sync completed successfully!\n`)

  } catch (error) {
    console.error('❌ Failed to sync events:', error)
    process.exitCode = 1
  }
}

void main()
