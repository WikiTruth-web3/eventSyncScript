// import { ipfsCidToUrl } from '../../utils/ipfsUrl/ipfsCidToUrl'
// import { refreshGatewayStatus, clearGatewayCache } from '../../utils/ipfsUrl/gateway'
// import { IPFS_CONFIG } from '../../config/ipfs'
// import { fetchWithProxy } from '../../utils/fetchWithProxy'


// NOTE This is old code
// Encrypted file CID structure. Since the zip file will be split into multiple chunks for encryption, the CIDs of multiple chunks need to be stored
export interface EncryptionFileCIDType {
    fileCID_encryption: string;
    fileCID_iv: string;
}
// Encrypted password structure. Only one password is used during zip compression, so only the encrypted data of one password needs to be stored
export interface EncryptionPasswordType {
    password_encryption: string;
    password_iv: string;
}
// Zip chunk metadata CID encryption structure
export interface EncryptionSlicesMetadataCIDType {
    slicesMetadataCID_encryption: string;
    slicesMetadataCID_iv: string;
}

export interface MetadataBoxPayload_v1 {
  name?: string
  tokenId?: string
  typeOfCrime?: string
  label?: string[]
  title?: string
  nftImage?: string
  boxImage?: string
  country?: string
  state?: string
  description?: string
  eventDate?: string
  createDate?: string
  timestamp?: number
  mintMethod?: string
  project?: string
  website?: string[]
  fileList?: string[]
  password?: string
  encryptionSlicesMetadataCID?: EncryptionSlicesMetadataCIDType
  encryptionFileCID?: EncryptionFileCIDType[]
  encryptionPasswords?: EncryptionPasswordType
  publicKey?: string
  [key: string]: unknown
}

// ======================================================
// sapphire testnet
// round or BlockHeight >= 15615554
// ======================================================
export interface EncryptionResultType {
    encryption_data: string;
    encryption_iv: string;
}

export interface MetadataBoxPayload_v2 {
  name?: string
  token_id?: string
  type_of_crime?: string
  label?: string[]
  title?: string
  nft_image?: string
  box_image?: string
  country?: string
  state?: string
  description?: string
  event_date?: string
  create_date?: string
  timestamp?: number
  mint_method?: string
  project?: string
  website?: string[]
  file_list?: string[]
  password?: string
  encryption_slices_metadata_cid?: EncryptionResultType,
  encryption_file_cid?: EncryptionResultType[],
  encryption_passwords?: EncryptionResultType,
  public_key?: string
  [key: string]: unknown
}

/**
 * Convert v1 metadata payload to v2 payload
 * Used for legacy data before block 15615554
 */
export function convertV1ToV2(v1: MetadataBoxPayload_v1): MetadataBoxPayload_v2 {
  const v2: MetadataBoxPayload_v2 = {
    ...v1,
    token_id: v1.tokenId,
    type_of_crime: v1.typeOfCrime,
    nft_image: v1.nftImage,
    box_image: v1.boxImage,
    event_date: v1.eventDate,
    create_date: v1.createDate,
    mint_method: v1.mintMethod,
    file_list: v1.fileList,
    public_key: v1.publicKey,
  }

  // Handle encryption fields if they exist
  if (v1.encryptionSlicesMetadataCID) {
    v2.encryption_slices_metadata_cid = {
      encryption_data: v1.encryptionSlicesMetadataCID.slicesMetadataCID_encryption,
      encryption_iv: v1.encryptionSlicesMetadataCID.slicesMetadataCID_iv,
    }
  }

  if (v1.encryptionFileCID) {
    v2.encryption_file_cid = v1.encryptionFileCID.map(item => ({
      encryption_data: item.fileCID_encryption,
      encryption_iv: item.fileCID_iv,
    }))
  }

  if (v1.encryptionPasswords) {
    v2.encryption_passwords = {
      encryption_data: v1.encryptionPasswords.password_encryption,
      encryption_iv: v1.encryptionPasswords.password_iv,
    }
  }

  // Remove old camelCase fields to avoid confusion, though they are kept by ...v1
  // If we want a clean v2 object:
  delete v2.tokenId
  delete v2.typeOfCrime
  delete v2.nftImage
  delete v2.boxImage
  delete v2.eventDate
  delete v2.createDate
  delete v2.mintMethod
  delete v2.fileList
  delete v2.publicKey
  delete v2.encryptionSlicesMetadataCID
  delete v2.encryptionFileCID
  delete v2.encryptionPasswords

  return v2
}


