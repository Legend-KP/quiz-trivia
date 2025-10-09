// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title QuizTriviaEntry
 * @dev Smart contract for Quiz Trivia blockchain integration
 * @notice Users pay a small fee to start quizzes, creating on-chain records
 */
contract QuizTriviaEntry {
    // Events
    event QuizStarted(
        address indexed user,
        uint256 indexed mode,
        uint256 timestamp,
        uint256 entryFee
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
    
    // Entry fees (in wei)
    uint256 public constant CLASSIC_FEE = 0.001 ether;    // ~$0.001
    uint256 public constant TIME_MODE_FEE = 0.001 ether; // ~$0.001
    uint256 public constant CHALLENGE_FEE = 0.001 ether; // ~$0.001
    
    // Owner
    address public owner;
    
    // Quiz statistics
    mapping(address => uint256) public userQuizCount;
    mapping(QuizMode => uint256) public modeCount;
    uint256 public totalQuizzes;
    
    // Modifier
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Start a quiz with blockchain verification
     * @param mode The quiz mode (0=Classic, 1=Time, 2=Challenge)
     */
    function startQuiz(QuizMode mode) external payable {
        require(mode <= QuizMode.CHALLENGE, "Invalid mode");
        
        uint256 requiredFee;
        if (mode == QuizMode.CLASSIC) {
            requiredFee = CLASSIC_FEE;
        } else if (mode == QuizMode.TIME_MODE) {
            requiredFee = TIME_MODE_FEE;
        } else if (mode == QuizMode.CHALLENGE) {
            requiredFee = CHALLENGE_FEE;
        }
        
        require(msg.value >= requiredFee, "Insufficient fee");
        
        // Update statistics
        userQuizCount[msg.sender]++;
        modeCount[mode]++;
        totalQuizzes++;
        
        // Emit event
        emit QuizStarted(msg.sender, uint256(mode), block.timestamp, msg.value);
    }
    
    /**
     * @dev Record quiz completion (can be called by anyone for verification)
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
     * @dev Withdraw contract balance (owner only)
     */
    function withdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    /**
     * @dev Get the required fee for a quiz mode
     * @param mode The quiz mode
     * @return The required fee in wei
     */
    function getRequiredFee(QuizMode mode) external pure returns (uint256) {
        if (mode == QuizMode.CLASSIC) {
            return CLASSIC_FEE;
        } else if (mode == QuizMode.TIME_MODE) {
            return TIME_MODE_FEE;
        } else if (mode == QuizMode.CHALLENGE) {
            return CHALLENGE_FEE;
        }
        return 0;
    }
}