import { ContractAddresses, ContractName } from '../types';
import contractsAddress from '../chain-23295/contracts-testnet.json';

export const TESTNET_ADDRESSES: ContractAddresses = {
  [ContractName.FORWARDER]: {
    address: contractsAddress.Main.Forwarder as `0x${string}`,
    startBlock: 14458354,
  },
  [ContractName.BLIND_BOX]: {
    address: contractsAddress.Main.BlindBox as `0x${string}`,
    startBlock: 14458354,
  },
  [ContractName.EXCHANGE]: {
    address: contractsAddress.Main.Exchange as `0x${string}`,
    startBlock: 14458354,
  },
  [ContractName.FUND_MANAGER]: {
    address: contractsAddress.Main.FundManager as `0x${string}`,
    startBlock: 14458354,
  },
  [ContractName.USER_MANAGER]: {
    address: contractsAddress.Main.UserManager as `0x${string}`,
    startBlock: 14458354,
  },
};
