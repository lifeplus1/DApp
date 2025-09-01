// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./MockToken.sol";

contract MockCToken is ERC20 {
    IERC20 public immutable underlying;
    uint256 public exchangeRateStored = 2e16; // 0.02 (50:1 ratio)
    uint256 public supplyRatePerBlock = 100000000000000; // ~5% APY
    
    constructor(address _underlying) ERC20("Mock cUSDC", "mcUSDC") {
        underlying = IERC20(_underlying);
    }
    
    function mint(uint256 mintAmount) external returns (uint256) {
        require(mintAmount > 0, "Amount must be > 0");
        
        // Transfer underlying from user
        underlying.transferFrom(msg.sender, address(this), mintAmount);
        
        // Mint cTokens (1:50 ratio approximately)
        uint256 mintTokens = (mintAmount * 1e18) / exchangeRateStored;
        _mint(msg.sender, mintTokens);
        
        return 0; // Success
    }
    
    function redeem(uint256 redeemTokens) external returns (uint256) {
        require(redeemTokens > 0, "Amount must be > 0");
        require(balanceOf(msg.sender) >= redeemTokens, "Insufficient balance");
        
        // Calculate underlying amount to return
        uint256 underlyingAmount = (redeemTokens * exchangeRateStored) / 1e18;
        
        // Burn cTokens
        _burn(msg.sender, redeemTokens);
        
        // Transfer underlying to user
        underlying.transfer(msg.sender, underlyingAmount);
        
        return 0; // Success
    }
    
    function redeemUnderlying(uint256 redeemAmount) external returns (uint256) {
        require(redeemAmount > 0, "Amount must be > 0");
        
        // Calculate cTokens to burn
        uint256 burnTokens = (redeemAmount * 1e18) / exchangeRateStored;
        require(balanceOf(msg.sender) >= burnTokens, "Insufficient balance");
        
        // Burn cTokens
        _burn(msg.sender, burnTokens);
        
        // Transfer underlying to user
        underlying.transfer(msg.sender, redeemAmount);
        
        return 0; // Success
    }
    
    function comptroller() external pure returns (address) {
        return address(0x1); // Mock address
    }
    
    // Update exchange rate (for testing compound interest)
    function setExchangeRate(uint256 newRate) external {
        exchangeRateStored = newRate;
    }
    
    function setSupplyRate(uint256 newRate) external {
        supplyRatePerBlock = newRate;
    }
}
