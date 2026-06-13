import type { RuntimeScope } from '../../oasisQuery/types/searchScope'
import { db } from '../../config/db.client'
import { Database } from '../../types/dataBase'
import { fetchMetadataBox } from '../ipfs/fetchMetadataBox'
import type { MetadataBoxPayload } from '../ipfs/fetchMetadataBox'

// Removed V2_BLOCK_THRESHOLD and v1 conversion logic as per user request to only keep v2.

type MetadataRecord = {
  network: 'testnet' | 'mainnet'
  layer: 'sapphire'
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

/**
 * Normalize metadata for Supabase storage
 */
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
  const encryptionSlicesMetadataCID = metadata.encryption_slices_metadata_cid
    ? (metadata.encryption_slices_metadata_cid as Record<string, unknown>)
    : null

  const encryptionFileCID = metadata.encryption_file_cid
    ? (metadata.encryption_file_cid as Record<string, unknown>[])
    : null

  const encryptionPasswords = metadata.encryption_passwords
    ? (metadata.encryption_passwords as Record<string, unknown>)
    : null

  return {
    network: scope.network as 'testnet' | 'mainnet',
    layer: scope.layer as 'sapphire',
    id: boxId,
    type_of_crime: metadata.type_of_crime,
    label: metadata.label,
    title: metadata.title,
    nft_image: metadata.nft_image,
    box_image: metadata.box_image,
    country: metadata.country,
    state: metadata.state,
    description: metadata.description,
    event_date: metadata.event_date ? toISODate(metadata.event_date)?.split('T')[0] ?? null : null,
    create_date: toISODate(metadata.create_date),
    timestamp,
    mint_method: metadata.mint_method ?? null,
    file_list: metadata.file_list,
    password: metadata.password ?? null,
    encryption_slices_metadata_cid: encryptionSlicesMetadataCID,
    encryption_file_cid: encryptionFileCID,
    encryption_passwords: encryptionPasswords,
    public_key: metadata.public_key ?? null,
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
    console.log(`✅ Successfully normalized metadata for box ${boxId}`)

    // Sanitize all records to ensure no BigInt
    const sanitizedRecord = record as Database['metadata_boxes']
    
    const { error } = await db.upsert('metadata_boxes', sanitizedRecord)
    
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
