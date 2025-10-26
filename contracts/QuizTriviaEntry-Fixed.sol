// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title QuizTriviaSignature - DOUBLE PREFIX FIX VERSION
 * @dev This version handles both raw and prefixed signatures
 * @notice Users sign messages to start quizzes - NO PAYMENT REQUIRED
 */
contract QuizTriviaSignature {
    // Events
    event QuizStarted(
        address indexed user,
        uint256 indexed mode,
        uint256 timestamp,
        bytes32 signatureHash
    );
    
    event QuizCompleted(
        address indexed user,
        uint256 indexed mode,
        uint256 score,
        uint256 timestamp
    );
    
    // Quiz modes
    enum QuizMode {
        CLASSIC,    // 0
        TIME_MODE,  // 1
        CHALLENGE   // 2
    }
    
    // Owner
    address public owner;
    
    // Quiz statistics
    mapping(address => uint256) public userQuizCount;
    mapping(QuizMode => uint256) public modeCount;
    mapping(bytes32 => bool) public usedSignatures;
    uint256 public totalQuizzes;
    
    // Nonce to prevent replay attacks
    mapping(address => uint256) public userNonce;
    
    // Modifier
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Start a quiz with signature verification (NO PAYMENT)
     * @param mode The quiz mode (0=Classic, 1=Time, 2=Challenge)
     * @param timestamp The timestamp when user initiated
     * @param signature The user's signature proving intent to start
     */
    function startQuizWithSignature(
        QuizMode mode,
        uint256 timestamp,
        bytes memory signature
    ) external {
        require(mode <= QuizMode.CHALLENGE, "Invalid mode");
        require(block.timestamp - timestamp < 300, "Signature expired"); // 5 min validity
        
        // Create the message hash that was signed
        bytes32 messageHash = getMessageHash(msg.sender, mode, timestamp, userNonce[msg.sender]);
        
        // Verify signature hasn't been used
        require(!usedSignatures[messageHash], "Signature already used");
        
        // 🔑 FIX: Try both signature verification methods
        address recoveredSigner = recoverSignerFlexible(messageHash, signature);
        require(recoveredSigner == msg.sender, "Invalid signature");
        
        // Mark signature as used
        usedSignatures[messageHash] = true;
        
        // Increment nonce to prevent replay
        userNonce[msg.sender]++;
        
        // Update statistics
        userQuizCount[msg.sender]++;
        modeCount[mode]++;
        totalQuizzes++;
        
        // Emit event
        emit QuizStarted(msg.sender, uint256(mode), block.timestamp, messageHash);
    }
    
    /**
     * @dev Get the message hash for signing
     * This creates the raw hash that will be signed by the user
     */
    function getMessageHash(
        address user,
        QuizMode mode,
        uint256 timestamp,
        uint256 nonce
    ) public pure returns (bytes32) {
        // Create the raw message hash
        return keccak256(abi.encodePacked(user, mode, timestamp, nonce));
    }
    
    /**
     * @dev Get the Ethereum Signed Message hash
     * This is what ethers.js actually signs
     */
    function getEthSignedMessageHash(bytes32 messageHash) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            messageHash
        ));
    }
    
    /**
     * @dev FLEXIBLE signature recovery - handles both raw and prefixed signatures
     * This tries both methods to handle different wallet implementations
     */
    function recoverSignerFlexible(
        bytes32 messageHash,
        bytes memory signature
    ) public pure returns (address) {
        require(signature.length == 65, "Invalid signature length");
        
        // Split signature into r, s, v
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        
        // Adjust v if needed
        if (v < 27) {
            v += 27;
        }
        
        require(v == 27 || v == 28, "Invalid signature v value");
        
        // Method 1: Try with Ethereum prefix (for wallets that don't add it)
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);
        address signer1 = ecrecover(ethSignedMessageHash, v, r, s);
        
        // Method 2: Try without prefix (for wallets that already add it)
        address signer2 = ecrecover(messageHash, v, r, s);
        
        // Return the first valid signer (non-zero address)
        if (signer1 != address(0)) {
            return signer1;
        }
        
        if (signer2 != address(0)) {
            return signer2;
        }
        
        // If both fail, revert
        revert("Invalid signature");
    }
    
    /**
     * @dev Original recoverSigner function (kept for compatibility)
     */
    function recoverSigner(
        bytes32 messageHash,
        bytes memory signature
    ) public pure returns (address) {
        require(signature.length == 65, "Invalid signature length");
        
        // Split signature into r, s, v
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        
        // Adjust v if needed
        if (v < 27) {
            v += 27;
        }
        
        require(v == 27 || v == 28, "Invalid signature v value");
        
        // Add Ethereum Signed Message prefix before recovery
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);
        
        // Recover and return the signer
        return ecrecover(ethSignedMessageHash, v, r, s);
    }
    
    /**
     * @dev Verify a signature (for testing/debugging)
     * Returns true if signature is valid for the given signer
     */
    function verifySignature(
        address user,
        QuizMode mode,
        uint256 timestamp,
        uint256 nonce,
        bytes memory signature
    ) public pure returns (bool) {
        bytes32 messageHash = getMessageHash(user, mode, timestamp, nonce);
        address recoveredSigner = recoverSignerFlexible(messageHash, signature);
        return recoveredSigner == user;
    }
    
    /**
     * @dev Record quiz completion
     */
    function recordQuizCompletion(
        address user,
        QuizMode mode,
        uint256 score
    ) external {
        require(mode <= QuizMode.CHALLENGE, "Invalid mode");
        emit QuizCompleted(user, uint256(mode), score, block.timestamp);
    }
    
    /**
     * @dev Get user's quiz count
     */
    function getUserQuizCount(address user) external view returns (uint256) {
        return userQuizCount[user];
    }
    
    /**
     * @dev Get user's current nonce
     */
    function getUserNonce(address user) external view returns (uint256) {
        return userNonce[user];
    }
    
    /**
     * @dev Get total statistics
     */
    function getStats() external view returns (
        uint256 total,
        uint256 classic,
        uint256 time,
        uint256 challenge
    ) {
        return (
            totalQuizzes,
            modeCount[QuizMode.CLASSIC],
            modeCount[QuizMode.TIME_MODE],
            modeCount[QuizMode.CHALLENGE]
        );
    }
    
    /**
     * @dev Withdraw contract balance (for any accidental sends)
     */
    function withdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}
