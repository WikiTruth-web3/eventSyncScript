
export type QueryListType = 
  | 'metadataBox' 
  | 'blindBox' 
  | 'exchange' 
  | 'fundManager' 
  | 'userManager' 
  | 'forwarder';

export interface CommonType {
    writeToDatabase: boolean;
    restart: boolean;
    isUpdateLastBlock: boolean;
    queryList: QueryListType[];
  }

// ==========================================
// ==========================================

const COMMON_CONSTANT = {
    writeToDatabase: false,
    restart: true,
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
  'blindBox',
  'exchange',
  'fundManager',
  'userManager',
  'forwarder',
]);
