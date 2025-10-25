// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title QuizTriviaSignature
 * @dev Smart contract for Quiz Trivia with signature-based entry
 * @notice Users sign messages to start quizzes - NO PAYMENT REQUIRED
 * This creates a better UX while maintaining on-chain verification
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
        
        // Create the message hash
        bytes32 messageHash = getMessageHash(msg.sender, mode, timestamp, userNonce[msg.sender]);
        
        // Verify signature hasn't been used
        require(!usedSignatures[messageHash], "Signature already used");
        
        // Verify the signature is from the user
        require(verifySignature(messageHash, signature, msg.sender), "Invalid signature");
        
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
     * @param user The user address
     * @param mode The quiz mode
     * @param timestamp The timestamp
     * @param nonce The user's current nonce
     * @return The message hash to sign
     */
    function getMessageHash(
        address user,
        QuizMode mode,
        uint256 timestamp,
        uint256 nonce
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            keccak256(abi.encodePacked(user, mode, timestamp, nonce))
        ));
    }
    
    /**
     * @dev Verify a signature
     * @param messageHash The message hash
     * @param signature The signature to verify
     * @param signer The expected signer
     * @return True if signature is valid
     */
    function verifySignature(
        bytes32 messageHash,
        bytes memory signature,
        address signer
    ) internal pure returns (bool) {
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        if (signature.length != 65) {
            return false;
        }
        
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        
        if (v < 27) {
            v += 27;
        }
        
        if (v != 27 && v != 28) {
            return false;
        }
        
        return ecrecover(messageHash, v, r, s) == signer;
    }
    
    /**
     * @dev Record quiz completion
     * @param user The user who completed the quiz
     * @param mode The quiz mode
     * @param score The final score
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
     * @param user The user address
     * @return The number of quizzes started by this user
     */
    function getUserQuizCount(address user) external view returns (uint256) {
        return userQuizCount[user];
    }
    
    /**
     * @dev Get user's current nonce
     * @param user The user address
     * @return The current nonce
     */
    function getUserNonce(address user) external view returns (uint256) {
        return userNonce[user];
    }
    
    /**
     * @dev Get total statistics
     * @return total Total quizzes started
     * @return classic Total classic quizzes
     * @return time Total time mode quizzes
     * @return challenge Total challenge quizzes
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