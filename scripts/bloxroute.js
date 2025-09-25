/**
 * BNB Chain Trading Bot - bloXroute Bundle Executor
 * 
 * This script handles atomic transaction bundling for:
 * - Token deployment
 * - Pool creation on PancakeSwap V3
 * - Liquidity provisioning
 * - Initial token purchase
 * 
 * @author soljesty
 * @version 1.0.0
 */

require("dotenv").config();

// Core dependencies
const { ethers: hardhatEthers } = require("hardhat");
const { ethers } = require("ethers");
const axios = require("axios");

// Uniswap SDK
const { Token, Percent } = require("@uniswap/sdk-core");
const { abi: UniswapV3FactoryABI } = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json');
const { 
  encodeSqrtRatioX96, 
  Pool, 
  Position, 
  TickMath, 
  NonfungiblePositionManager, 
  nearestUsableTick 
} = require("@uniswap/v3-sdk");
const JSBI = require('jsbi');

// Local dependencies
const { SwapRouterAbi } = require("./abi");
const { defaultAbiCoder } = require("@ethersproject/abi");
const { BLOXROUTE_ENDPOINT, RPC_ENDPOINT } = require("../constants");

// ==================== CONFIGURATION ==================== //

/**
 * Environment validation
 */
const CONFIG = {
  API_ENDPOINT: BLOXROUTE_ENDPOINT,
  AUTHORIZATION_HEADER: process.env.AUTHORIZATION_HEADER,
  PRIVATE_KEY: process.env.PRIVATE_KEY,
  RPC_URL: RPC_ENDPOINT,
  
  // Token configuration
  TOKEN_NAME: process.env.TOKEN_NAME || "MyToken",
  TOKEN_SYMBOL: process.env.TOKEN_SYMBOL || "MTK",
  TOKEN_SUPPLY: process.env.TOKEN_SUPPLY || "1000000", // Default 1M tokens
  
  // Trading configuration
  GAS_PRICE_MULTIPLIER: parseFloat(process.env.GAS_PRICE_MULTIPLIER) || 1.2, // 20% increase
  FUTURE_BLOCK_OFFSET: parseInt(process.env.FUTURE_BLOCK_OFFSET) || 5,
  
  // Pool configuration
  FEE_TIER: parseInt(process.env.FEE_TIER) || 3000, // 0.3% default
  INITIAL_PRICE: process.env.INITIAL_PRICE || "1", // Initial token price
};

// ==================== VALIDATION ==================== //

/**
 * Validates required environment variables
 * @throws {Error} If required variables are missing
 */
function validateEnvironment() {
  const required = ['PRIVATE_KEY', 'AUTHORIZATION_HEADER'];
  const missing = required.filter(key => !CONFIG[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please create a .env file with the required variables.'
    );
  }
  
  // Validate private key format
  if (!CONFIG.PRIVATE_KEY.startsWith('0x')) {
    CONFIG.PRIVATE_KEY = '0x' + CONFIG.PRIVATE_KEY;
  }
  
  console.log('✓ Environment validation passed');
}

// ==================== PROVIDER & WALLET SETUP ==================== //

let provider;
let wallet;

/**
 * Initializes provider and wallet
 */
async function initializeProviderAndWallet() {
  try {
    provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    
    // Verify connection
    const network = await provider.getNetwork();
    const balance = await provider.getBalance(wallet.address);
    
    console.log('✓ Connected to network:', network.name, `(Chain ID: ${network.chainId})`);
    console.log('✓ Wallet address:', wallet.address);
    console.log('✓ Wallet balance:', ethers.formatEther(balance), 'BNB');
    
    // Check minimum balance (0.1 BNB recommended)
    const minBalance = ethers.parseEther("0.1");
    if (balance < minBalance) {
      console.warn('⚠ Warning: Low wallet balance. Recommended minimum: 0.1 BNB');
    }
    
  } catch (error) {
    throw new Error(`Failed to initialize provider/wallet: ${error.message}`);
  }
}

// ==================== HELPER FUNCTIONS ==================== //

/**
 * Calculates optimal gas price with multiplier
 * @returns {Promise<bigint>} Adjusted gas price
 */
async function getOptimalGasPrice() {
  try {
    const feeData = await provider.getFeeData();
    const baseGasPrice = feeData.gasPrice;
    const adjustedGasPrice = (baseGasPrice * BigInt(Math.floor(CONFIG.GAS_PRICE_MULTIPLIER * 100))) / 100n;
    
    console.log(`Gas Price: ${ethers.formatUnits(baseGasPrice, 'gwei')} gwei → ${ethers.formatUnits(adjustedGasPrice, 'gwei')} gwei (${CONFIG.GAS_PRICE_MULTIPLIER}x)`);
    
    return adjustedGasPrice;
  } catch (error) {
    throw new Error(`Failed to get gas price: ${error.message}`);
  }
}

/**
 * Gets the next nonce for the wallet
 * @returns {Promise<number>} Next nonce
 */
async function getNonce() {
  return await provider.getTransactionCount(wallet.address, 'pending');
}

/**
 * Calculates future block number for bundle submission
 * @returns {Promise<string>} Future block number in hex
 */
async function getFutureBlockHex() {
  const currentBlock = await provider.getBlockNumber();
  const futureBlock = currentBlock + CONFIG.FUTURE_BLOCK_OFFSET;
  console.log(`Current Block: ${currentBlock} → Target Block: ${futureBlock}`);
  return '0x' + futureBlock.toString(16);
}

/**
 * Submits bundle to bloXroute
 * @param {Array<string>} rawTransactions - Array of signed raw transactions
 * @param {string} blockNumber - Target block number in hex
 * @returns {Promise<Object>} bloXroute response
 */
async function submitBundle(rawTransactions, blockNumber) {
  try {
    const response = await axios.post(
      `${CONFIG.API_ENDPOINT}/api/v1/bundle`,
      {
        transaction: rawTransactions,
        block_number: blockNumber,
        min_timestamp: 0,
        max_timestamp: 0
      },
      {
        headers: {
          'Authorization': CONFIG.AUTHORIZATION_HEADER,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✓ Bundle submitted successfully');
    console.log('Bundle Hash:', response.data.bundle_hash);
    
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message;
    throw new Error(`Bundle submission failed: ${errorMsg}`);
  }
}

/**
 * Waits for transaction confirmation
 * @param {string} txHash - Transaction hash
 * @param {number} confirmations - Number of confirmations to wait for
 * @returns {Promise<Object>} Transaction receipt
 */
async function waitForTransaction(txHash, confirmations = 1) {
  console.log(`Waiting for transaction: ${txHash}`);
  const receipt = await provider.waitForTransaction(txHash, confirmations);
  
  if (receipt.status === 0) {
    throw new Error('Transaction failed');
  }
  
  console.log(`✓ Transaction confirmed in block ${receipt.blockNumber}`);
  return receipt;
}

// ==================== MAIN EXECUTION ==================== //

/**
 * Main bot execution function
 * 
 * Bundle workflow:
 * 1. Deploy ERC20 token contract
 * 2. Approve token for NFPM (Non-Fungible Position Manager)
 * 3. Approve WBNB for NFPM
 * 4. Create PancakeSwap V3 pool
 * 5. Initialize pool with price
 * 6. Add liquidity to pool
 * 7. Execute initial buy transaction
 */
async function main() {
  console.log('\n========================================');
  console.log('  BNB CHAIN TRADING BOT');
  console.log('  bloXroute Bundle Executor');
  console.log('========================================\n');
  
  try {
    // Step 1: Validate environment
    console.log('[1/7] Validating environment...');
    validateEnvironment();
    
    // Step 2: Initialize provider and wallet
    console.log('\n[2/7] Initializing provider and wallet...');
    await initializeProviderAndWallet();
    
    // Step 3: Get gas parameters
    console.log('\n[3/7] Calculating gas parameters...');
    const gasPrice = await getOptimalGasPrice();
    let nonce = await getNonce();
    const futureBlockHex = await getFutureBlockHex();
    
    // Step 4: Prepare token deployment parameters
    console.log('\n[4/7] Preparing token deployment...');
    const tokenSupply = BigInt(CONFIG.TOKEN_SUPPLY) * 10n ** 18n;
    console.log(`Token: ${CONFIG.TOKEN_NAME} (${CONFIG.TOKEN_SYMBOL})`);
    console.log(`Supply: ${CONFIG.TOKEN_SUPPLY} tokens`);
    
    // Step 5: Get contract factory
    console.log('\n[5/7] Loading contract artifacts...');
    const TokenFactory = await hardhatEthers.getContractFactory("MyToken", wallet);
    
    // Step 6: Build transactions array
    console.log('\n[6/7] Building transaction bundle...');
    const transactions = [];
    
    // Transaction 0: Deploy Token
    console.log('  → Adding token deployment transaction');
    const deployTx = await TokenFactory.getDeployTransaction(
      CONFIG.TOKEN_NAME,
      CONFIG.TOKEN_SYMBOL,
      tokenSupply
    );
    
    const signedDeployTx = await wallet.signTransaction({
      ...deployTx,
      nonce: nonce++,
      gasPrice: gasPrice,
      gasLimit: 2000000n,
      chainId: (await provider.getNetwork()).chainId
    });
    
    transactions.push(signedDeployTx);
    console.log(`  ✓ Transaction 0: Token Deployment (nonce: ${nonce - 1})`);
    
    // TODO: Add additional transactions for:
    // - Token approval for NFPM
    // - WBNB approval for NFPM
    // - Pool creation
    // - Pool initialization
    // - Add liquidity
    // - Initial buy
    
    console.log(`\n  Total transactions in bundle: ${transactions.length}`);
    
    // Step 7: Submit bundle to bloXroute
    console.log('\n[7/7] Submitting bundle to bloXroute...');
    const bundleResult = await submitBundle(transactions, futureBlockHex);
    
    console.log('\n========================================');
    console.log('  BUNDLE SUBMITTED SUCCESSFULLY');
    console.log('========================================');
    console.log('Bundle Hash:', bundleResult.bundle_hash);
    console.log('Target Block:', futureBlockHex);
    console.log('\nMonitor your bundle at bloXroute dashboard');
    console.log('========================================\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// ==================== EXECUTION ==================== //

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Execute main function
if (require.main === module) {
  main()
    .then(() => {
      console.log('✓ Bot execution completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}

// Export for testing
module.exports = {
  main,
  validateEnvironment,
  initializeProviderAndWallet,
  getOptimalGasPrice,
  submitBundle
};