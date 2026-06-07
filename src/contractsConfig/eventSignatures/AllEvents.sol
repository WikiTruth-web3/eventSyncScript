// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity ^0.8.24;

// ====================
enum BoxStatus {
    Storing,
    Selling,
    Auctioning,
    Paid,
    Delaying,
    Refunding,
    Published,
    Blacklisted
}
enum PayType {
    OrderAmount,
    DelayFee
}

enum FundType {
    Order,
    Refund
}

interface AllEvents {
    // ========== BlindBox ==========
    event BoxCreated(
        uint256 indexed boxId,
        bytes32 indexed userId,
        string boxInfoCID
    );
    event BoxStatusChanged(uint256 indexed boxId, BoxStatus status);
    event PriceChanged(uint256 indexed boxId, uint256 price);
    event DeadlineChanged(uint256 indexed boxId, uint256 deadline);

    // ========== Exchange ==========
    event BoxListed(
        uint256 indexed boxId,
        bytes32 userId,
        address acceptedToken
    );
    event BoxPurchased(uint256 indexed boxId, bytes32 indexed userId);
    event BidPlaced(uint256 indexed boxId, bytes32 indexed userId);
    event CompleterAssigned(uint256 indexed boxId, bytes32 indexed userId);
    event RequestDeadlineChanged(uint256 indexed boxId, uint256 deadline);
    event ArbitrationDeadineChanged(uint256 indexed boxId, uint256 deadline);
    event RefundPermitChanged(uint256 indexed boxId, bool permission);

    // ========== FundManager ==========
    event Payment(
        uint256 indexed boxId,
        bytes32 indexed userId,
        address indexed token,
        uint256 amount,
        PayType pt
    );

    event OrderAmountWithdraw(
        uint256[] list,
        address indexed token,
        bytes32 indexed userId,
        uint256 amount
    );

    event RefundAmountWithdraw(
        uint256[] list,
        address indexed token,
        bytes32 indexed userId,
        uint256 amount
    );

    event RewardAdded(
        uint256 indexed boxId,
        bytes32 indexed userId,
        address indexed token,
        uint256 amount
    );

    event RewardWithdraw(
        bytes32 indexed userId,
        address indexed token,
        uint256 amount
    );

    // event Paused(address indexed account);
    // event Unpaused(address indexed account);


    // ========== UserManager ==========
    event Blacklisted(address user, bool status);

    //============ Forwarder ============
    event Paused(address indexed account);
    event Unpaused(address indexed account);


}
