
export type QueryListType = 
  | 'metadataBox' 
  | 'truthBox' 
  | 'exchange' 
  | 'fundManager' 
  | 'userManager' 
  | 'forwarder';

export interface CommonType {
    writeToSupabase: boolean;
    restart: boolean;
    isUpdateLastBlock: boolean;
    queryList: QueryListType[];
  }

// ==========================================
// ==========================================

const COMMON_CONSTANT = {
    writeToSupabase: false,
    restart: false,
    isUpdateLastBlock: false,
}

const controller = (list: QueryListType[]): CommonType => {
    return {
        ...COMMON_CONSTANT,
        queryList: list,
    }
}

// You can change the mode here to control the entire script behavior
export const CONTROLLER = controller([
  'metadataBox',
  'truthBox',
  'exchange',
  'fundManager',
  'userManager',
  'forwarder',
]);
