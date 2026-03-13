import { ContractAddresses, ContractName } from '../types';
import deployedAddresses from '../chain-23295/deployed_addresses.json';

export const TESTNET_ADDRESSES: ContractAddresses = {
  [ContractName.FORWARDER]: {
    address: deployedAddresses['Forwarder'] as `0x${string}`,
    startBlock: 14458354,
  },
  [ContractName.TRUTH_BOX]: {
    address: deployedAddresses['TruthBox'] as `0x${string}`,
    startBlock: 14458354,
  },
  [ContractName.EXCHANGE]: {
    address: deployedAddresses['Exchange'] as `0x${string}`,
    startBlock: 14458354,
  },
  [ContractName.FUND_MANAGER]: {
    address: deployedAddresses['FundManager'] as `0x${string}`,
    startBlock: 14458354,
  },
  [ContractName.USER_MANAGER]: {
    address: deployedAddresses['UserManager'] as `0x${string}`,
    startBlock: 14458354,
  },
};
