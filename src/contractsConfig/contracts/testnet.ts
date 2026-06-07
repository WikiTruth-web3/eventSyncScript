import { ContractAddresses, ContractName } from '../types';
import contractsAddress from '../chain-23295/deployed_addresses.json';

export const TESTNET_ADDRESSES: ContractAddresses = {
  [ContractName.FORWARDER]: {
    address: contractsAddress['Forwarder'] as `0x${string}`,
    startBlock: 14458354,
  },
  [ContractName.BLIND_BOX]: {
    address: contractsAddress['TruthBox'] as `0x${string}`,
    startBlock: 14458354,
  },
  [ContractName.EXCHANGE]: {
    address: contractsAddress['Exchange'] as `0x${string}`,
    startBlock: 14458354,
  },
  [ContractName.FUND_MANAGER]: {
    address: contractsAddress['FundManager'] as `0x${string}`,
    startBlock: 14458354,
  },
  [ContractName.USER_MANAGER]: {
    address: contractsAddress['UserManager'] as `0x${string}`,
    startBlock: 14458354,
  },
};
