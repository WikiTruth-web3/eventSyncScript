import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { getSupabaseClient } from '../../config/supabase'
import { fetchMetadataBox, MetadataBoxPayload } from '../ipfs/fetchMetadataBox'
import { sanitizeForSupabase } from '../../utils/getEventArgs'

type MetadataRecord = {
  network: RuntimeScope['network']
  layer: RuntimeScope['layer']
  id: string
  type_of_crime?: string
  label?: string[]
  title?: string
  nft_image?: string
  box_image?: string
  country?: string
  state?: string
  description?: string
  event_date?: string | null
  create_date?: string | null
  timestamp?: number | null
  mint_method?: string | null
  file_list?: string[]
  password?: string | null
  encryption_slices_metadata_cid?: Record<string, unknown> | null
  encryption_file_cid?: Record<string, unknown>[] | null
  encryption_passwords?: Record<string, unknown> | null
  public_key?: string | null
}

const toISODate = (value?: string): string | null => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const normalizeMetadataRecord = (
  scope: RuntimeScope,
  boxId: string,
  metadata: MetadataBoxPayload,
): MetadataRecord => {
  // Handle timestamp, ensure BigInt is converted to number
  let timestamp: number | null = null
  if (metadata.timestamp !== undefined && metadata.timestamp !== null) {
    if (typeof metadata.timestamp === 'bigint') {
      timestamp = Number(metadata.timestamp)
    } else if (typeof metadata.timestamp === 'number') {
      timestamp = metadata.timestamp
    } else {
      timestamp = Number(metadata.timestamp)
    }
  }

  // Sanitize nested objects that may contain BigInt
  const encryptionSlicesMetadataCID = metadata.encryptionSlicesMetadataCID
    ? (sanitizeForSupabase(metadata.encryptionSlicesMetadataCID) as Record<string, unknown>)
    : null

  const encryptionFileCID = metadata.encryptionFileCID
    ? (sanitizeForSupabase(metadata.encryptionFileCID) as Record<string, unknown>[])
    : null

  const encryptionPasswords = metadata.encryptionPasswords
    ? (sanitizeForSupabase(metadata.encryptionPasswords) as Record<string, unknown>)
    : null

  return {
    network: scope.network,
    layer: scope.layer,
    id: boxId,
    type_of_crime: metadata.typeOfCrime,
    label: metadata.label,
    title: metadata.title,
    nft_image: metadata.nftImage,
    box_image: metadata.boxImage,
    country: metadata.country,
    state: metadata.state,
    description: metadata.description,
    event_date: metadata.eventDate ? toISODate(metadata.eventDate)?.split('T')[0] ?? null : null,
    create_date: toISODate(metadata.createDate),
    timestamp,
    mint_method: metadata.mintMethod ?? null,
    file_list: metadata.fileList,
    password: metadata.password ?? null,
    encryption_slices_metadata_cid: encryptionSlicesMetadataCID,
    encryption_file_cid: encryptionFileCID,
    encryption_passwords: encryptionPasswords,
    public_key: metadata.publicKey ?? null,
  }
}

export const upsertMetadataFromEvents = async (
  scope: RuntimeScope,
  boxId: string,
  boxInfoCID: string,
) => {
  try {
    const metadata = await fetchMetadataBox(boxInfoCID)
    const record = normalizeMetadataRecord(scope, boxId, metadata)
    console.log(`✅ Successfully fetched metadata for box ${boxId}`)

    const supabase = getSupabaseClient()
    // Sanitize all records to ensure no BigInt
    const sanitizedRecord = sanitizeForSupabase(record) as MetadataRecord
    
    const { error } = await supabase.from('metadata_boxes').upsert(sanitizedRecord, {
      onConflict: 'network,layer,id',
    })
    
    if (error) {
      throw new Error(`Failed to upsert metadata_boxes: ${error.message}`)
    } else {
      console.log(`✅ Metadata for box ${boxId} upserted successfully`)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.warn(`⚠️  Failed to fetch or save metadata for box ${boxId} (CID: ${boxInfoCID}):`, errorMessage)
  }
}
