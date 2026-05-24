// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {VerdictFactory} from "../src/VerdictFactory.sol";
import {MockAgentPlatform} from "../src/mocks/MockAgentPlatform.sol";

/// @notice Deploy mock platform + factory on Anvil for local operator demos.
contract DeployLocal is Script {
  function run() external returns (address platform, address factory) {
    uint256 pk = vm.envUint("PRIVATE_KEY");
    vm.startBroadcast(pk);

    platform = address(new MockAgentPlatform());
    factory = address(new VerdictFactory(platform, 12875401142070969085));

    vm.stopBroadcast();

    console2.log("MOCK_PLATFORM", platform);
    console2.log("VerdictFactory", factory);
  }
}
