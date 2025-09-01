// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockComptroller {
    IERC20 public immutable comp;
    mapping(address => uint256) public pendingRewards;

    constructor(address _comp) {
        comp = IERC20(_comp);
    }

    function claimComp(address holder) external {
        uint256 rewards = pendingRewards[holder];
        if (rewards == 0) {
            // Mock some rewards for testing
            rewards = 1e18; // 1 COMP token
        }

        if (rewards > 0 && comp.balanceOf(address(this)) >= rewards) {
            comp.transfer(holder, rewards);
            pendingRewards[holder] = 0;
        }
    }

    function getCompAddress() external view returns (address) {
        return address(comp);
    }

    function setPendingRewards(address holder, uint256 amount) external {
        pendingRewards[holder] = amount;
    }
}
