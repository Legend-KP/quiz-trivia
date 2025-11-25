// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title BetModeVault
 * @notice Fully custodial vault - Contract holds ALL user funds
 * @dev Owner can withdraw funds, users can deposit/withdraw via contract
 * 
 * Key Features:
 * - Contract holds all deposited QT tokens
 * - Admin signature required for user withdrawals
 * - Owner can withdraw funds (for burns, platform fees, etc.)
 * - Emergency pause functionality
 * - Full event emission for database sync
 */
contract BetModeVault is Ownable, Pausable, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ===== STATE VARIABLES =====
    
    /// @notice QT Token contract
    IERC20 public immutable qtToken;
    
    /// @notice Admin signer address (backend server)
    address public adminSigner;
    
    /// @notice User balances (tracked in contract)
    mapping(address => uint256) public userBalances;
    
    /// @notice Total deposited per user (lifetime tracking)
    mapping(address => uint256) public totalDeposits;
    
    /// @notice Total withdrawn per user (lifetime tracking)
    mapping(address => uint256) public totalWithdrawals;
    
    /// @notice Nonces for withdrawal signatures (prevent replay attacks)
    mapping(address => uint256) public withdrawalNonces;
    
    /// @notice Nonces for balance update signatures (prevent replay attacks)
    mapping(address => uint256) public balanceUpdateNonces;
    
    /// @notice Minimum deposit amount
    uint256 public constant MIN_DEPOSIT = 1_000 * 1e18; // 1K QT
    
    /// @notice Minimum withdrawal amount
    uint256 public constant MIN_WITHDRAWAL = 1_000 * 1e18; // 1K QT
    
    /// @notice Total QT locked in contract
    uint256 public totalContractBalance;
    
    // ===== EVENTS =====
    
    event Deposited(
        address indexed user,
        uint256 amount,
        uint256 newBalance,
        uint256 timestamp
    );
    
    event Withdrawn(
        address indexed user,
        uint256 amount,
        uint256 newBalance,
        uint256 nonce,
        uint256 timestamp
    );
    
    event OwnerWithdrawal(
        address indexed owner,
        uint256 amount,
        uint256 remainingBalance,
        uint256 timestamp
    );
    
    event AdminSignerUpdated(
        address indexed oldSigner,
        address indexed newSigner
    );
    
    event EmergencyWithdrawal(
        address indexed admin,
        uint256 amount,
        uint256 timestamp
    );
    
    event BalanceCredited(
        address indexed user,
        uint256 amount,
        uint256 newBalance,
        uint256 nonce,
        uint256 timestamp
    );
    
    event BalanceDebited(
        address indexed user,
        uint256 amount,
        uint256 newBalance,
        uint256 nonce,
        uint256 timestamp
    );
    
    // ===== ERRORS =====
    
    error InsufficientAmount();
    error InvalidSignature();
    error InsufficientContractBalance();
    error InsufficientUserBalance();
    error TransferFailed();
    error InvalidNonce();
    error InvalidAddress();
    
    // ===== CONSTRUCTOR =====
    
    /**
     * @notice Initialize the BetModeVault contract
     * @param _qtToken Address of the QT token contract
     * @param _adminSigner Address that signs withdrawal authorizations
     */
    constructor(
        address _qtToken,
        address _adminSigner
    ) Ownable(msg.sender) {
        if (_qtToken == address(0)) revert InvalidAddress();
        if (_adminSigner == address(0)) revert InvalidAddress();
        
        qtToken = IERC20(_qtToken);
        adminSigner = _adminSigner;
    }
    
    // ===== USER FUNCTIONS =====
    
    /**
     * @notice Deposit QT tokens into Bet Mode
     * @param amount Amount of QT tokens to deposit (minimum 1K QT)
     * 
     * Flow:
     * 1. User approves contract to spend QT tokens
     * 2. User calls this function
     * 3. Contract transfers tokens from user to ITSELF
     * 4. Contract records user balance
     * 5. Backend listens to event and updates database
     */
    function deposit(uint256 amount) external whenNotPaused nonReentrant {
        if (amount < MIN_DEPOSIT) revert InsufficientAmount();
        
        // Transfer QT from user to THIS CONTRACT
        bool success = qtToken.transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();
        
        // Update user balance
        userBalances[msg.sender] += amount;
        totalDeposits[msg.sender] += amount;
        totalContractBalance += amount;
        
        emit Deposited(
            msg.sender,
            amount,
            userBalances[msg.sender],
            block.timestamp
        );
    }
    
    /**
     * @notice Withdraw QT tokens from Bet Mode
     * @param amount Amount of QT tokens to withdraw (minimum 1K QT)
     * @param nonce Unique nonce for this withdrawal (prevents replay)
     * @param signature Admin signature authorizing withdrawal
     * 
     * Flow:
     * 1. User requests withdrawal via API
     * 2. Backend verifies user has sufficient balance in DB
     * 3. Backend generates signature
     * 4. User calls this function with signature
     * 5. Contract verifies signature and user balance
     * 6. Contract sends QT tokens from ITSELF to user
     * 7. Backend listens to event and updates database
     */
    function withdraw(
        uint256 amount,
        uint256 nonce,
        bytes calldata signature
    ) external whenNotPaused nonReentrant {
        if (amount < MIN_WITHDRAWAL) revert InsufficientAmount();
        
        // Verify nonce (must match expected nonce for user)
        if (nonce != withdrawalNonces[msg.sender]) revert InvalidNonce();
        
        // Verify signature from admin
        bytes32 messageHash = keccak256(abi.encodePacked(
            msg.sender,
            amount,
            nonce,
            block.chainid,
            address(this)
        ));
        
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address signer = ECDSA.recover(ethSignedMessageHash, signature);
        
        if (signer != adminSigner) revert InvalidSignature();
        
        // Check user has balance in contract
        if (userBalances[msg.sender] < amount) revert InsufficientUserBalance();
        
        // Check contract has enough QT tokens
        uint256 contractBalance = qtToken.balanceOf(address(this));
        if (contractBalance < amount) revert InsufficientContractBalance();
        
        // Update nonce (prevents signature reuse)
        withdrawalNonces[msg.sender]++;
        
        // Update balances
        userBalances[msg.sender] -= amount;
        totalWithdrawals[msg.sender] += amount;
        totalContractBalance -= amount;
        
        // Transfer QT from contract to user
        bool success = qtToken.transfer(msg.sender, amount);
        if (!success) revert TransferFailed();
        
        emit Withdrawn(
            msg.sender,
            amount,
            userBalances[msg.sender],
            nonce,
            block.timestamp
        );
    }
    
    /**
     * @notice Credit user balance (for game winnings)
     * @param user User address to credit
     * @param amount Amount of QT tokens to credit
     * @param nonce Unique nonce for this update (prevents replay)
     * @param signature Admin signature authorizing this credit
     * 
     * Flow:
     * 1. User wins in Bet Mode (off-chain)
     * 2. Backend generates signature
     * 3. Backend calls this function with signature
     * 4. Contract verifies signature and updates balance
     * 5. Backend listens to event and confirms sync
     */
    function creditBalance(
        address user,
        uint256 amount,
        uint256 nonce,
        bytes calldata signature
    ) external whenNotPaused nonReentrant {
        if (user == address(0)) revert InvalidAddress();
        if (amount == 0) revert InsufficientAmount();
        
        // Verify nonce (must match expected nonce for user)
        if (nonce != balanceUpdateNonces[user]) revert InvalidNonce();
        
        // Verify signature from admin
        bytes32 messageHash = keccak256(abi.encodePacked(
            user,
            amount,
            nonce,
            block.chainid,
            address(this),
            "CREDIT" // Include action type to prevent signature reuse
        ));
        
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address signer = ECDSA.recover(ethSignedMessageHash, signature);
        
        if (signer != adminSigner) revert InvalidSignature();
        
        // Update nonce (prevents signature reuse)
        balanceUpdateNonces[user]++;
        
        // Update balances
        userBalances[user] += amount;
        totalContractBalance += amount;
        
        emit BalanceCredited(
            user,
            amount,
            userBalances[user],
            nonce,
            block.timestamp
        );
    }
    
    /**
     * @notice Debit user balance (for game losses)
     * @param user User address to debit
     * @param amount Amount of QT tokens to debit
     * @param nonce Unique nonce for this update (prevents replay)
     * @param signature Admin signature authorizing this debit
     * 
     * Flow:
     * 1. User loses in Bet Mode (off-chain)
     * 2. Backend generates signature
     * 3. Backend calls this function with signature
     * 4. Contract verifies signature and updates balance
     * 5. Backend listens to event and confirms sync
     */
    function debitBalance(
        address user,
        uint256 amount,
        uint256 nonce,
        bytes calldata signature
    ) external whenNotPaused nonReentrant {
        if (user == address(0)) revert InvalidAddress();
        if (amount == 0) revert InsufficientAmount();
        
        // Verify nonce (must match expected nonce for user)
        if (nonce != balanceUpdateNonces[user]) revert InvalidNonce();
        
        // Verify signature from admin
        bytes32 messageHash = keccak256(abi.encodePacked(
            user,
            amount,
            nonce,
            block.chainid,
            address(this),
            "DEBIT" // Include action type to prevent signature reuse
        ));
        
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address signer = ECDSA.recover(ethSignedMessageHash, signature);
        
        if (signer != adminSigner) revert InvalidSignature();
        
        // Check user has balance in contract
        if (userBalances[user] < amount) revert InsufficientUserBalance();
        
        // Update nonce (prevents signature reuse)
        balanceUpdateNonces[user]++;
        
        // Update balances
        userBalances[user] -= amount;
        totalContractBalance -= amount;
        
        emit BalanceDebited(
            user,
            amount,
            userBalances[user],
            nonce,
            block.timestamp
        );
    }
    
    // ===== VIEW FUNCTIONS =====
    
    /**
     * @notice Get user's current balance in contract
     * @param user User address
     * @return Current balance available for withdrawal
     */
    function getBalance(address user) external view returns (uint256) {
        return userBalances[user];
    }
    
    /**
     * @notice Get comprehensive user statistics
     * @param user User address
     * @return currentBalance Current balance in contract
     * @return deposited Total deposited (lifetime)
     * @return withdrawn Total withdrawn (lifetime)
     * @return nextNonce Next valid nonce for withdrawals
     * @return nextBalanceUpdateNonce Next valid nonce for balance updates
     */
    function getUserStats(address user) external view returns (
        uint256 currentBalance,
        uint256 deposited,
        uint256 withdrawn,
        uint256 nextNonce,
        uint256 nextBalanceUpdateNonce
    ) {
        currentBalance = userBalances[user];
        deposited = totalDeposits[user];
        withdrawn = totalWithdrawals[user];
        nextNonce = withdrawalNonces[user];
        nextBalanceUpdateNonce = balanceUpdateNonces[user];
    }
    
    /**
     * @notice Get contract's total QT token balance
     * @return Total QT tokens held by contract
     */
    function getContractBalance() external view returns (uint256) {
        return qtToken.balanceOf(address(this));
    }
    
    /**
     * @notice Get total of all user balances tracked
     * @return Total user balances (should match contract balance)
     */
    function getTotalUserBalances() external view returns (uint256) {
        return totalContractBalance;
    }
    
    // ===== OWNER FUNCTIONS =====
    
    /**
     * @notice Owner withdraws QT tokens from contract
     * @param amount Amount of QT to withdraw
     * @dev CRITICAL: This allows owner to withdraw funds from contract
     *      Use responsibly - affects user withdrawal capability
     */
    function ownerWithdraw(uint256 amount) external onlyOwner nonReentrant {
        uint256 contractBalance = qtToken.balanceOf(address(this));
        
        if (amount > contractBalance) revert InsufficientContractBalance();
        
        bool success = qtToken.transfer(owner(), amount);
        if (!success) revert TransferFailed();
        
        emit OwnerWithdrawal(
            owner(),
            amount,
            qtToken.balanceOf(address(this)),
            block.timestamp
        );
    }
    
    /**
     * @notice Owner withdraws ALL QT tokens from contract
     * @dev Emergency function - withdraws entire contract balance
     */
    function ownerWithdrawAll() external onlyOwner nonReentrant {
        uint256 contractBalance = qtToken.balanceOf(address(this));
        
        if (contractBalance == 0) revert InsufficientContractBalance();
        
        bool success = qtToken.transfer(owner(), contractBalance);
        if (!success) revert TransferFailed();
        
        emit OwnerWithdrawal(
            owner(),
            contractBalance,
            0,
            block.timestamp
        );
    }
    
    /**
     * @notice Update admin signer address
     * @param newSigner New admin signer address
     */
    function updateAdminSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert InvalidAddress();
        
        address oldSigner = adminSigner;
        adminSigner = newSigner;
        
        emit AdminSignerUpdated(oldSigner, newSigner);
    }
    
    /**
     * @notice Pause contract (emergency only)
     * @dev Stops deposits and withdrawals
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause contract
     * @dev Resumes normal operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Emergency withdrawal (same as ownerWithdraw)
     * @param amount Amount to withdraw
     * @dev Alias for ownerWithdraw for backward compatibility
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        uint256 contractBalance = qtToken.balanceOf(address(this));
        
        if (amount > contractBalance) revert InsufficientContractBalance();
        
        bool success = qtToken.transfer(owner(), amount);
        if (!success) revert TransferFailed();
        
        emit EmergencyWithdrawal(owner(), amount, block.timestamp);
    }
    
    // ===== UTILITY FUNCTIONS =====
    
    /**
     * @notice Check if contract balance matches sum of user balances
     * @return balanced True if balanced, false if mismatch
     * @return contractBal Actual contract QT balance
     * @return userBal Sum of all user balances
     */
    function checkBalanceIntegrity() external view returns (
        bool balanced,
        uint256 contractBal,
        uint256 userBal
    ) {
        contractBal = qtToken.balanceOf(address(this));
        userBal = totalContractBalance;
        balanced = (contractBal == userBal);
    }
}

