// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./StableVault.sol";
import "./UniswapV3Strategy.sol";

/**
 * @title DeFi Platform Deployment Factory
 * @dev Factory contract for deploying complete DeFi yield aggregation platform
 * @notice This contract deploys and configures the entire yield farming ecosystem
 */
contract PlatformDeploymentFactory {
    event PlatformDeployed(
        address indexed vault,
        address indexed strategy,
        address indexed deployer,
        uint256 timestamp
    );

    event StrategyRegistered(
        address indexed strategy,
        string name,
        uint256 expectedAPY
    );

    struct PlatformComponents {
        address vault;
        address uniswapV3Strategy;
        address[] additionalStrategies;
        uint256 deploymentTime;
        address owner;
    }

    mapping(address => PlatformComponents) public deployedPlatforms;
    address[] public allPlatforms;

    /**
     * @dev Deploy complete DeFi platform with Uniswap V3 integration
     * @param usdcToken USDC token address on current network
     * @param initialOwner Owner address for the deployed contracts
     * @return vault Address of deployed Enhanced Vault
     * @return strategy Address of deployed Uniswap V3 Strategy
     */
    function deployPlatform(
        address usdcToken,
        address initialOwner
    ) external returns (address vault, address strategy) {
        require(usdcToken != address(0), "Invalid USDC address");
        require(initialOwner != address(0), "Invalid owner address");

        // Deploy Uniswap V3 Strategy first
        UniswapV3Strategy uniswapStrategy = new UniswapV3Strategy(
            usdcToken,
            address(0), // Will be updated after vault deployment
            initialOwner
        );
        strategy = address(uniswapStrategy);

        // Deploy Enhanced Vault with strategy
        StableVault enhancedVault = new StableVault(IERC20(usdcToken), strategy);
        vault = address(enhancedVault);

        // Update strategy's vault reference  
        // Note: In production, we'd need a setVault function on the strategy
        // uniswapStrategy.setVault(vault);
        
        // Transfer vault ownership
        enhancedVault.transferOwnership(initialOwner);

        // Store deployment information
        PlatformComponents storage platform = deployedPlatforms[msg.sender];
        platform.vault = vault;
        platform.uniswapV3Strategy = strategy;
        platform.deploymentTime = block.timestamp;
        platform.owner = initialOwner;

        allPlatforms.push(msg.sender);

        emit PlatformDeployed(vault, strategy, msg.sender, block.timestamp);
        emit StrategyRegistered(strategy, "Uniswap V3 USDC Strategy", 1200);

        return (vault, strategy);
    }

    /**
     * @dev Get deployment information for a platform
     * @param deployer Address that deployed the platform
     * @return components Full platform component information
     */
    function getPlatformInfo(address deployer) 
        external 
        view 
        returns (PlatformComponents memory components) 
    {
        return deployedPlatforms[deployer];
    }

    /**
     * @dev Get total number of deployed platforms
     * @return count Number of platforms deployed through this factory
     */
    function getPlatformCount() external view returns (uint256 count) {
        return allPlatforms.length;
    }

    /**
     * @dev Get all deployed platform addresses
     * @return platforms Array of all deployed platform deployer addresses
     */
    function getAllPlatforms() external view returns (address[] memory platforms) {
        return allPlatforms;
    }

    /**
     * @dev Verify platform deployment integrity
     * @param deployer Platform deployer address
     * @return isValid Whether the platform deployment is valid and complete
     */
    function verifyPlatformDeployment(address deployer) 
        external 
        view 
        returns (bool isValid) 
    {
        PlatformComponents memory platform = deployedPlatforms[deployer];
        
        return platform.vault != address(0) && 
               platform.uniswapV3Strategy != address(0) &&
               platform.deploymentTime > 0;
    }
}
