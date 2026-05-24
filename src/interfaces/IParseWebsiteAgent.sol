// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Somnia base agent: LLM Parse Website
/// @dev https://docs.somnia.network/agents/base-agents/llm-parse-website
interface IParseWebsiteAgent {
    function ExtractString(
        string calldata key,
        string calldata description,
        string[] calldata options,
        string calldata prompt,
        string calldata url,
        bool resolveUrl,
        uint8 numPages
    ) external returns (string memory output);
}
