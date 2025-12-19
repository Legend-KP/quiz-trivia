// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SpinWheelQTDistributor
 * @dev Smart contract for distributing variable QT token rewards from spin wheel
 */
contract SpinWheelQTDistributor {
    using SafeERC20 for IERC20;
    
    IERC20 public qtToken;
    address public owner;
    
    // Reward amounts (with 18 decimals)
    uint256 public constant REWARD_100_QT = 100 * 10**18;
    uint256 public constant REWARD_200_QT = 200 * 10**18;
    uint256 public constant REWARD_500_QT = 500 * 10**18;
    uint256 public constant REWARD_1000_QT = 1000 * 10**18;
    uint256 public constant REWARD_2000_QT = 2000 * 10**18;
    uint256 public constant REWARD_10000_QT = 10000 * 10**18;
    
    // Cooldown period (1 hour = 3600 seconds)
    uint256 public constant COOLDOWN_PERIOD = 3600;
    
    // Track last claim timestamp per user
    mapping(address => uint256) public lastClaimTimestamp;
    mapping(address => uint256) public totalClaims;
    
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
        require(_qtTokenAddress != address(0), "Invalid QT token address");
        qtToken = IERC20(_qtTokenAddress);
        owner = msg.sender;
    }
    
    /**
     * @dev Check if user can claim (cooldown check)
     */
    function canClaim(address user) public view returns (bool) {
        return block.timestamp >= lastClaimTimestamp[user] + COOLDOWN_PERIOD;
    }
    
    /**
     * @dev Get remaining cooldown time
     */
    function getRemainingCooldown(address user) public view returns (uint256) {
        if (canClaim(user)) {
            return 0;
        }
        return (lastClaimTimestamp[user] + COOLDOWN_PERIOD) - block.timestamp;
    }
    
    /**
     * @dev Claim QT token reward based on spin result
     * @param rewardAmount The amount won (100, 200, 500, 1000, 2000, or 10000)
     */
    function claimSpinReward(uint256 rewardAmount) external nonReentrant {
        require(canClaim(msg.sender), "Cooldown period not passed");
        require(isValidRewardAmount(rewardAmount), "Invalid reward amount");
        
        uint256 amountWithDecimals = rewardAmount * 10**18;
        require(getQTBalance() >= amountWithDecimals, "Insufficient QT tokens in contract");
        
        // Update claim tracking
        lastClaimTimestamp[msg.sender] = block.timestamp;
        totalClaims[msg.sender]++;
        
        // Transfer QT tokens to user using SafeERC20
        qtToken.safeTransfer(msg.sender, amountWithDecimals);
        
        emit QTRewardClaimed(msg.sender, amountWithDecimals, block.timestamp);
    }
    
    /**
     * @dev Claim QT reward for a specific user (owner only)
     */
    function claimSpinRewardForUser(address userAddress, uint256 rewardAmount) external onlyOwner nonReentrant {
        require(canClaim(userAddress), "Cooldown period not passed");
        require(isValidRewardAmount(rewardAmount), "Invalid reward amount");
        
        uint256 amountWithDecimals = rewardAmount * 10**18;
        require(getQTBalance() >= amountWithDecimals, "Insufficient QT tokens in contract");
        
        lastClaimTimestamp[userAddress] = block.timestamp;
        totalClaims[userAddress]++;
        
        // Transfer QT tokens to user using SafeERC20
        qtToken.safeTransfer(userAddress, amountWithDecimals);
        
        emit QTRewardClaimed(userAddress, amountWithDecimals, block.timestamp);
    }
    
    /**
     * @dev Validate if reward amount is allowed
     */
    function isValidRewardAmount(uint256 amount) public pure returns (bool) {
        return amount == 100 || amount == 200 || amount == 500 || 
               amount == 1000 || amount == 2000 || amount == 10000;
    }
    
    /**
     * @dev Deposit QT tokens to contract (owner only)
     */
    function depositQTTokens(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        uint256 amountWithDecimals = amount * 10**18;
        qtToken.safeTransferFrom(msg.sender, address(this), amountWithDecimals);
        emit QTTokensDeposited(amountWithDecimals, block.timestamp);
    }
    
    /**
     * @dev Withdraw QT tokens from contract (owner only)
     */
    function withdrawQTTokens(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        uint256 amountWithDecimals = amount * 10**18;
        qtToken.safeTransfer(msg.sender, amountWithDecimals);
        emit QTTokensWithdrawn(amountWithDecimals, block.timestamp);
    }
    
    /**
     * @dev Get contract's QT balance
     */
    function getQTBalance() public view returns (uint256) {
        return qtToken.balanceOf(address(this));
    }
    
    /**
     * @dev Get contract's QT balance (readable format)
     */
    function getQTBalanceReadable() public view returns (uint256) {
        return qtToken.balanceOf(address(this)) / 10**18;
    }
    
    /**
     * @dev Get user's claim status
     */
    function getUserClaimStatus(address user) external view returns (
        uint256 lastClaim, 
        bool canClaimNow, 
        uint256 remainingCooldown,
        uint256 totalUserClaims
    ) {
        return (
            lastClaimTimestamp[user], 
            canClaim(user),
            getRemainingCooldown(user),
            totalClaims[user]
        );
    }
    
    /**
     * @dev Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
}
