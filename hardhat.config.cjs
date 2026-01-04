require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "paris", // Match the deployed contract
    },
  },
  networks: {
    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 84532,
    },
    base: {
      url: "https://mainnet.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 8453,
    },
    // Add other networks as needed
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
  etherscan: {
    apiKey: {
      base: process.env.BASESCAN_API_KEY || "VMZ25B4ZKF49UPSI6J1QYM261DQ98C85N3",
      baseSepolia: process.env.BASESCAN_API_KEY || "VMZ25B4ZKF49UPSI6J1QYM261DQ98C85N3",
    },
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          // Try V2 endpoint format - plugin requires V2 but BaseScan may need different format
          apiURL: "https://api.basescan.org/v2/api",
          browserURL: "https://basescan.org",
        },
      },
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/v2/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },
};

module.exports = config;