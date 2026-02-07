
export type OnlyWriteType = 
  | 'metadataBox' 
  | 'truthBox' 
  | 'truthNFT' 
  | 'exchange' 
  | 'fundManager' 
  | 'userId' 
  | null;


type ModeType = 'onlyWrite' | 'AllData'


export interface CommonType {
    writeToSupabase: boolean;
    restart: boolean;
    isUpdateLastBlock: boolean;
  }

export interface AllDataSyncConfig extends CommonType {
  mode: 'onlyWrite' | 'AllData';
  writeMetadataBox: boolean;
}

export interface OnlyWriteSyncConfig extends CommonType {
  mode: 'onlyWrite' | 'AllData';
  onlyWrite: OnlyWriteType;
}


// ==========================================
// ==========================================


const controller = (mode: ModeType): AllDataSyncConfig | OnlyWriteSyncConfig => {
    if(mode === 'onlyWrite') {
        return MODE_ONLY_WRITE_CONSTANTS
    } else {
        return MODE_SYNC_CONSTANT
    }
}


// ==========================================
// ==========================================

const COMMON_CONSTANT = {
    writeToSupabase: false,
    restart: false,
    isUpdateLastBlock: false,
}

const MODE_ONLY_WRITE_CONSTANTS: OnlyWriteSyncConfig = {
    ...COMMON_CONSTANT,
    mode: 'onlyWrite',
    onlyWrite: 'metadataBox',
}

const MODE_SYNC_CONSTANT: AllDataSyncConfig = {
    ...COMMON_CONSTANT,
    mode: 'AllData',
    writeMetadataBox: false,
}



// You can change the mode here to control the entire script behavior
export const CONTROLLER = controller('AllData');
