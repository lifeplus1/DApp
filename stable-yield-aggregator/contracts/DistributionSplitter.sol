// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DistributionSplitter
 * @notice Splits received protocol fees among configured recipients by weight.
 * @dev Weights sum to 10_000 (BPS). Designed to receive funds from FeeController as feeRecipient.
 */
contract DistributionSplitter is Ownable {
    struct RecipientInfo { address account; uint256 weight; }

    RecipientInfo[] public recipients;
    uint256 public totalWeight; // should equal 10_000 after each update
    uint256 public constant DENOMINATOR = 10_000;

    event RecipientsUpdated(address[] accounts, uint256[] weights, uint256 timestamp);
    event Distribution(address indexed token, uint256 total, address indexed recipient, uint256 amount);

    constructor(address _owner) Ownable(_owner) {}

    function updateRecipients(address[] calldata accounts, uint256[] calldata weights) external onlyOwner {
        require(accounts.length == weights.length && accounts.length > 0, "LEN_MISMATCH");
        delete recipients;
        uint256 _total;
        for (uint256 i; i < accounts.length; ++i) {
            require(accounts[i] != address(0), "ZERO_ADDR");
            recipients.push(RecipientInfo({account: accounts[i], weight: weights[i]}));
            _total += weights[i];
        }
        require(_total == DENOMINATOR, "BAD_TOTAL");
        totalWeight = _total;
        emit RecipientsUpdated(accounts, weights, block.timestamp);
    }

    function recipientsCount() external view returns (uint256) { return recipients.length; }

    function distribute(address token) external {
        uint256 bal = IERC20(token).balanceOf(address(this));
        require(bal > 0, "NO_FUNDS");
        uint256 length = recipients.length;
        require(length > 0 && totalWeight == DENOMINATOR, "NOT_CONFIGURED");
        for (uint256 i; i < length; ++i) {
            uint256 share = (bal * recipients[i].weight) / DENOMINATOR;
            if (share > 0) {
                IERC20(token).transfer(recipients[i].account, share);
                emit Distribution(token, bal, recipients[i].account, share);
            }
        }
    }
}