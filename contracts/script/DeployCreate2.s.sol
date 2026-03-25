// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ClawQuestEscrow} from "../src/ClawQuestEscrow.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title DeployCreate2 — Deterministic Multi-Chain Deploy
/// @notice Deploys ClawQuestEscrow implementation + proxy using CREATE2.
///         Same deployer + same salt + same bytecode = same address on every EVM chain.
/// @dev Usage:
///   # Predict address (dry run):
///     forge script script/DeployCreate2.s.sol --rpc-url $RPC_URL
///
///   # Deploy on Anvil:
///     forge script script/DeployCreate2.s.sol --rpc-url http://localhost:8545 --broadcast
///
///   # Deploy on Base Sepolia:
///     forge script script/DeployCreate2.s.sol --rpc-url $BASE_SEPOLIA_RPC --broadcast --verify
///
///   # Deploy on Base Mainnet (same address as Sepolia):
///     forge script script/DeployCreate2.s.sol --rpc-url $BASE_RPC --broadcast --verify
///
///   Requirements for same address across chains:
///     - Same DEPLOYER_PRIVATE_KEY
///     - Same ADMIN_ADDRESS + OPERATOR_ADDRESS (encoded into proxy initData)
///     - Same solc 0.8.24 + optimizer 200 runs (pinned in foundry.toml)
///     - Same salt values (hardcoded below)
///
///   Environment variables:
///     DEPLOYER_PRIVATE_KEY - deployer wallet private key
///     ADMIN_ADDRESS        - multisig address for DEFAULT_ADMIN_ROLE
///     OPERATOR_ADDRESS     - backend hot wallet for OPERATOR_ROLE
///     USDC_ADDRESS         - USDC token address on target chain (optional, for allowlist)
///     USDT_ADDRESS         - USDT token address on target chain (optional, for allowlist)
contract DeployCreate2ClawQuestEscrow is Script {
    // Deterministic salts — do NOT change after first deployment
    bytes32 constant IMPL_SALT = keccak256("clawquest-escrow-impl-v1");
    bytes32 constant PROXY_SALT = keccak256("clawquest-escrow-proxy-v1");

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address admin = vm.envAddress("ADMIN_ADDRESS");
        address operator = vm.envAddress("OPERATOR_ADDRESS");

        // ── Predict addresses before deployment ──────────────────────────────
        bytes memory implBytecode = type(ClawQuestEscrow).creationCode;
        address predictedImpl = vm.computeCreate2Address(
            IMPL_SALT,
            keccak256(implBytecode),
            deployer
        );

        bytes memory initData = abi.encodeCall(
            ClawQuestEscrow.initialize,
            (admin, operator)
        );
        bytes memory proxyBytecode = abi.encodePacked(
            type(ERC1967Proxy).creationCode,
            abi.encode(predictedImpl, initData)
        );
        address predictedProxy = vm.computeCreate2Address(
            PROXY_SALT,
            keccak256(proxyBytecode),
            deployer
        );

        console.log("=== CREATE2 Deterministic Deploy ===");
        console.log("  Deployer:        ", deployer);
        console.log("  Admin:           ", admin);
        console.log("  Operator:        ", operator);
        console.log("  Predicted impl:  ", predictedImpl);
        console.log("  Predicted proxy: ", predictedProxy);
        console.log("");

        // ── Deploy ───────────────────────────────────────────────────────────
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy implementation with CREATE2
        ClawQuestEscrow implementation = new ClawQuestEscrow{salt: IMPL_SALT}();
        require(
            address(implementation) == predictedImpl,
            "Implementation address mismatch - bytecode or salt changed"
        );

        // 2. Deploy proxy with CREATE2
        ERC1967Proxy proxy = new ERC1967Proxy{salt: PROXY_SALT}(
            address(implementation),
            initData
        );
        require(
            address(proxy) == predictedProxy,
            "Proxy address mismatch - bytecode or salt changed"
        );

        // 3. Configure token allowlist (only if deployer == admin)
        if (deployer == admin) {
            ClawQuestEscrow escrow = ClawQuestEscrow(payable(address(proxy)));

            // USDC (optional)
            try vm.envAddress("USDC_ADDRESS") returns (address usdc) {
                if (usdc != address(0)) {
                    escrow.setTokenAllowed(usdc, true);
                    console.log("  USDC allowlisted:", usdc);
                }
            } catch {}

            // USDT (optional)
            try vm.envAddress("USDT_ADDRESS") returns (address usdt) {
                if (usdt != address(0)) {
                    escrow.setTokenAllowed(usdt, true);
                    console.log("  USDT allowlisted:", usdt);
                }
            } catch {}
        } else {
            console.log("  [INFO] Deployer != admin - skipping token allowlist setup");
            console.log("         Admin multisig must call setTokenAllowed() separately");
        }

        vm.stopBroadcast();

        // ── Summary ──────────────────────────────────────────────────────────
        console.log("");
        console.log("=== Deployment Complete ===");
        console.log("  Proxy (ESCROW_CONTRACT):", address(proxy));
        console.log("  Implementation:         ", address(implementation));
        console.log("");
        console.log("Set this in Railway:");
        console.log("  ESCROW_CONTRACT=", address(proxy));
    }
}
