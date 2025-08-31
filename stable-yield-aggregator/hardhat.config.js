require("@nomicfoundation/hardhat-toolbox");
require("@typechain/hardhat");
require("dotenv").config();

module.exports = {
  solidity: "0.8.26", // Latest secure version with best practices for gas efficiency and security.
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR-INFURA-KEY",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    mainnet: {
      url: process.env.MAINNET_RPC_URL || "https://mainnet.infura.io/v3/YOUR-INFURA-KEY",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
    alwaysGenerateOverloads: false,
    externalArtifacts: ["node_modules/@openzeppelin/contracts/build/contracts/*.json"],
    dontOverrideCompile: false,
  },
  mocha: {
    timeout: 40000 // Best practice for test timeouts.
  }
};
