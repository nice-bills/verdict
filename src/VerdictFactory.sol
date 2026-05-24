// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {VerdictMarket} from "./VerdictMarket.sol";

/// @title VerdictFactory
/// @notice Deploys VerdictMarket instances on Somnia.
contract VerdictFactory {
    address public immutable platform;
    uint256 public immutable parseAgentId;

    VerdictMarket[] public markets;

    event MarketCreated(uint256 indexed marketId, address indexed market, address indexed creator);

    constructor(address platform_, uint256 parseAgentId_) {
        platform = platform_;
        parseAgentId = parseAgentId_;
    }

    function createMarket(
        string calldata question,
        string calldata sourceUrl,
        string calldata resolvePrompt,
        uint256 deadline
    ) external returns (address market) {
        VerdictMarket m = new VerdictMarket(
            platform,
            parseAgentId,
            address(this),
            msg.sender,
            question,
            sourceUrl,
            resolvePrompt,
            deadline
        );
        markets.push(m);
        uint256 id = markets.length - 1;
        emit MarketCreated(id, address(m), msg.sender);
        return address(m);
    }

    function marketCount() external view returns (uint256) {
        return markets.length;
    }

    function getMarket(uint256 id) external view returns (address) {
        return address(markets[id]);
    }
}
