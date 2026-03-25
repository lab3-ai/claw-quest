// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {ClawQuestEscrow} from "../src/ClawQuestEscrow.sol";
import {IClawQuestEscrow} from "../src/interfaces/IClawQuestEscrow.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// ──────────────────────────────────────────────────────────
//  Mock ERC20 for testing
// ──────────────────────────────────────────────────────────

contract MockERC20 is IERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external virtual returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}

/// @dev ERC20 that takes a fee on transfer (for fee-on-transfer defense testing)
contract FeeOnTransferToken is MockERC20 {
    uint256 public feePercent; // e.g. 1 = 1%

    constructor(uint256 _feePercent) MockERC20("FeeToken", "FEE", 18) {
        feePercent = _feePercent;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        uint256 fee = (amount * feePercent) / 100;
        balanceOf[to] += (amount - fee);
        // fee is burned (not sent anywhere)
        totalSupply -= fee;
        emit Transfer(from, to, amount - fee);
        return true;
    }
}

/// @dev Contract that rejects native token transfers (for testing failed ETH sends)
contract RevertingReceiver {
    receive() external payable {
        revert("I reject ETH");
    }
}

// ──────────────────────────────────────────────────────────
//  Test Suite
// ──────────────────────────────────────────────────────────

contract ClawQuestEscrowTest is Test {
    ClawQuestEscrow public escrow;
    MockERC20 public usdc;
    MockERC20 public usdt;

    address public admin = makeAddr("admin");
    address public operator = makeAddr("operator");
    address public sponsor = makeAddr("sponsor");
    address public winner1 = makeAddr("winner1");
    address public winner2 = makeAddr("winner2");
    address public winner3 = makeAddr("winner3");
    address public nobody = makeAddr("nobody");

    // Quest IDs (simulated UUID → bytes32)
    bytes32 public constant QUEST_1 = bytes32(uint256(0x007d6b1e59a5481d91d955442ca40898));
    bytes32 public constant QUEST_2 = bytes32(uint256(0x118f3a2b7c9d4e5f6a1b2c3d4e5f6a7b));
    bytes32 public constant QUEST_3 = bytes32(uint256(0x229e4b3c8dae5f6071c2d3e4f5061b8c));

    // block.timestamp is not compile-time constant, use in-test calculations instead

    function setUp() public {
        // Deploy implementation + proxy
        ClawQuestEscrow impl = new ClawQuestEscrow();
        bytes memory initData = abi.encodeCall(
            ClawQuestEscrow.initialize,
            (admin, operator)
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        escrow = ClawQuestEscrow(payable(address(proxy)));

        // Deploy mock tokens
        usdc = new MockERC20("USD Coin", "USDC", 6);
        usdt = new MockERC20("Tether USD", "USDT", 6);

        // Admin adds tokens to allowlist
        vm.startPrank(admin);
        escrow.setTokenAllowed(address(usdc), true);
        escrow.setTokenAllowed(address(usdt), true);
        vm.stopPrank();

        // Mint tokens to sponsor
        usdc.mint(sponsor, 1_000_000e6); // 1M USDC
        usdt.mint(sponsor, 1_000_000e6);

        // Sponsor approves escrow
        vm.startPrank(sponsor);
        usdc.approve(address(escrow), type(uint256).max);
        usdt.approve(address(escrow), type(uint256).max);
        vm.stopPrank();

        // Give sponsor some ETH
        vm.deal(sponsor, 100 ether);
    }

    // ──────────────────────────────────────────────
    //  Initialization Tests
    // ──────────────────────────────────────────────

    function test_initialization() public view {
        assertTrue(escrow.hasRole(escrow.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(escrow.hasRole(escrow.OPERATOR_ROLE(), operator));
        assertTrue(escrow.hasRole(escrow.PAUSER_ROLE(), admin));
        assertTrue(escrow.hasRole(escrow.PAUSER_ROLE(), operator));
        assertTrue(escrow.hasRole(escrow.UPGRADER_ROLE(), admin));
    }

    function test_cannotInitializeTwice() public {
        vm.expectRevert();
        escrow.initialize(admin, operator);
    }

    function test_tokenAllowlist() public view {
        assertTrue(escrow.isTokenAllowed(address(usdc)));
        assertTrue(escrow.isTokenAllowed(address(usdt)));
        assertFalse(escrow.isTokenAllowed(address(0x1234)));
    }

    // ──────────────────────────────────────────────
    //  Deposit ERC20 Tests
    // ──────────────────────────────────────────────

    function test_depositERC20() public {
        uint128 amount = 500e6; // 500 USDC
        uint64 expiry = uint64(block.timestamp + 90 days);

        vm.prank(sponsor);
        escrow.deposit(QUEST_1, address(usdc), amount, expiry);

        IClawQuestEscrow.QuestEscrow memory q = escrow.getQuest(QUEST_1);
        assertEq(q.sponsor, sponsor);
        assertEq(q.token, address(usdc));
        assertEq(q.deposited, amount);
        assertEq(q.distributed, 0);
        assertEq(q.refunded, 0);
        assertEq(q.expiresAt, expiry);
        assertFalse(q.cancelled);
        assertEq(escrow.questBalance(QUEST_1), amount);
    }

    function test_depositERC20_emitsEvent() public {
        uint128 amount = 500e6;
        uint64 expiry = uint64(block.timestamp + 90 days);

        vm.expectEmit(true, true, false, true);
        emit IClawQuestEscrow.QuestFunded(QUEST_1, sponsor, address(usdc), amount, expiry);

        vm.prank(sponsor);
        escrow.deposit(QUEST_1, address(usdc), amount, expiry);
    }

    function test_depositERC20_transfersTokens() public {
        uint128 amount = 500e6;
        uint256 balBefore = usdc.balanceOf(sponsor);

        vm.prank(sponsor);
        escrow.deposit(QUEST_1, address(usdc), amount, uint64(block.timestamp + 90 days));

        assertEq(usdc.balanceOf(sponsor), balBefore - amount);
        assertEq(usdc.balanceOf(address(escrow)), amount);
    }

    function test_depositERC20_revert_zeroAmount() public {
        vm.prank(sponsor);
        vm.expectRevert(IClawQuestEscrow.ZeroAmount.selector);
        escrow.deposit(QUEST_1, address(usdc), 0, uint64(block.timestamp + 90 days));
    }

    function test_depositERC20_revert_tokenNotAllowed() public {
        address badToken = address(0xdead);
        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(IClawQuestEscrow.TokenNotAllowed.selector, badToken));
        escrow.deposit(QUEST_1, badToken, 100e6, uint64(block.timestamp + 90 days));
    }

    function test_depositERC20_revert_alreadyFunded() public {
        uint128 amount = 500e6;
        uint64 expiry = uint64(block.timestamp + 90 days);

        vm.prank(sponsor);
        escrow.deposit(QUEST_1, address(usdc), amount, expiry);

        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(IClawQuestEscrow.QuestAlreadyFunded.selector, QUEST_1));
        escrow.deposit(QUEST_1, address(usdc), amount, expiry);
    }

    function test_depositERC20_revert_whenPaused() public {
        vm.prank(admin);
        escrow.pause();

        vm.prank(sponsor);
        vm.expectRevert();
        escrow.deposit(QUEST_1, address(usdc), 500e6, uint64(block.timestamp + 90 days));
    }

    function test_depositERC20_feeOnTransfer() public {
        FeeOnTransferToken feeToken = new FeeOnTransferToken(1); // 1% fee
        feeToken.mint(sponsor, 1000e18);

        vm.prank(admin);
        escrow.setTokenAllowed(address(feeToken), true);

        vm.startPrank(sponsor);
        feeToken.approve(address(escrow), type(uint256).max);
        escrow.deposit(QUEST_1, address(feeToken), 1000e18, uint64(block.timestamp + 90 days));
        vm.stopPrank();

        // Should record actual received (990e18 after 1% fee), not requested amount
        IClawQuestEscrow.QuestEscrow memory q = escrow.getQuest(QUEST_1);
        assertEq(q.deposited, 990e18);
    }

    // ──────────────────────────────────────────────
    //  Deposit Native Tests
    // ──────────────────────────────────────────────

    function test_depositNative() public {
        uint128 amount = 1 ether;
        uint64 expiry = uint64(block.timestamp + 90 days);

        vm.prank(sponsor);
        escrow.depositNative{value: amount}(QUEST_2, expiry);

        IClawQuestEscrow.QuestEscrow memory q = escrow.getQuest(QUEST_2);
        assertEq(q.sponsor, sponsor);
        assertEq(q.token, address(0));
        assertEq(q.deposited, amount);
        assertEq(address(escrow).balance, amount);
    }

    function test_depositNative_emitsEvent() public {
        uint128 amount = 1 ether;
        uint64 expiry = uint64(block.timestamp + 90 days);

        vm.expectEmit(true, true, false, true);
        emit IClawQuestEscrow.QuestFunded(QUEST_2, sponsor, address(0), amount, expiry);

        vm.prank(sponsor);
        escrow.depositNative{value: amount}(QUEST_2, expiry);
    }

    function test_depositNative_revert_zeroAmount() public {
        vm.prank(sponsor);
        vm.expectRevert(IClawQuestEscrow.ZeroAmount.selector);
        escrow.depositNative{value: 0}(QUEST_2, uint64(block.timestamp + 90 days));
    }

    function test_depositNative_revert_alreadyFunded() public {
        vm.prank(sponsor);
        escrow.depositNative{value: 1 ether}(QUEST_2, uint64(block.timestamp + 90 days));

        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(IClawQuestEscrow.QuestAlreadyFunded.selector, QUEST_2));
        escrow.depositNative{value: 1 ether}(QUEST_2, uint64(block.timestamp + 90 days));
    }

    function test_depositNative_noExpiry() public {
        vm.prank(sponsor);
        escrow.depositNative{value: 1 ether}(QUEST_2, 0); // expiresAt = 0

        IClawQuestEscrow.QuestEscrow memory q = escrow.getQuest(QUEST_2);
        assertEq(q.expiresAt, 0);
    }

    // ──────────────────────────────────────────────
    //  Distribute Tests
    // ──────────────────────────────────────────────

    function test_distribute_singleWinner() public {
        _depositUSDC(QUEST_1, 500e6);

        address[] memory recipients = new address[](1);
        recipients[0] = winner1;
        uint128[] memory amounts = new uint128[](1);
        amounts[0] = 500e6;

        vm.prank(operator);
        escrow.distribute(QUEST_1, recipients, amounts);

        assertEq(usdc.balanceOf(winner1), 500e6);
        assertEq(escrow.questBalance(QUEST_1), 0);

        IClawQuestEscrow.QuestEscrow memory q = escrow.getQuest(QUEST_1);
        assertEq(q.distributed, 500e6);
    }

    function test_distribute_multipleWinners() public {
        _depositUSDC(QUEST_1, 1000e6);

        address[] memory recipients = new address[](3);
        recipients[0] = winner1;
        recipients[1] = winner2;
        recipients[2] = winner3;
        uint128[] memory amounts = new uint128[](3);
        amounts[0] = 500e6; // 1st place
        amounts[1] = 300e6; // 2nd place
        amounts[2] = 200e6; // 3rd place

        vm.prank(operator);
        escrow.distribute(QUEST_1, recipients, amounts);

        assertEq(usdc.balanceOf(winner1), 500e6);
        assertEq(usdc.balanceOf(winner2), 300e6);
        assertEq(usdc.balanceOf(winner3), 200e6);
        assertEq(escrow.questBalance(QUEST_1), 0);
    }

    function test_distribute_partialPayout() public {
        _depositUSDC(QUEST_1, 1000e6);

        // First batch: 2 winners
        address[] memory recipients = new address[](2);
        recipients[0] = winner1;
        recipients[1] = winner2;
        uint128[] memory amounts = new uint128[](2);
        amounts[0] = 300e6;
        amounts[1] = 300e6;

        vm.prank(operator);
        escrow.distribute(QUEST_1, recipients, amounts);

        assertEq(escrow.questBalance(QUEST_1), 400e6); // 400 remaining

        // Second batch: 1 more winner
        recipients = new address[](1);
        recipients[0] = winner3;
        amounts = new uint128[](1);
        amounts[0] = 200e6;

        vm.prank(operator);
        escrow.distribute(QUEST_1, recipients, amounts);

        assertEq(escrow.questBalance(QUEST_1), 200e6); // 200 remaining
    }

    function test_distribute_nativeToken() public {
        vm.prank(sponsor);
        escrow.depositNative{value: 3 ether}(QUEST_2, uint64(block.timestamp + 90 days));

        address[] memory recipients = new address[](3);
        recipients[0] = winner1;
        recipients[1] = winner2;
        recipients[2] = winner3;
        uint128[] memory amounts = new uint128[](3);
        amounts[0] = 1 ether;
        amounts[1] = 1 ether;
        amounts[2] = 1 ether;

        vm.prank(operator);
        escrow.distribute(QUEST_2, recipients, amounts);

        assertEq(winner1.balance, 1 ether);
        assertEq(winner2.balance, 1 ether);
        assertEq(winner3.balance, 1 ether);
    }

    function test_distribute_emitsEvent() public {
        _depositUSDC(QUEST_1, 500e6);

        address[] memory recipients = new address[](1);
        recipients[0] = winner1;
        uint128[] memory amounts = new uint128[](1);
        amounts[0] = 500e6;

        vm.expectEmit(true, false, false, true);
        emit IClawQuestEscrow.QuestDistributed(QUEST_1, recipients, amounts, 500e6);

        vm.prank(operator);
        escrow.distribute(QUEST_1, recipients, amounts);
    }

    function test_distribute_revert_notOperator() public {
        _depositUSDC(QUEST_1, 500e6);

        address[] memory recipients = new address[](1);
        recipients[0] = winner1;
        uint128[] memory amounts = new uint128[](1);
        amounts[0] = 500e6;

        vm.prank(nobody);
        vm.expectRevert();
        escrow.distribute(QUEST_1, recipients, amounts);
    }

    function test_distribute_revert_questNotFound() public {
        address[] memory recipients = new address[](1);
        recipients[0] = winner1;
        uint128[] memory amounts = new uint128[](1);
        amounts[0] = 500e6;

        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(IClawQuestEscrow.QuestNotFound.selector, QUEST_1));
        escrow.distribute(QUEST_1, recipients, amounts);
    }

    function test_distribute_revert_insufficientFunds() public {
        _depositUSDC(QUEST_1, 500e6);

        address[] memory recipients = new address[](1);
        recipients[0] = winner1;
        uint128[] memory amounts = new uint128[](1);
        amounts[0] = 600e6; // More than deposited

        vm.prank(operator);
        vm.expectRevert(
            abi.encodeWithSelector(IClawQuestEscrow.InsufficientFunds.selector, QUEST_1, 500e6, 600e6)
        );
        escrow.distribute(QUEST_1, recipients, amounts);
    }

    function test_distribute_revert_lengthMismatch() public {
        _depositUSDC(QUEST_1, 500e6);

        address[] memory recipients = new address[](2);
        recipients[0] = winner1;
        recipients[1] = winner2;
        uint128[] memory amounts = new uint128[](1);
        amounts[0] = 500e6;

        vm.prank(operator);
        vm.expectRevert(IClawQuestEscrow.LengthMismatch.selector);
        escrow.distribute(QUEST_1, recipients, amounts);
    }

    function test_distribute_revert_emptyRecipients() public {
        _depositUSDC(QUEST_1, 500e6);

        address[] memory recipients = new address[](0);
        uint128[] memory amounts = new uint128[](0);

        vm.prank(operator);
        vm.expectRevert(IClawQuestEscrow.EmptyRecipients.selector);
        escrow.distribute(QUEST_1, recipients, amounts);
    }

    function test_distribute_revert_cancelled() public {
        _depositUSDC(QUEST_1, 500e6);

        // Refund cancels the quest
        vm.prank(operator);
        escrow.refund(QUEST_1);

        address[] memory recipients = new address[](1);
        recipients[0] = winner1;
        uint128[] memory amounts = new uint128[](1);
        amounts[0] = 100e6;

        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(IClawQuestEscrow.QuestCancelled.selector, QUEST_1));
        escrow.distribute(QUEST_1, recipients, amounts);
    }

    function test_distribute_skipsZeroAmounts() public {
        _depositUSDC(QUEST_1, 500e6);

        address[] memory recipients = new address[](3);
        recipients[0] = winner1;
        recipients[1] = winner2;
        recipients[2] = winner3;
        uint128[] memory amounts = new uint128[](3);
        amounts[0] = 250e6;
        amounts[1] = 0; // Should be skipped
        amounts[2] = 250e6;

        vm.prank(operator);
        escrow.distribute(QUEST_1, recipients, amounts);

        assertEq(usdc.balanceOf(winner1), 250e6);
        assertEq(usdc.balanceOf(winner2), 0); // Didn't receive
        assertEq(usdc.balanceOf(winner3), 250e6);
    }

    function test_distribute_nativeToken_revertingReceiver() public {
        RevertingReceiver badReceiver = new RevertingReceiver();

        vm.prank(sponsor);
        escrow.depositNative{value: 1 ether}(QUEST_2, uint64(block.timestamp + 90 days));

        address[] memory recipients = new address[](1);
        recipients[0] = address(badReceiver);
        uint128[] memory amounts = new uint128[](1);
        amounts[0] = 1 ether;

        vm.prank(operator);
        vm.expectRevert(
            abi.encodeWithSelector(
                IClawQuestEscrow.NativeTransferFailed.selector,
                address(badReceiver),
                uint128(1 ether)
            )
        );
        escrow.distribute(QUEST_2, recipients, amounts);
    }

    // ──────────────────────────────────────────────
    //  Batch Distribute Tests
    // ──────────────────────────────────────────────

    function test_batchDistribute() public {
        _depositUSDC(QUEST_1, 500e6);
        _depositUSDC(QUEST_2, 300e6);

        bytes32[] memory questIds = new bytes32[](2);
        questIds[0] = QUEST_1;
        questIds[1] = QUEST_2;

        address[][] memory recipients = new address[][](2);
        recipients[0] = new address[](1);
        recipients[0][0] = winner1;
        recipients[1] = new address[](1);
        recipients[1][0] = winner2;

        uint128[][] memory amounts = new uint128[][](2);
        amounts[0] = new uint128[](1);
        amounts[0][0] = 500e6;
        amounts[1] = new uint128[](1);
        amounts[1][0] = 300e6;

        vm.prank(operator);
        escrow.batchDistribute(questIds, recipients, amounts);

        assertEq(usdc.balanceOf(winner1), 500e6);
        assertEq(usdc.balanceOf(winner2), 300e6);
        assertEq(escrow.questBalance(QUEST_1), 0);
        assertEq(escrow.questBalance(QUEST_2), 0);
    }

    function test_batchDistribute_revert_lengthMismatch() public {
        bytes32[] memory questIds = new bytes32[](2);
        address[][] memory recipients = new address[][](1); // mismatch
        uint128[][] memory amounts = new uint128[][](2);

        vm.prank(operator);
        vm.expectRevert(IClawQuestEscrow.LengthMismatch.selector);
        escrow.batchDistribute(questIds, recipients, amounts);
    }

    // ──────────────────────────────────────────────
    //  Refund Tests
    // ──────────────────────────────────────────────

    function test_refund_fullAmount() public {
        _depositUSDC(QUEST_1, 500e6);

        uint256 sponsorBalBefore = usdc.balanceOf(sponsor);

        vm.prank(operator);
        escrow.refund(QUEST_1);

        assertEq(usdc.balanceOf(sponsor), sponsorBalBefore + 500e6);
        assertEq(escrow.questBalance(QUEST_1), 0);

        IClawQuestEscrow.QuestEscrow memory q = escrow.getQuest(QUEST_1);
        assertTrue(q.cancelled);
        assertEq(q.refunded, 500e6);
    }

    function test_refund_partialRemaining() public {
        _depositUSDC(QUEST_1, 1000e6);

        // Distribute 600 to winners
        address[] memory recipients = new address[](2);
        recipients[0] = winner1;
        recipients[1] = winner2;
        uint128[] memory amounts = new uint128[](2);
        amounts[0] = 400e6;
        amounts[1] = 200e6;

        vm.prank(operator);
        escrow.distribute(QUEST_1, recipients, amounts);

        // Refund remaining 400
        uint256 sponsorBalBefore = usdc.balanceOf(sponsor);

        vm.prank(operator);
        escrow.refund(QUEST_1);

        assertEq(usdc.balanceOf(sponsor), sponsorBalBefore + 400e6);
        assertEq(escrow.questBalance(QUEST_1), 0);
    }

    function test_refund_nativeToken() public {
        vm.prank(sponsor);
        escrow.depositNative{value: 2 ether}(QUEST_2, uint64(block.timestamp + 90 days));

        uint256 sponsorBalBefore = sponsor.balance;

        vm.prank(operator);
        escrow.refund(QUEST_2);

        assertEq(sponsor.balance, sponsorBalBefore + 2 ether);
    }

    function test_refund_emitsEvent() public {
        _depositUSDC(QUEST_1, 500e6);

        vm.expectEmit(true, true, false, true);
        emit IClawQuestEscrow.QuestRefunded(QUEST_1, sponsor, 500e6);

        vm.prank(operator);
        escrow.refund(QUEST_1);
    }

    function test_refund_revert_questNotFound() public {
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(IClawQuestEscrow.QuestNotFound.selector, QUEST_1));
        escrow.refund(QUEST_1);
    }

    function test_refund_revert_nothingToRefund() public {
        _depositUSDC(QUEST_1, 500e6);

        // Distribute all
        address[] memory recipients = new address[](1);
        recipients[0] = winner1;
        uint128[] memory amounts = new uint128[](1);
        amounts[0] = 500e6;

        vm.prank(operator);
        escrow.distribute(QUEST_1, recipients, amounts);

        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(IClawQuestEscrow.NothingToRefund.selector, QUEST_1));
        escrow.refund(QUEST_1);
    }

    function test_refund_revert_notOperator() public {
        _depositUSDC(QUEST_1, 500e6);

        vm.prank(nobody);
        vm.expectRevert();
        escrow.refund(QUEST_1);
    }

    // ──────────────────────────────────────────────
    //  Emergency Withdraw Tests
    // ──────────────────────────────────────────────

    function test_emergencyWithdraw() public {
        uint64 expiry = uint64(block.timestamp + 30 days);
        _depositUSDCWithExpiry(QUEST_1, 500e6, expiry);

        // Warp past expiry + grace period
        vm.warp(uint256(expiry) + escrow.EMERGENCY_GRACE_PERIOD() + 1);

        uint256 sponsorBalBefore = usdc.balanceOf(sponsor);

        vm.prank(sponsor);
        escrow.sponsorEmergencyWithdraw(QUEST_1);

        assertEq(usdc.balanceOf(sponsor), sponsorBalBefore + 500e6);

        IClawQuestEscrow.QuestEscrow memory q = escrow.getQuest(QUEST_1);
        assertTrue(q.cancelled);
        assertEq(q.refunded, 500e6);
    }

    function test_emergencyWithdraw_partialRemaining() public {
        uint64 expiry = uint64(block.timestamp + 30 days);
        _depositUSDCWithExpiry(QUEST_1, 1000e6, expiry);

        // Distribute some before expiry
        address[] memory recipients = new address[](1);
        recipients[0] = winner1;
        uint128[] memory amounts = new uint128[](1);
        amounts[0] = 600e6;

        vm.prank(operator);
        escrow.distribute(QUEST_1, recipients, amounts);

        // Warp past grace period
        vm.warp(uint256(expiry) + escrow.EMERGENCY_GRACE_PERIOD() + 1);

        uint256 sponsorBalBefore = usdc.balanceOf(sponsor);

        vm.prank(sponsor);
        escrow.sponsorEmergencyWithdraw(QUEST_1);

        assertEq(usdc.balanceOf(sponsor), sponsorBalBefore + 400e6); // Only remaining
    }

    function test_emergencyWithdraw_emitsEvent() public {
        uint64 expiry = uint64(block.timestamp + 30 days);
        _depositUSDCWithExpiry(QUEST_1, 500e6, expiry);

        vm.warp(uint256(expiry) + escrow.EMERGENCY_GRACE_PERIOD() + 1);

        vm.expectEmit(true, true, false, true);
        emit IClawQuestEscrow.EmergencyWithdrawal(QUEST_1, sponsor, 500e6);

        vm.prank(sponsor);
        escrow.sponsorEmergencyWithdraw(QUEST_1);
    }

    function test_emergencyWithdraw_revert_notSponsor() public {
        uint64 expiry = uint64(block.timestamp + 30 days);
        _depositUSDCWithExpiry(QUEST_1, 500e6, expiry);

        vm.warp(uint256(expiry) + escrow.EMERGENCY_GRACE_PERIOD() + 1);

        vm.prank(nobody);
        vm.expectRevert(abi.encodeWithSelector(IClawQuestEscrow.NotSponsor.selector, QUEST_1, nobody));
        escrow.sponsorEmergencyWithdraw(QUEST_1);
    }

    function test_emergencyWithdraw_revert_noExpiry() public {
        // Deposit with expiresAt = 0
        vm.prank(sponsor);
        escrow.deposit(QUEST_1, address(usdc), 500e6, 0);

        vm.warp(block.timestamp + 365 days);

        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(IClawQuestEscrow.NoExpiry.selector, QUEST_1));
        escrow.sponsorEmergencyWithdraw(QUEST_1);
    }

    function test_emergencyWithdraw_revert_gracePeriodNotElapsed() public {
        uint64 expiry = uint64(block.timestamp + 30 days);
        _depositUSDCWithExpiry(QUEST_1, 500e6, expiry);

        // Warp to just after expiry but before grace period
        vm.warp(uint256(expiry) + 1 days);

        uint256 unlockTime = uint256(expiry) + escrow.EMERGENCY_GRACE_PERIOD();

        vm.prank(sponsor);
        vm.expectRevert(
            abi.encodeWithSelector(IClawQuestEscrow.GracePeriodNotElapsed.selector, QUEST_1, unlockTime)
        );
        escrow.sponsorEmergencyWithdraw(QUEST_1);
    }

    function test_emergencyWithdraw_revert_nothingToWithdraw() public {
        uint64 expiry = uint64(block.timestamp + 30 days);
        _depositUSDCWithExpiry(QUEST_1, 500e6, expiry);

        // Operator distributes everything
        address[] memory recipients = new address[](1);
        recipients[0] = winner1;
        uint128[] memory amounts = new uint128[](1);
        amounts[0] = 500e6;

        vm.prank(operator);
        escrow.distribute(QUEST_1, recipients, amounts);

        vm.warp(uint256(expiry) + escrow.EMERGENCY_GRACE_PERIOD() + 1);

        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(IClawQuestEscrow.NothingToWithdraw.selector, QUEST_1));
        escrow.sponsorEmergencyWithdraw(QUEST_1);
    }

    function test_emergencyWithdraw_worksWhenPaused() public {
        uint64 expiry = uint64(block.timestamp + 30 days);
        _depositUSDCWithExpiry(QUEST_1, 500e6, expiry);

        vm.prank(admin);
        escrow.pause();

        vm.warp(uint256(expiry) + escrow.EMERGENCY_GRACE_PERIOD() + 1);

        // Emergency withdraw should work even when paused
        vm.prank(sponsor);
        escrow.sponsorEmergencyWithdraw(QUEST_1);

        assertEq(escrow.questBalance(QUEST_1), 0);
    }

    // ──────────────────────────────────────────────
    //  Pause Tests
    // ──────────────────────────────────────────────

    function test_pause_blocksDeposit() public {
        vm.prank(admin);
        escrow.pause();

        vm.prank(sponsor);
        vm.expectRevert();
        escrow.deposit(QUEST_1, address(usdc), 500e6, uint64(block.timestamp + 90 days));
    }

    function test_pause_blocksDistribute() public {
        _depositUSDC(QUEST_1, 500e6);

        vm.prank(admin);
        escrow.pause();

        address[] memory recipients = new address[](1);
        recipients[0] = winner1;
        uint128[] memory amounts = new uint128[](1);
        amounts[0] = 500e6;

        vm.prank(operator);
        vm.expectRevert();
        escrow.distribute(QUEST_1, recipients, amounts);
    }

    function test_pause_onlyPauserCanPause() public {
        vm.prank(nobody);
        vm.expectRevert();
        escrow.pause();
    }

    function test_unpause_onlyAdminCanUnpause() public {
        vm.prank(admin);
        escrow.pause();

        // Operator has PAUSER_ROLE but cannot unpause
        vm.prank(operator);
        vm.expectRevert();
        escrow.unpause();

        // Admin can unpause
        vm.prank(admin);
        escrow.unpause();
    }

    // ──────────────────────────────────────────────
    //  Admin Functions Tests
    // ──────────────────────────────────────────────

    function test_setTokenAllowed_add() public {
        address newToken = address(0x1234);
        assertFalse(escrow.isTokenAllowed(newToken));

        vm.prank(admin);
        escrow.setTokenAllowed(newToken, true);

        assertTrue(escrow.isTokenAllowed(newToken));
    }

    function test_setTokenAllowed_remove() public {
        assertTrue(escrow.isTokenAllowed(address(usdc)));

        vm.prank(admin);
        escrow.setTokenAllowed(address(usdc), false);

        assertFalse(escrow.isTokenAllowed(address(usdc)));
    }

    function test_setTokenAllowed_emitsEvent() public {
        address newToken = address(0x1234);

        vm.expectEmit(true, false, false, true);
        emit IClawQuestEscrow.TokenAllowlistUpdated(newToken, true);

        vm.prank(admin);
        escrow.setTokenAllowed(newToken, true);
    }

    function test_setTokenAllowed_revert_notAdmin() public {
        vm.prank(nobody);
        vm.expectRevert();
        escrow.setTokenAllowed(address(0x1234), true);
    }

    // ──────────────────────────────────────────────
    //  View Functions Tests
    // ──────────────────────────────────────────────

    function test_getQuest_unfunded() public view {
        IClawQuestEscrow.QuestEscrow memory q = escrow.getQuest(QUEST_1);
        assertEq(q.sponsor, address(0));
        assertEq(q.deposited, 0);
    }

    function test_questBalance_unfunded() public view {
        assertEq(escrow.questBalance(QUEST_1), 0);
    }

    function test_emergencyGracePeriod() public view {
        assertEq(escrow.emergencyGracePeriod(), 30 days);
    }

    // ──────────────────────────────────────────────
    //  Multiple Quests Isolation Test
    // ──────────────────────────────────────────────

    function test_multipleQuests_isolated() public {
        // Fund 3 quests
        _depositUSDC(QUEST_1, 500e6);
        _depositUSDC(QUEST_2, 300e6);

        vm.prank(sponsor);
        escrow.depositNative{value: 2 ether}(QUEST_3, uint64(block.timestamp + 90 days));

        // Distribute from quest 1 only
        address[] memory recipients = new address[](1);
        recipients[0] = winner1;
        uint128[] memory amounts = new uint128[](1);
        amounts[0] = 500e6;

        vm.prank(operator);
        escrow.distribute(QUEST_1, recipients, amounts);

        // Quest 2 and 3 are untouched
        assertEq(escrow.questBalance(QUEST_1), 0);
        assertEq(escrow.questBalance(QUEST_2), 300e6);
        assertEq(escrow.questBalance(QUEST_3), 2 ether);
    }

    // ──────────────────────────────────────────────
    //  Fuzz Tests
    // ──────────────────────────────────────────────

    function testFuzz_deposit_anyAmount(uint128 amount) public {
        vm.assume(amount > 0);
        vm.assume(amount <= 1_000_000e6); // max 1M USDC

        usdc.mint(sponsor, amount);

        vm.prank(sponsor);
        escrow.deposit(QUEST_1, address(usdc), amount, uint64(block.timestamp + 90 days));

        assertEq(escrow.questBalance(QUEST_1), amount);
    }

    function testFuzz_distributeDoesNotExceedDeposit(
        uint128 depositAmount,
        uint128 distributeAmount
    ) public {
        vm.assume(depositAmount > 0);
        vm.assume(depositAmount <= 1_000_000e6);
        vm.assume(distributeAmount > depositAmount);

        usdc.mint(sponsor, depositAmount);

        vm.prank(sponsor);
        escrow.deposit(QUEST_1, address(usdc), depositAmount, uint64(block.timestamp + 90 days));

        address[] memory recipients = new address[](1);
        recipients[0] = winner1;
        uint128[] memory amounts = new uint128[](1);
        amounts[0] = distributeAmount;

        vm.prank(operator);
        vm.expectRevert(); // InsufficientFunds
        escrow.distribute(QUEST_1, recipients, amounts);
    }

    // ──────────────────────────────────────────────
    //  Helpers
    // ──────────────────────────────────────────────

    function _depositUSDC(bytes32 questId, uint128 amount) internal {
        _depositUSDCWithExpiry(questId, amount, uint64(block.timestamp + 90 days));
    }

    function _depositUSDCWithExpiry(bytes32 questId, uint128 amount, uint64 expiry) internal {
        vm.prank(sponsor);
        escrow.deposit(questId, address(usdc), amount, expiry);
    }
}
