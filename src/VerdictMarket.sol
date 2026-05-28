// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAgentRequester, IAgentRequesterHandler, Response, Request, ResponseStatus} from "./interfaces/IAgentRequester.sol";
import {IParseWebsiteAgent} from "./interfaces/IParseWebsiteAgent.sol";

/// @title VerdictMarket
/// @notice YES/NO prediction market settled by Somnia LLM Parse Website agent (consensus-verified).
contract VerdictMarket is IAgentRequesterHandler {
    enum MarketState {
        Open,
        Resolving,
        Resolved
    }

    enum Outcome {
        None,
        Yes,
        No,
        Invalid
    }

    uint256 public constant MIN_STAKE = 0.001 ether;
    uint256 public constant SUBCOMMITTEE_SIZE = 3;
    /// @dev Max time in Resolving before anyone may call expireResolution() (refund stakes).
    uint256 public constant RESOLVE_TIMEOUT = 2 hours;
    /// @dev Per-agent price for LLM Parse Website (see Somnia gas-fees docs).
    uint256 public constant PARSE_COST_PER_AGENT = 0.1 ether;

    IAgentRequester public immutable platform;
    uint256 public immutable parseAgentId;
    address public immutable factory;

    string public question;
    string public sourceUrl;
    string public resolvePrompt;
    uint256 public deadline;
    address public creator;

    MarketState public state;
    Outcome public outcome;
    string public agentReasoning;
    uint256 public resolveStartedAt;
    uint256 public lastResolveRequestId;

    uint256 public totalYesStake;
    uint256 public totalNoStake;

    /// @dev Snapshot at resolution for pro-rata claims.
    uint256 public poolAtResolution;
    uint256 public winningStakeTotal;

    mapping(address => uint256) public yesStake;
    mapping(address => uint256) public noStake;
    mapping(address => bool) public claimed;

    mapping(uint256 => bool) public pendingRequests;

    event Staked(address indexed user, bool indexed isYes, uint256 amount);
    event ResolveRequested(uint256 indexed requestId);
    event MarketResolved(Outcome indexed outcome, string reasoning);
    event ResolutionExpired(uint256 indexed requestId);
    event Payout(address indexed user, uint256 amount);

    error NotFactory();
    error MarketNotOpen();
    error NotResolving();
    error NotResolved();
    error DeadlinePassed();
    error BeforeDeadline();
    error ZeroStake();
    error OnlyPlatform();
    error UnknownRequest();
    error TransferFailed();
    error AlreadyClaimed();
    error NothingToClaim();
    error Underfunded();
    error ResolveNotTimedOut();

    modifier onlyFactory() {
        if (msg.sender != factory) revert NotFactory();
        _;
    }

    constructor(
        address platform_,
        uint256 parseAgentId_,
        address factory_,
        address creator_,
        string memory question_,
        string memory sourceUrl_,
        string memory resolvePrompt_,
        uint256 deadline_
    ) {
        platform = IAgentRequester(platform_);
        parseAgentId = parseAgentId_;
        factory = factory_;
        creator = creator_;
        question = question_;
        sourceUrl = sourceUrl_;
        resolvePrompt = resolvePrompt_;
        deadline = deadline_;
        state = MarketState.Open;
    }

    function stake(bool isYes) external payable {
        if (state != MarketState.Open) revert MarketNotOpen();
        if (block.timestamp >= deadline) revert DeadlinePassed();
        if (msg.value < MIN_STAKE) revert ZeroStake();

        if (isYes) {
            yesStake[msg.sender] += msg.value;
            totalYesStake += msg.value;
        } else {
            noStake[msg.sender] += msg.value;
            totalNoStake += msg.value;
        }
        emit Staked(msg.sender, isYes, msg.value);
    }

    function resolve() external payable returns (uint256 requestId) {
        if (state != MarketState.Open) revert MarketNotOpen();
        if (block.timestamp < deadline) revert BeforeDeadline();

        state = MarketState.Resolving;
        resolveStartedAt = block.timestamp;

        string[] memory options = new string[](3);
        options[0] = "YES";
        options[1] = "NO";
        options[2] = "INVALID";

        string memory fullPrompt = string.concat(
            "Question: ",
            question,
            ". Resolution rule: ",
            resolvePrompt,
            ". Answer with exactly one of: YES, NO, or INVALID."
        );

        bytes memory payload = abi.encodeWithSelector(
            IParseWebsiteAgent.ExtractString.selector,
            "outcome",
            "Market resolution outcome",
            options,
            fullPrompt,
            sourceUrl,
            false,
            uint8(1)
        );

        uint256 deposit = requiredResolveDeposit();
        if (msg.value < deposit) revert Underfunded();

        requestId = platform.createRequest{value: deposit}(
            parseAgentId,
            address(this),
            this.handleResponse.selector,
            payload
        );
        lastResolveRequestId = requestId;
        pendingRequests[requestId] = true;
        emit ResolveRequested(requestId);

        uint256 surplus = msg.value - deposit;
        if (surplus > 0) {
            (bool refundOk,) = msg.sender.call{value: surplus}("");
            if (!refundOk) revert TransferFailed();
        }
    }

    /// @notice If Somnia never callbacks, finalize as INVALID after RESOLVE_TIMEOUT (all stakes refundable).
    function expireResolution() external {
        if (state != MarketState.Resolving) revert NotResolving();
        if (block.timestamp < resolveStartedAt + RESOLVE_TIMEOUT) revert ResolveNotTimedOut();

        uint256 requestId = lastResolveRequestId;
        if (requestId != 0) {
            delete pendingRequests[requestId];
        }

        poolAtResolution = totalYesStake + totalNoStake;
        outcome = Outcome.Invalid;
        agentReasoning = "Resolution timed out waiting for Somnia agent callback";
        winningStakeTotal = 0;
        state = MarketState.Resolved;
        emit ResolutionExpired(requestId);
        emit MarketResolved(outcome, agentReasoning);
    }

    function handleResponse(
        uint256 requestId,
        Response[] memory responses,
        ResponseStatus status,
        Request memory
    ) external override {
        if (msg.sender != address(platform)) revert OnlyPlatform();
        if (!pendingRequests[requestId]) revert UnknownRequest();
        delete pendingRequests[requestId];
        if (state != MarketState.Resolving) revert NotResolving();

        poolAtResolution = totalYesStake + totalNoStake;

        if (status != ResponseStatus.Success || responses.length == 0) {
            outcome = Outcome.Invalid;
            agentReasoning = "Agent request failed or timed out";
            winningStakeTotal = 0;
            state = MarketState.Resolved;
            emit MarketResolved(outcome, agentReasoning);
            return;
        }

        string memory verdict = abi.decode(responses[0].result, (string));
        agentReasoning = verdict;
        outcome = _parseOutcome(verdict);

        if (outcome == Outcome.Yes) {
            winningStakeTotal = totalYesStake;
        } else if (outcome == Outcome.No) {
            winningStakeTotal = totalNoStake;
        } else {
            winningStakeTotal = 0;
        }

        state = MarketState.Resolved;
        emit MarketResolved(outcome, agentReasoning);
    }

    function requiredResolveDeposit() public view returns (uint256) {
        return platform.getRequestDeposit() + PARSE_COST_PER_AGENT * SUBCOMMITTEE_SIZE;
    }

    function totalPool() public view returns (uint256) {
        return totalYesStake + totalNoStake;
    }

    function claim() external {
        if (state != MarketState.Resolved) revert NotResolved();
        if (claimed[msg.sender]) revert AlreadyClaimed();

        uint256 amount;
        if (outcome == Outcome.Invalid || winningStakeTotal == 0) {
            amount = yesStake[msg.sender] + noStake[msg.sender];
        } else {
            uint256 stake_ = outcome == Outcome.Yes ? yesStake[msg.sender] : noStake[msg.sender];
            if (stake_ == 0) revert NothingToClaim();
            amount = (stake_ * poolAtResolution) / winningStakeTotal;
        }

        if (amount == 0) revert NothingToClaim();

        yesStake[msg.sender] = 0;
        noStake[msg.sender] = 0;
        claimed[msg.sender] = true;

        (bool ok,) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Payout(msg.sender, amount);
    }

    receive() external payable {}

    function _parseOutcome(string memory verdict) internal pure returns (Outcome) {
        if (_eqWord(verdict, "YES")) return Outcome.Yes;
        if (_eqWord(verdict, "NO")) return Outcome.No;
        if (_eqWord(verdict, "INVALID")) return Outcome.Invalid;
        return Outcome.Invalid;
    }

    /// @dev Case-insensitive compare after trimming ASCII whitespace.
    function _eqWord(string memory value, string memory word) internal pure returns (bool) {
        bytes memory v = bytes(value);
        bytes memory w = bytes(word);
        uint256 vi = 0;
        uint256 vEnd = v.length;
        while (vi < vEnd && v[vi] == 0x20) vi++;
        while (vEnd > vi && v[vEnd - 1] == 0x20) vEnd--;

        uint256 wi = 0;
        uint256 wEnd = w.length;
        while (wi < wEnd && w[wi] == 0x20) wi++;
        while (wEnd > wi && w[wEnd - 1] == 0x20) wEnd--;

        uint256 vLen = vEnd - vi;
        uint256 wLen = wEnd - wi;
        if (vLen != wLen) return false;

        for (uint256 i = 0; i < vLen; i++) {
            if (_asciiLower(v[vi + i]) != _asciiLower(w[wi + i])) return false;
        }
        return true;
    }

    function _asciiLower(bytes1 c) internal pure returns (bytes1) {
        if (c >= 0x41 && c <= 0x5A) {
            return bytes1(uint8(c) + 32);
        }
        return c;
    }
}
