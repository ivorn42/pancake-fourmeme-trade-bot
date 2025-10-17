# BNB Chain Trading Bot

<div align="center">

**Professional Trading Bot for BNB Smart Chain**

*Automated Token Deployment | Liquidity Management | Trading Strategies*

[![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-yellow.svg)](https://hardhat.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.19-blue.svg)](https://soliditylang.org/)
[![BSC](https://img.shields.io/badge/BNB%20Chain-Compatible-green.svg)](https://www.bnbchain.org/)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Workflow](#workflow)
- [Security](#security-considerations)
- [Disclaimer](#disclaimer)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support--contact)

---

## Overview

A sophisticated trading bot infrastructure for BNB Smart Chain, enabling automated token deployment, liquidity pool creation, and advanced trading strategies. Optimized for PancakeSwap V3 and Four.meme platforms with MEV protection via bloXroute.

## Features

- **🚀 Token Deployment** - Automated ERC20 token creation with customizable parameters
- **💧 Liquidity Management** - Seamless pool creation and liquidity provisioning on PancakeSwap V3
- **⚡ Transaction Bundling** - bloXroute integration for MEV protection and atomic operations
- **🎯 Trading Strategies** - Support for sniping, bundling, and volume generation
- **🔒 Security First** - Built with OpenZeppelin contracts and comprehensive testing
- **🧪 Fork Testing** - BSC mainnet forking for realistic testing environment

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Smart Contracts | Solidity ^0.8.9 |
| Framework | Hardhat ^2.19.5 |
| Testing | Hardhat Toolbox |
| DEX Integration | Uniswap V3 SDK |
| Security | OpenZeppelin Contracts |
| RPC Provider | QuickNode |
| MEV Protection | bloXroute |

---

## Prerequisites

- **Node.js** v16.x or higher
- **npm** v8.x or higher
- **RPC Access** - QuickNode or similar BSC RPC endpoint
- **bloXroute Account** - API credentials for transaction bundling
- **Funded Wallet** - Private key with BNB on BNB Smart Chain

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ivorn42/bnb-sniper-bundler-volume-bot
   cd bnb-sniper-bundler-volume-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   PRIVATE_KEY=your_wallet_private_key
   AUTHORIZATION_HEADER=your_bloxroute_auth_token
   ```

## Configuration

### Network Configuration

Update `hardhat.config.js` with your BSC RPC URL:

```javascript
networks: {
  hardhat: {
    forking: {
      url: "YOUR_BSC_RPC_URL",
    },
  },
}
```

### bloXroute Setup

Update `constants/index.js` with your bloXroute credentials:

```javascript
export const BLOXROUTE_AUTHORIZATION_HEADER = 'your_auth_token'
export const BLOXROUTE_ENDPOINT = 'https://api.blxrbdn.com'
```

## Usage

### Quick Start

```bash
# Start local Hardhat node with BSC fork
npm run sn

# Run tests
npm run t

# Deploy bot
npm run dev
```

### Available Commands

```bash
# Compile contracts
npx hardhat compile

# Run specific script
npx hardhat run scripts/deploy.js

# Test with gas reporting
REPORT_GAS=true npx hardhat test

# Get help
npx hardhat help
```

## Project Structure

```
bnb-sniper-bundler-volume-bot/
├── contracts/
│   └── MyToken.sol          # ERC20 token contract
├── scripts/
│   ├── bloxroute.js         # Main bot logic
│   ├── deploy.js            # Deployment scripts
│   └── abi.js               # Contract ABIs
├── constants/
│   └── index.js             # Configuration constants
├── test/
│   └── Lock.js              # Test suites
├── artifacts/               # Compiled contracts
├── cache/                   # Hardhat cache
├── hardhat.config.js        # Hardhat configuration
├── package.json             # Dependencies
└── README.md                # Documentation
```

## Workflow

The bot executes the following operations atomically via bloXroute:

1. Deploy custom ERC20 token
2. Approve token for NFPM (Non-Fungible Position Manager)
3. Approve WBNB for NFPM
4. Create liquidity pool on PancakeSwap V3
5. Initialize pool with pricing
6. Add liquidity to pool
7. Execute buy transaction

All operations are bundled to ensure atomicity and MEV protection.

## Security Considerations

⚠️ **Important Security Notes:**

1. **Never commit `.env` files** containing private keys or API tokens
2. **Use separate wallets** for testing and production
3. **Audit all transactions** before execution on mainnet
4. **Test thoroughly** on forked networks before live deployment
5. **Monitor gas prices** to avoid overpaying for transactions
6. **Understand MEV risks** when executing atomic bundles

## Disclaimer

This software is provided for **educational and research purposes only**.

- Trading cryptocurrencies involves substantial risk of loss
- The developers assume no responsibility for financial losses
- Always comply with local regulations and tax requirements
- Use at your own risk

**By using this software, you acknowledge that you understand the risks involved in cryptocurrency trading.**

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Acknowledgments

- [Hardhat](https://hardhat.org/) - Ethereum development environment
- [OpenZeppelin](https://openzeppelin.com/) - Secure smart contract library
- [Uniswap V3](https://uniswap.org/) - DEX protocol
- [bloXroute](https://bloxroute.com/) - Transaction bundling infrastructure
- [QuickNode](https://quicknode.com/) - Blockchain infrastructure

## Support & Contact

For questions, support, or collaboration inquiries:

**Telegram**: [@ivorn42](https://t.me/ivorn42)

---

<div align="center">

**Built with ❤️ for the BNB Chain ecosystem**

</div>
