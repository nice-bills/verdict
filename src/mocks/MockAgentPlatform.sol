// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAgentRequester, Response, Request, ResponseStatus, ConsensusType} from "../interfaces/IAgentRequester.sol";

/// @notice Test double for Somnia Agents platform — synchronously invokes callback.
contract MockAgentPlatform is IAgentRequester {
    uint256 public minDeposit = 0.03 ether;
    uint256 internal nextRequestId = 1;

    string public nextResult = "YES";
    bool public nextFail;

    function setNextResult(string calldata result) external {
        nextResult = result;
    }

    function setNextFail(bool fail) external {
        nextFail = fail;
    }

    function getRequestDeposit() external view returns (uint256) {
        return minDeposit;
    }

    function getRequest(uint256) external pure returns (Request memory) {
        revert("not implemented");
    }

    function hasRequest(uint256) external pure returns (bool) {
        return true;
    }

    function createRequest(
        uint256,
        address callbackAddress,
        bytes4 callbackSelector,
        bytes calldata
    ) external payable returns (uint256 requestId) {
        requestId = nextRequestId++;

        Response[] memory responses = new Response[](1);
        responses[0] = Response({
            validator: address(0xBEEF),
            result: abi.encode(nextResult),
            status: ResponseStatus.Success,
            receipt: 0,
            timestamp: block.timestamp,
            executionCost: 0
        });

        ResponseStatus status = nextFail ? ResponseStatus.Failed : ResponseStatus.Success;

        Request memory details;
        details.status = status;
        details.consensusType = ConsensusType.Majority;

        (bool ok,) = callbackAddress.call(
            abi.encodeWithSelector(callbackSelector, requestId, responses, status, details)
        );
        require(ok, "callback failed");
    }
}
