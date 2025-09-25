/**
 * Constants Configuration
 * 
 * Central configuration file for blockchain and API endpoints
 * These should be overridden by environment variables in production
 * 
 * @module constants
 */

require('dotenv').config();

/**
 * BNB Smart Chain RPC Endpoint
 * @type {string}
 */
const RPC_ENDPOINT = process.env.RPC_URL || 
  'https://winter-wild-isle.bsc.quiknode.pro/f31cb3e6e45fdd573a825c77b5ea62d2de9cd884/';

/**
 * bloXroute API Endpoint
 * @type {string}
 */
const BLOXROUTE_ENDPOINT = process.env.BLOXROUTE_ENDPOINT || 
  'https://api.blxrbdn.com';

/**
 * bloXroute Authorization Header
 * Note: This should be set via AUTHORIZATION_HEADER environment variable
 * @type {string}
 * @deprecated Use environment variable instead
 */
const BLOXROUTE_AUTHORIZATION_HEADER = process.env.AUTHORIZATION_HEADER || 
  'MjIyNGRlYjItMWUxYy00YWY2LTgzNTEtZDFmMTc5NDk3ZjA4OjczZjczNDU1YjgwNmE3MTRhMzBjOWVkY2NmMjIyNjMx';

/**
 * PancakeSwap V3 Contract Addresses on BSC
 */
const PANCAKESWAP_V3_ADDRESSES = {
  FACTORY: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
  SWAP_ROUTER: '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4',
  NONFUNGIBLE_POSITION_MANAGER: '0x46A15B0b27311cedF172AB29E4f4766fbE7F4364',
  QUOTER_V2: '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997',
};

/**
 * Common Token Addresses on BSC
 */
const TOKEN_ADDRESSES = {
  WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
  USDT: '0x55d398326f99059fF775485246999027B3197955',
  USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
};

/**
 * Network Configuration
 */
const NETWORK_CONFIG = {
  CHAIN_ID: 56,
  CHAIN_NAME: 'BNB Smart Chain',
  NATIVE_CURRENCY: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
  BLOCK_TIME: 3, // seconds
  CONFIRMATION_BLOCKS: 3,
};

/**
 * Gas Configuration Defaults
 */
const GAS_CONFIG = {
  MAX_GAS_PRICE: '50', // gwei
  MIN_GAS_PRICE: '3', // gwei
  GAS_LIMIT_MULTIPLIER: 1.2,
  PRIORITY_FEE: '1', // gwei
};

// Export all constants
module.exports = {
  RPC_ENDPOINT,
  BLOXROUTE_ENDPOINT,
  BLOXROUTE_AUTHORIZATION_HEADER,
  PANCAKESWAP_V3_ADDRESSES,
  TOKEN_ADDRESSES,
  NETWORK_CONFIG,
  GAS_CONFIG,
};