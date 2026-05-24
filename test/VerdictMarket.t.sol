// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {VerdictFactory} from "../src/VerdictFactory.sol";
import {VerdictMarket} from "../src/VerdictMarket.sol";
import {MockAgentPlatform} from "../src/mocks/MockAgentPlatform.sol";

contract VerdictMarketTest is Test {
    MockAgentPlatform platform;
    VerdictFactory factory;
    VerdictMarket market;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        platform = new MockAgentPlatform();
        factory = new VerdictFactory(address(platform), 12875401142070969085);
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        vm.deal(address(this), 10 ether);

        vm.warp(1_700_000_000);
        address m = factory.createMarket(
            "Will the page contain LAUNCH?",
            "https://example.com",
            "Return YES if the word LAUNCH appears in the page body.",
            block.timestamp + 1 days
        );
        market = VerdictMarket(payable(m));
    }

    function test_stake_yes_and_no() public {
        vm.prank(alice);
        market.stake{value: 0.01 ether}(true);
        vm.prank(bob);
        market.stake{value: 0.02 ether}(false);

        assertEq(market.totalYesStake(), 0.01 ether);
        assertEq(market.totalNoStake(), 0.02 ether);
        assertEq(market.totalPool(), 0.03 ether);
    }

    function test_resolve_yes_payout() public {
        vm.prank(alice);
        market.stake{value: 0.01 ether}(true);
        vm.prank(bob);
        market.stake{value: 0.02 ether}(false);

        vm.warp(block.timestamp + 1 days + 1);

        platform.setNextResult("YES");
        uint256 deposit = market.requiredResolveDeposit();
        market.resolve{value: deposit}();

        assertEq(uint256(market.state()), uint256(VerdictMarket.MarketState.Resolved));
        assertEq(uint256(market.outcome()), uint256(VerdictMarket.Outcome.Yes));

        uint256 aliceBefore = alice.balance;
        vm.prank(alice);
        market.claim();
        assertEq(alice.balance, aliceBefore + 0.03 ether);

        vm.prank(bob);
        vm.expectRevert();
        market.claim();
    }

    function test_resolve_no_payout() public {
        vm.prank(alice);
        market.stake{value: 0.01 ether}(true);
        vm.prank(bob);
        market.stake{value: 0.02 ether}(false);

        vm.warp(block.timestamp + 1 days + 1);

        platform.setNextResult("NO");
        market.resolve{value: market.requiredResolveDeposit()}();

        assertEq(uint256(market.outcome()), uint256(VerdictMarket.Outcome.No));

        uint256 bobBefore = bob.balance;
        vm.prank(bob);
        market.claim();
        assertEq(bob.balance, bobBefore + 0.03 ether);
    }

    function test_resolve_invalid_refunds() public {
        vm.prank(alice);
        market.stake{value: 0.01 ether}(true);
        vm.prank(bob);
        market.stake{value: 0.02 ether}(false);

        vm.warp(block.timestamp + 1 days + 1);

        platform.setNextResult("INVALID");
        market.resolve{value: market.requiredResolveDeposit()}();

        assertEq(uint256(market.outcome()), uint256(VerdictMarket.Outcome.Invalid));

        vm.prank(alice);
        market.claim();
        vm.prank(bob);
        market.claim();

        assertEq(market.totalPool(), 0.03 ether); // still in contract until claimed - actually claimed drains
        assertEq(address(market).balance, 0);
    }

    function test_cannot_resolve_before_deadline() public {
        uint256 deposit = market.requiredResolveDeposit();
        vm.expectRevert(VerdictMarket.BeforeDeadline.selector);
        market.resolve{value: deposit}();
    }

    function test_factory_tracks_markets() public {
        assertEq(factory.marketCount(), 1);
        assertEq(factory.getMarket(0), address(market));
    }
}
