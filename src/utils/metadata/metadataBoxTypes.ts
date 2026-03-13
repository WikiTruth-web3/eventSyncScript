export interface EncryptionResultType {
    encryption_data: string;
    encryption_iv: string;
}

export interface MetadataBoxPayload {
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


