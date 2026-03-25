// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IClawQuestEscrow} from "./interfaces/IClawQuestEscrow.sol";

/// @title ClawQuestEscrow
/// @notice Singleton escrow contract for ClawQuest reward distribution.
///         One instance per chain. Sponsors deposit funds for quests,
///         operators distribute to winners, sponsors can emergency-withdraw
///         if the backend goes offline.
/// @dev UUPS upgradeable. Uses OpenZeppelin AccessControl for role management.
contract ClawQuestEscrow is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuard,
    UUPSUpgradeable,
    IClawQuestEscrow
{
    using SafeERC20 for IERC20;

    // ──────────────────────────────────────────────
    //  Roles
    // ──────────────────────────────────────────────

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ──────────────────────────────────────────────
    //  State
    // ──────────────────────────────────────────────

    /// @notice Quest escrow data keyed by quest ID (UUID as bytes32)
    mapping(bytes32 => QuestEscrow) private _quests;

    /// @notice Token allowlist — only allowed tokens can be deposited
    mapping(address => bool) private _allowedTokens;

    /// @notice Grace period after quest expiry before sponsor can emergency-withdraw
    uint64 public constant EMERGENCY_GRACE_PERIOD = 30 days;

    // ──────────────────────────────────────────────
    //  Initializer (replaces constructor for proxy)
    // ──────────────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initialize the escrow contract
    /// @param admin Address that receives DEFAULT_ADMIN_ROLE
    /// @param operator Address that receives OPERATOR_ROLE (backend hot wallet)
    function initialize(address admin, address operator) external initializer {
        __AccessControl_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, operator);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(PAUSER_ROLE, operator);
        _grantRole(UPGRADER_ROLE, admin);
    }

    // ──────────────────────────────────────────────
    //  Sponsor Functions (permissionless)
    // ──────────────────────────────────────────────

    /// @inheritdoc IClawQuestEscrow
    function deposit(
        bytes32 questId,
        address token,
        uint128 amount,
        uint64 expiresAt
    ) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        if (!_allowedTokens[token]) revert TokenNotAllowed(token);
        if (_quests[questId].sponsor != address(0)) revert QuestAlreadyFunded(questId);

        // Fee-on-transfer defense: measure actual received amount
        uint256 balBefore = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        uint256 balAfter = IERC20(token).balanceOf(address(this));
        // casting to uint128 is safe because deposit amount is already uint128
        // forge-lint: disable-next-line(unsafe-typecast)
        uint128 actualReceived = uint128(balAfter - balBefore);

        _quests[questId] = QuestEscrow({
            sponsor: msg.sender,
            token: token,
            deposited: actualReceived,
            distributed: 0,
            refunded: 0,
            createdAt: uint64(block.timestamp),
            expiresAt: expiresAt,
            cancelled: false
        });

        emit QuestFunded(questId, msg.sender, token, actualReceived, expiresAt);
    }

    /// @inheritdoc IClawQuestEscrow
    function depositNative(
        bytes32 questId,
        uint64 expiresAt
    ) external payable nonReentrant whenNotPaused {
        if (msg.value == 0) revert ZeroAmount();
        if (_quests[questId].sponsor != address(0)) revert QuestAlreadyFunded(questId);

        uint128 amount = uint128(msg.value);

        _quests[questId] = QuestEscrow({
            sponsor: msg.sender,
            token: address(0),
            deposited: amount,
            distributed: 0,
            refunded: 0,
            createdAt: uint64(block.timestamp),
            expiresAt: expiresAt,
            cancelled: false
        });

        emit QuestFunded(questId, msg.sender, address(0), amount, expiresAt);
    }

    /// @inheritdoc IClawQuestEscrow
    function sponsorEmergencyWithdraw(bytes32 questId) external nonReentrant {
        QuestEscrow storage q = _quests[questId];

        if (q.sponsor == address(0)) revert QuestNotFound(questId);
        if (q.sponsor != msg.sender) revert NotSponsor(questId, msg.sender);
        if (q.expiresAt == 0) revert NoExpiry(questId);

        uint256 unlockTime = uint256(q.expiresAt) + EMERGENCY_GRACE_PERIOD;
        if (block.timestamp < unlockTime) revert GracePeriodNotElapsed(questId, unlockTime);

        uint128 remaining = q.deposited - q.distributed - q.refunded;
        if (remaining == 0) revert NothingToWithdraw(questId);

        q.refunded += remaining;
        q.cancelled = true;

        _transfer(q.token, q.sponsor, remaining);

        emit EmergencyWithdrawal(questId, q.sponsor, remaining);
    }

    // ──────────────────────────────────────────────
    //  Operator Functions
    // ──────────────────────────────────────────────

    /// @inheritdoc IClawQuestEscrow
    function distribute(
        bytes32 questId,
        address[] calldata recipients,
        uint128[] calldata amounts
    ) external onlyRole(OPERATOR_ROLE) nonReentrant whenNotPaused {
        _distributeInternal(questId, recipients, amounts);
    }

    /// @inheritdoc IClawQuestEscrow
    function batchDistribute(
        bytes32[] calldata questIds,
        address[][] calldata recipients,
        uint128[][] calldata amounts
    ) external onlyRole(OPERATOR_ROLE) nonReentrant whenNotPaused {
        if (questIds.length != recipients.length) revert LengthMismatch();
        if (questIds.length != amounts.length) revert LengthMismatch();

        for (uint256 i = 0; i < questIds.length; i++) {
            _distributeInternal(questIds[i], recipients[i], amounts[i]);
        }
    }

    /// @inheritdoc IClawQuestEscrow
    function refund(bytes32 questId) external onlyRole(OPERATOR_ROLE) nonReentrant {
        QuestEscrow storage q = _quests[questId];

        if (q.sponsor == address(0)) revert QuestNotFound(questId);

        uint128 remaining = q.deposited - q.distributed - q.refunded;
        if (remaining == 0) revert NothingToRefund(questId);

        q.refunded += remaining;
        q.cancelled = true;

        _transfer(q.token, q.sponsor, remaining);

        emit QuestRefunded(questId, q.sponsor, remaining);
    }

    // ──────────────────────────────────────────────
    //  Admin Functions
    // ──────────────────────────────────────────────

    /// @inheritdoc IClawQuestEscrow
    function setTokenAllowed(
        address token,
        bool allowed
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _allowedTokens[token] = allowed;
        emit TokenAllowlistUpdated(token, allowed);
    }

    /// @notice Pause deposits and distributions
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Unpause — only admin can unpause
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ──────────────────────────────────────────────
    //  View Functions
    // ──────────────────────────────────────────────

    /// @inheritdoc IClawQuestEscrow
    function getQuest(bytes32 questId) external view returns (QuestEscrow memory) {
        return _quests[questId];
    }

    /// @inheritdoc IClawQuestEscrow
    function questBalance(bytes32 questId) external view returns (uint128) {
        QuestEscrow storage q = _quests[questId];
        return q.deposited - q.distributed - q.refunded;
    }

    /// @inheritdoc IClawQuestEscrow
    function isTokenAllowed(address token) external view returns (bool) {
        return _allowedTokens[token];
    }

    /// @inheritdoc IClawQuestEscrow
    function emergencyGracePeriod() external pure returns (uint64) {
        return EMERGENCY_GRACE_PERIOD;
    }

    // ──────────────────────────────────────────────
    //  Internal
    // ──────────────────────────────────────────────

    function _distributeInternal(
        bytes32 questId,
        address[] calldata recipients,
        uint128[] calldata amounts
    ) internal {
        if (recipients.length != amounts.length) revert LengthMismatch();
        if (recipients.length == 0) revert EmptyRecipients();

        QuestEscrow storage q = _quests[questId];
        if (q.sponsor == address(0)) revert QuestNotFound(questId);
        if (q.cancelled) revert QuestCancelled(questId);

        uint128 totalPayout = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalPayout += amounts[i];
        }

        uint128 available = q.deposited - q.distributed - q.refunded;
        if (totalPayout > available) {
            revert InsufficientFunds(questId, available, totalPayout);
        }

        // Effects before interactions (CEI pattern)
        q.distributed += totalPayout;

        // Interactions
        for (uint256 i = 0; i < recipients.length; i++) {
            if (amounts[i] == 0) continue;
            _transfer(q.token, recipients[i], amounts[i]);
        }

        emit QuestDistributed(questId, recipients, amounts, totalPayout);
    }

    function _transfer(address token, address to, uint128 amount) internal {
        if (token == address(0)) {
            (bool success, ) = to.call{value: amount}("");
            if (!success) revert NativeTransferFailed(to, amount);
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    /// @dev Required by UUPSUpgradeable — only UPGRADER can upgrade
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}
}
