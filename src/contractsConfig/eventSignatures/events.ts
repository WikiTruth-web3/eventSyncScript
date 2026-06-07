import { ContractName } from '../types';


export const CONTRACT_EVENT_SIGNATURES: Record<ContractName, string[]> = {
    [ContractName.FORWARDER]: [
        'event Paused(address indexed account)',
        'event Unpaused(address indexed account)',
    ],
    [ContractName.EXCHANGE]: [
        'event BoxListed(uint256 indexed boxId, bytes32 userId, address acceptedToken)',
        'event BoxPurchased(uint256 indexed boxId, bytes32 indexed userId)',
        'event BidPlaced(uint256 indexed boxId, bytes32 indexed userId)',
        'event CompleterAssigned(uint256 indexed boxId, bytes32 indexed userId)',
        'event RequestDeadlineChanged(uint256 indexed boxId, uint256 deadline)',
        'event ArbitrationDeadineChanged(uint256 indexed boxId, uint256 deadline)',
        'event RefundPermitChanged(uint256 indexed boxId, bool permission)',
    ],

    [ContractName.FUND_MANAGER]: [
        'event Payment(uint256 indexed boxId, bytes32 indexed userId, address indexed token, uint256 amount, uint8 pt)',
        'event OrderAmountWithdraw(uint256[] list, address indexed token, bytes32 indexed userId, uint256 amount)',
        'event RefundAmountWithdraw(uint256[] list, address indexed token, bytes32 indexed userId, uint256 amount)',
        'event RewardAdded(uint256 indexed boxId, bytes32 indexed userId, address indexed token, uint256 amount)',
        'event RewardWithdraw(bytes32 indexed userId, address indexed token, uint256 amount)',
    ],

    [ContractName.BLIND_BOX]: [
        'event BoxCreated(uint256 indexed boxId, bytes32 indexed userId, string boxInfoCID)',
        'event BoxStatusChanged(uint256 indexed boxId, uint8 status)',
        'event PriceChanged(uint256 indexed boxId, uint256 price)',
        'event DeadlineChanged(uint256 indexed boxId, uint256 deadline)',
    ],

    [ContractName.USER_MANAGER]: [
        'event Blacklisted(address user, bool status)',
    ],

    // Other contracts (not needed for sync script, but keep empty arrays to maintain type consistency)
    [ContractName.ADDRESS_MANAGER]: [],
    [ContractName.SIWE_AUTH]: [],
};

/**
 * Get all event signatures for a specified contract
 * @param contractName - Contract name
 * @returns Event signatures array
 */
export function getContractEventSignatures(contractName: ContractName): string[] {
    return CONTRACT_EVENT_SIGNATURES[contractName] || [];
}

/**
 * Get all contracts to sync and their event signatures
 * @returns Mapping of contract name to event signatures array
 */
export function getAllSyncContracts(): Record<string, string[]> {
    const syncContracts: Record<string, string[]> = {};

    // Only return contracts with events
    Object.entries(CONTRACT_EVENT_SIGNATURES).forEach(([contractName, signatures]) => {
        if (signatures.length > 0) {
            syncContracts[contractName] = signatures;
        }
    });

    return syncContracts;
}
