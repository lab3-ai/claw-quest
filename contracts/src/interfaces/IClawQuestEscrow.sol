// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IClawQuestEscrow {
    // ──────────────────────────────────────────────
    //  Structs
    // ──────────────────────────────────────────────

    struct QuestEscrow {
        address sponsor;      // who deposited
        address token;        // ERC20 address, address(0) = native
        uint128 deposited;    // total deposited (token smallest unit)
        uint128 distributed;  // total distributed so far
        uint128 refunded;     // total refunded to sponsor
        uint64  createdAt;    // block.timestamp at deposit
        uint64  expiresAt;    // quest expiry (0 = no expiry)
        bool    cancelled;    // operator cancelled / refunded
    }

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event QuestFunded(
        bytes32 indexed questId,
        address indexed sponsor,
        address token,
        uint128 amount,
        uint64 expiresAt
    );

    event QuestDistributed(
        bytes32 indexed questId,
        address[] recipients,
        uint128[] amounts,
        uint128 totalPayout
    );

    event QuestRefunded(
        bytes32 indexed questId,
        address indexed sponsor,
        uint128 amount
    );

    event EmergencyWithdrawal(
        bytes32 indexed questId,
        address indexed sponsor,
        uint128 amount
    );

    event TokenAllowlistUpdated(address indexed token, bool allowed);

    // ──────────────────────────────────────────────
    //  Errors
    // ──────────────────────────────────────────────

    error ZeroAmount();
    error TokenNotAllowed(address token);
    error QuestAlreadyFunded(bytes32 questId);
    error QuestNotFound(bytes32 questId);
    error QuestCancelled(bytes32 questId);
    error InsufficientFunds(bytes32 questId, uint128 available, uint128 requested);
    error NothingToRefund(bytes32 questId);
    error NothingToWithdraw(bytes32 questId);
    error NotSponsor(bytes32 questId, address caller);
    error NoExpiry(bytes32 questId);
    error GracePeriodNotElapsed(bytes32 questId, uint256 unlockTime);
    error AlreadyWithdrawn(bytes32 questId);
    error LengthMismatch();
    error EmptyRecipients();
    error NativeTransferFailed(address to, uint128 amount);

    // ──────────────────────────────────────────────
    //  Sponsor Functions (permissionless)
    // ──────────────────────────────────────────────

    /// @notice Deposit ERC20 tokens to fund a quest
    /// @param questId Unique quest identifier (UUID as bytes32)
    /// @param token ERC20 token address
    /// @param amount Amount in token's smallest unit
    /// @param expiresAt Quest expiry timestamp (0 = no expiry, disables emergency withdraw)
    function deposit(
        bytes32 questId,
        address token,
        uint128 amount,
        uint64 expiresAt
    ) external;

    /// @notice Deposit native token (ETH/BNB/MATIC) to fund a quest
    /// @param questId Unique quest identifier (UUID as bytes32)
    /// @param expiresAt Quest expiry timestamp (0 = no expiry, disables emergency withdraw)
    function depositNative(bytes32 questId, uint64 expiresAt) external payable;

    /// @notice Sponsor emergency withdrawal after grace period
    /// @dev Only available if expiresAt > 0 and grace period has elapsed
    /// @param questId Quest identifier
    function sponsorEmergencyWithdraw(bytes32 questId) external;

    // ──────────────────────────────────────────────
    //  Operator Functions (backend)
    // ──────────────────────────────────────────────

    /// @notice Distribute rewards to quest winners
    /// @param questId Quest identifier
    /// @param recipients Array of winner wallet addresses
    /// @param amounts Array of amounts per recipient
    function distribute(
        bytes32 questId,
        address[] calldata recipients,
        uint128[] calldata amounts
    ) external;

    /// @notice Batch distribute across multiple quests in one tx
    /// @param questIds Array of quest identifiers
    /// @param recipients Array of recipient arrays (one per quest)
    /// @param amounts Array of amount arrays (one per quest)
    function batchDistribute(
        bytes32[] calldata questIds,
        address[][] calldata recipients,
        uint128[][] calldata amounts
    ) external;

    /// @notice Refund undistributed funds to sponsor
    /// @param questId Quest identifier
    function refund(bytes32 questId) external;

    // ──────────────────────────────────────────────
    //  Admin Functions
    // ──────────────────────────────────────────────

    /// @notice Add or remove a token from the allowlist
    /// @param token Token address
    /// @param allowed Whether the token is allowed
    function setTokenAllowed(address token, bool allowed) external;

    // ──────────────────────────────────────────────
    //  View Functions
    // ──────────────────────────────────────────────

    /// @notice Get escrow data for a quest
    /// @param questId Quest identifier
    /// @return escrow The QuestEscrow struct
    function getQuest(bytes32 questId) external view returns (QuestEscrow memory escrow);

    /// @notice Get remaining (undistributed, unrefunded) balance for a quest
    /// @param questId Quest identifier
    /// @return remaining Amount remaining
    function questBalance(bytes32 questId) external view returns (uint128 remaining);

    /// @notice Check if a token is in the allowlist
    /// @param token Token address
    /// @return allowed Whether the token is allowed
    function isTokenAllowed(address token) external view returns (bool allowed);

    /// @notice Get the emergency withdrawal grace period
    /// @return period Grace period in seconds
    function emergencyGracePeriod() external view returns (uint64 period);
}
