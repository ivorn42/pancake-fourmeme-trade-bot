/**
 * Hardhat Configuration
 * 
 * Configuration for BNB Chain Trading Bot
 * Includes BSC mainnet forking for realistic testing
 * 
 * @see https://hardhat.org/config/
 */

require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// ==================== CONFIGURATION ==================== //

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
const BSC_RPC_URL = process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org/";
const BSC_FORK_URL = process.env.BSC_FORK_URL || "https://small-thrilling-county.bsc.quiknode.pro/5309cc3b81880102c3951f4132560fa48f13a448/";
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "";

// Optional: Specify a block number to fork from for deterministic testing
const FORK_BLOCK_NUMBER = process.env.FORK_BLOCK_NUMBER ? parseInt(process.env.FORK_BLOCK_NUMBER) : undefined;

// ==================== HARDHAT CONFIG ==================== //

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  // Solidity compiler configuration
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200, // Optimize for average number of function calls
      },
      viaIR: false, // Set to true for more aggressive optimization
    },
  },

  // Network configurations
  networks: {
    // Local hardhat network with BSC fork
    hardhat: {
      chainId: 56,
      forking: {
        url: BSC_FORK_URL,
        blockNumber: FORK_BLOCK_NUMBER,
        enabled: true,
      },
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
      },
      mining: {
        auto: true,
        interval: 0, // Mine immediately
      },
      gasPrice: 3000000000, // 3 gwei
      gas: 30000000,
      allowUnlimitedContractSize: false,
      throwOnTransactionFailures: true,
      throwOnCallFailures: true,
      loggingEnabled: false,
    },

    // BSC Mainnet
    bscMainnet: {
      url: BSC_RPC_URL,
      chainId: 56,
      accounts: PRIVATE_KEY !== "0x0000000000000000000000000000000000000000000000000000000000000000" 
        ? [PRIVATE_KEY] 
        : [],
      gasPrice: "auto",
      gas: "auto",
      timeout: 60000,
    },

    // BSC Testnet
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: PRIVATE_KEY !== "0x0000000000000000000000000000000000000000000000000000000000000000"
        ? [PRIVATE_KEY]
        : [],
      gasPrice: 10000000000, // 10 gwei
      gas: "auto",
      timeout: 60000,
    },

    // Localhost for testing
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      timeout: 60000,
    },
  },

  // Path configurations
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  // Mocha test configuration
  mocha: {
    timeout: 120000, // 2 minutes for complex tests
    retries: 0,
    bail: false,
  },

  // Gas reporter configuration (for testing)
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY || "",
    token: "BNB",
    gasPriceApi: "https://api.bscscan.com/api?module=proxy&action=eth_gasPrice",
    showTimeSpent: true,
    showMethodSig: true,
  },

  // Etherscan configuration (for contract verification)
  etherscan: {
    apiKey: {
      bsc: BSCSCAN_API_KEY,
      bscTestnet: BSCSCAN_API_KEY,
    },
  },

  // Contract size check
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: false,
    strict: true,
  },
};
