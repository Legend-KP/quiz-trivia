// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DailyRewardDistributor
 * @dev Smart contract for distributing QT tokens as daily rewards
 * @notice Users can claim 1,000 QT tokens once per day
 */
contract DailyRewardDistributor {
    // QT Token contract
    address public qtToken;
    
    // Owner of the contract
    address public owner;
    
    // Reward amount (1,000 QT tokens with 18 decimals)
    uint256 public constant REWARD_AMOUNT = 1000 * 10**18;
    
    // Track daily claims per user
    mapping(address => uint256) public lastClaimDate;
    
    // Events
    event QTRewardClaimed(address indexed user, uint256 amount, uint256 timestamp);
    event QTTokensDeposited(uint256 amount, uint256 timestamp);
    event QTTokensWithdrawn(uint256 amount, uint256 timestamp);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }
    
    modifier nonReentrant() {
        require(!_reentrancyGuard, "ReentrancyGuard: reentrant call");
        _reentrancyGuard = true;
        _;
        _reentrancyGuard = false;
    }
    
    bool private _reentrancyGuard;
    
    constructor(address _qtTokenAddress) {
        qtToken = _qtTokenAddress;
        owner = msg.sender;
    }
    
    /**
     * @dev Check if user can claim today
     * @param user User address to check
     * @return canClaim True if user can claim today
     */
    function canClaimToday(address user) public view returns (bool) {
        uint256 today = block.timestamp / 86400; // Days since epoch
        return lastClaimDate[user] < today;
    }
    
    /**
     * @dev Claim QT token reward (once per day)
     */
    function claimQTReward() external nonReentrant {
        require(canClaimToday(msg.sender), "Already claimed today");
        require(getQTBalance() >= REWARD_AMOUNT, "Insufficient QT tokens in contract");
        
        // Update claim tracking
        uint256 today = block.timestamp / 86400;
        lastClaimDate[msg.sender] = today;
        
        // Transfer QT tokens to user
        require(transferQT(msg.sender, REWARD_AMOUNT), "QT token transfer failed");
        
        emit QTRewardClaimed(msg.sender, REWARD_AMOUNT, block.timestamp);
    }
    
    /**
     * @dev Claim QT reward for a specific user (owner only)
     * @param userAddress Address of the user to claim reward for
     */
    function claimQTRewardForUser(address userAddress) external onlyOwner nonReentrant {
        require(canClaimToday(userAddress), "User already claimed today");
        require(getQTBalance() >= REWARD_AMOUNT, "Insufficient QT tokens in contract");
        
        // Update claim tracking
        uint256 today = block.timestamp / 86400;
        lastClaimDate[userAddress] = today;
        
        // Transfer QT tokens to user
        require(transferQT(userAddress, REWARD_AMOUNT), "QT token transfer failed");
        
        emit QTRewardClaimed(userAddress, REWARD_AMOUNT, block.timestamp);
    }
    
    /**
     * @dev Deposit QT tokens to the contract (owner only)
     * @param amount Amount of QT tokens to deposit
     */
    function depositQTTokens(uint256 amount) external onlyOwner {
        require(transferFromQT(msg.sender, address(this), amount), "QT token transfer failed");
        emit QTTokensDeposited(amount, block.timestamp);
    }
    
    /**
     * @dev Withdraw QT tokens from the contract (owner only)
     * @param amount Amount of QT tokens to withdraw
     */
    function withdrawQTTokens(uint256 amount) external onlyOwner {
        require(transferQT(msg.sender, amount), "QT token transfer failed");
        emit QTTokensWithdrawn(amount, block.timestamp);
    }
    
    /**
     * @dev Get contract's QT token balance
     * @return balance Current QT token balance
     */
    function getQTBalance() public view returns (uint256) {
        return balanceOfQT(address(this));
    }
    
    /**
     * @dev Get user's claim status
     * @param user User address
     * @return lastClaim Last claim date
     * @return canClaim Whether user can claim today
     */
    function getUserClaimStatus(address user) external view returns (uint256 lastClaim, bool canClaim) {
        return (lastClaimDate[user], canClaimToday(user));
    }
    
    /**
     * @dev Transfer ownership of the contract
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner is the zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // Internal functions to interact with QT token
    function balanceOfQT(address account) internal view returns (uint256) {
        (bool success, bytes memory data) = qtToken.staticcall(
            abi.encodeWithSignature("balanceOf(address)", account)
        );
        require(success, "QT token balance call failed");
        return abi.decode(data, (uint256));
    }
    
    function transferQT(address to, uint256 amount) internal returns (bool) {
        (bool success, bytes memory data) = qtToken.call(
            abi.encodeWithSignature("transfer(address,uint256)", to, amount)
        );
        return success && (data.length == 0 || abi.decode(data, (bool)));
    }
    
    function transferFromQT(address from, address to, uint256 amount) internal returns (bool) {
        (bool success, bytes memory data) = qtToken.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount)
        );
        return success && (data.length == 0 || abi.decode(data, (bool)));
    }
}

