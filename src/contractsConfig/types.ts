

export enum ContractName {
  ADDRESS_MANAGER = 'ADDRESS_MANAGER',
  FORWARDER = 'FORWARDER',
  BLIND_BOX = 'BLIND_BOX',
  EXCHANGE = 'EXCHANGE',
  FUND_MANAGER = 'FUND_MANAGER',
  USER_MANAGER = 'USER_MANAGER',
  
  SIWE_AUTH = 'SIWE_AUTH',
}


export enum SupportedChainId {
  SAPPHIRE_TESTNET = 23295,
  SAPPHIRE_MAINNET = 23294,
}


export type ContractInfo = {
  address: `0x${string}`;
  startBlock: number;
};

/**
 * Contract address mapping (by contract name)
 */
export type ContractAddresses = {
  [key in ContractName]?: ContractInfo;
};

/**
 * Network contract address mapping (by chain ID)
 */
export type NetworkContractMap = {
  [chainId in SupportedChainId]: ContractAddresses;
};

/**
 * Event signature configuration
 * Each contract corresponds to an array of event signatures
 */
export type ContractEventSignatures = {
  [contractName: string]: string[];
};

