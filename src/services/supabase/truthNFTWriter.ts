// // src/services/supabase/truthNFTWriter.ts
// import type { RuntimeContractSyncResult } from '../../core/sync/runtimeContractSyncer'
// import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
// import { ContractName } from '../../contractsConfig/types'
// import { isSupabaseConfigured } from '../../config/supabase'
// import { getSupabaseClient } from '../../config/supabase'
// import { getEventArgAsString, sanitizeForSupabase } from '../../utils/getEventArgs'
// import type { DecodedRuntimeEvent } from '../../oasisQuery/app/services/events'
// import { ensureUserAddressExists } from './ensureAddress'

// /**
//  * Handle Transfer event, update boxes table owner_address
//  */
// export const handleTransfer = async (
//   scope: RuntimeScope,
//   event: DecodedRuntimeEvent<Record<string, unknown>>,
// ): Promise<void> => {
//   const tokenId = getEventArgAsString(event, 'tokenId')
//   const to = getEventArgAsString(event, 'to')

//   if (!tokenId || !to) return

//   const supabase = getSupabaseClient()

//   // Ensure user address exists
//   await ensureUserAddressExists(scope, to)

//   // Update boxes table owner_address
//   const { error } = await supabase
//     .from('boxes')
//     .update({ owner_address: to.toLowerCase() })
//     .match({ network: scope.network, layer: scope.layer, id: tokenId })

//   if (error) {
//     console.warn(`⚠️  Failed to update box ${tokenId} owner_address:`, error.message)
//   } else {
//     console.log(`✅ Updated box ${tokenId} owner_address`)
//   }
// }

// /**
//  * Process TruthNFT contract events and write to Supabase
//  */
// export const persistTruthNFTSync = async (
//   scope: RuntimeScope,
//   contract: ContractName,
//   events: DecodedRuntimeEvent<any>[],
// ): Promise<void> => {
//   if (!isSupabaseConfigured()) {
//     console.warn('⚠️  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured, skipping database write')
//     return
//   }

//   if (contract !== ContractName.TRUTH_NFT) return 

//   // Process all Transfer events
//   for (const event of events) {
//     if (event.eventName === 'Transfer') {
//       await handleTransfer(scope, event)
//     }
//   }
// }

