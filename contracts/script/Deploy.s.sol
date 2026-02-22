// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ClawQuestEscrow} from "../src/ClawQuestEscrow.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title Deploy ClawQuestEscrow
/// @notice Deploys implementation + UUPS proxy, initializes with admin & operator
/// @dev Usage:
///   # Local (Anvil):
///     forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
///
///   # Base Sepolia:
///     forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC --broadcast --verify
///
///   # Base Mainnet (CREATE2 for deterministic address):
///     forge script script/Deploy.s.sol --rpc-url $BASE_RPC --broadcast --verify
///
///   Environment variables:
///     DEPLOYER_PRIVATE_KEY - deployer wallet private key
///     ADMIN_ADDRESS        - multisig address for DEFAULT_ADMIN_ROLE
///     OPERATOR_ADDRESS     - backend hot wallet for OPERATOR_ROLE
///     USDC_ADDRESS         - USDC token address on target chain
///     USDT_ADDRESS         - USDT token address on target chain (optional)
contract DeployClawQuestEscrow is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address admin = vm.envAddress("ADMIN_ADDRESS");
        address operator = vm.envAddress("OPERATOR_ADDRESS");
        address usdcAddress = vm.envAddress("USDC_ADDRESS");

        // USDT is optional (not on all chains)
        address usdtAddress;
        try vm.envAddress("USDT_ADDRESS") returns (address addr) {
            usdtAddress = addr;
        } catch {
            usdtAddress = address(0);
        }

        console.log("Deploying ClawQuestEscrow...");
        console.log("  Admin:    ", admin);
        console.log("  Operator: ", operator);
        console.log("  USDC:     ", usdcAddress);
        if (usdtAddress != address(0)) {
            console.log("  USDT:     ", usdtAddress);
        }

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy implementation
        ClawQuestEscrow implementation = new ClawQuestEscrow();
        console.log("  Implementation deployed at:", address(implementation));

        // 2. Encode initializer call
        bytes memory initData = abi.encodeCall(
            ClawQuestEscrow.initialize,
            (admin, operator)
        );

        // 3. Deploy proxy
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        console.log("  Proxy deployed at:", address(proxy));

        // 4. Configure token allowlist
        ClawQuestEscrow escrow = ClawQuestEscrow(payable(address(proxy)));
        escrow.setTokenAllowed(usdcAddress, true);
        console.log("  USDC added to allowlist");

        if (usdtAddress != address(0)) {
            escrow.setTokenAllowed(usdtAddress, true);
            console.log("  USDT added to allowlist");
        }

        vm.stopBroadcast();

        console.log("");
        console.log("=== Deployment Complete ===");
        console.log("Proxy (use this address):", address(proxy));
        console.log("Implementation:          ", address(implementation));
    }
}
