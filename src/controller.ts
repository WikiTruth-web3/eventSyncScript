
export type WriteListType = 
  | 'metadataBox' 
  | 'truthBox' 
  | 'truthNFT' 
  | 'exchange' 
  | 'fundManager' 
  | 'userId' ;


export interface CommonType {
    writeToSupabase: boolean;
    restart: boolean;
    isUpdateLastBlock: boolean;
    writeList: WriteListType[];
  }

// ==========================================
// ==========================================

const COMMON_CONSTANT = {
    writeToSupabase: true,
    restart: false,
    isUpdateLastBlock: true,
}


const controller = (list: WriteListType[]): CommonType => {
    return {
        ...COMMON_CONSTANT,
        writeList: list,
    }
}





// You can change the mode here to control the entire script behavior
export const CONTROLLER = controller([
  'metadataBox',
  'truthBox',
  'truthNFT',
  'exchange',
  'fundManager',
  'userId',
]);
