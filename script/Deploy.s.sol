// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {VerdictFactory} from "../src/VerdictFactory.sol";

/// @notice Deploy VerdictFactory to Somnia Shannon testnet.
/// Somnia rejects EIP-1559 contract creation — always pass --legacy:
/// forge script script/Deploy.s.sol:Deploy --rpc-url $SOMNIA_RPC_URL --broadcast --legacy
contract Deploy is Script {
  address constant PLATFORM_TESTNET = 0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776;
  uint256 constant PARSE_WEBSITE_AGENT_ID = 12875401142070969085;

  function run() external returns (VerdictFactory factory) {
    uint256 pk = vm.envUint("PRIVATE_KEY");
    vm.startBroadcast(pk);

    factory = new VerdictFactory(PLATFORM_TESTNET, PARSE_WEBSITE_AGENT_ID);

    vm.stopBroadcast();

    console2.log("VerdictFactory", address(factory));
    console2.log("Platform", PLATFORM_TESTNET);
    console2.log("Parse agent id", PARSE_WEBSITE_AGENT_ID);
  }
}
