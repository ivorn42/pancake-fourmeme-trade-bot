const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

const { defaultAbiCoder } = require("@ethersproject/abi");
const { abi: UniswapV3FactoryABI } = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json');
const { encodeSqrtRatioX96, Pool, Position, TickMath, NonfungiblePositionManager, nearestUsableTick } = require("@uniswap/v3-sdk");
const { Token, Percent, Price } = require("@uniswap/sdk-core");
const { default: JSBI } = require("jsbi");
const { UNISWAP_V3_POOL_ABI, SwapRouterAbi, UNISWAP_FACTOR_ABI } = require("../scripts/abi");


function getContractAddress(deployerAddress, deployerNonce) {
  // Convert nonce to hexadecimal string
  const nonceHex = deployerNonce === 0 ? '0x' : ethers.toBeHex(deployerNonce);

  // RLP encode the address and nonce
  const rlpEncoded = ethers.encodeRlp([deployerAddress, nonceHex]);

  // Compute keccak256 hash of the RLP encoded data
  const hash = ethers.keccak256(rlpEncoded);

  // Take the last 40 characters (20 bytes) of the hash
  const contractAddress = '0x' + hash.slice(-40);

  return ethers.getAddress(contractAddress); // Ensure checksum address
}



// Addresses
const nfpmAddress = "0x46A15B0b27311cedF172AB29E4f4766fbE7F4364"
const v3FactoryAddress = "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865"
const v3RouterAddr = "0x1b81D678ffb9C0263b24A97847620C99d213eB14"

describe("Lock", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployOneYearLockFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    let nonce = await ethers.provider.getTransactionCount(owner.address);

    let T0 = (getContractAddress(owner.address, nonce)).toLowerCase();

    console.log("Contract address exepected : ", T0)


    const Lock = await ethers.getContractFactory("MyToken");
    const token = await Lock.deploy("t1", "r1", 1000n * 10n ** 18n);

    const wbnb = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"
    const wbnbAbi = [
      "function deposit() payable",
      "function withdraw(uint256)",
      "function balanceOf(address) view returns (uint256)",
      "function transfer(address to, uint256 amount) returns (bool)",
      "function approve(address spender, uint256 amount) returns (bool)",
      "function allowance(address owner, address spender) view returns (uint256)"
    ];

    const wbnbContract = new ethers.Contract(wbnb, wbnbAbi, owner);

    let tx = await wbnbContract.deposit({ value: ethers.parseEther("2") })
    await tx.wait()

    return { token, owner, otherAccount, wbnbContract };
  }


  async function createPool(uniswapFactory_contract, token1Address, token2Address, fee) {
    var txs;
    txs = await uniswapFactory_contract.createPool(
      token1Address.toLowerCase(),
      token2Address.toLowerCase(),
      fee,
      {
        gasLimit: 10000000,
      }
    );
    await txs.wait();

    const poolAdd = await uniswapFactory_contract.getPool(token1Address, token2Address, fee, {
      gasLimit: 3000000,
    });
    console.log('Pool address', poolAdd);
    return poolAdd;
  }

  function encodePriceSqrt(token1Price, token0Price) {
    return encodeSqrtRatioX96(token1Price, token0Price);
  }

  async function initializePool(poolAdd, price, signer) {
    const poolContract = new ethers.Contract(poolAdd, UNISWAP_V3_POOL_ABI, signer);

    var txs = await poolContract.initialize(price.toString(), {
      gasLimit: 3000000,
    });
    await txs.wait();
    console.log('Pool Initialized');
  }


  async function getPoolState(poolContract) {
    const liquidity = await poolContract.liquidity();
    const slot = await poolContract.slot0();

    const PoolState = {
      liquidity,
      sqrtPriceX96: slot[0],
      tick: slot[1],
      observationIndex: slot[2],
      observationCardinality: slot[3],
      observationCardinalityNext: slot[4],
      feeProtocol: slot[5],
      unlocked: slot[6],
    };

    return PoolState;
  }




  async function addLiquidityToPool(
    poolAdd,
    deployer,
    chainId,
    Token1_decimals,
    Token2_decimals,
    token_contract1,
    token_contract2,
    amount0, amount1,
    fee,
    npmca
  ) {
    const poolContract = new ethers.Contract(poolAdd, UNISWAP_V3_POOL_ABI, deployer);
    var state = await getPoolState(poolContract);


    const Token1 = new Token(chainId, token_contract1.target, Token1_decimals);
    const Token2 = new Token(chainId, token_contract2.target, Token2_decimals);

    const configuredPool = new Pool(
      Token1,
      Token2,
      fee,
      state.sqrtPriceX96.toString(),
      state.liquidity.toString(),
      Number(state.tick)
    );

    const position = Position.fromAmounts({
      pool: configuredPool,
      tickLower:
        nearestUsableTick(configuredPool.tickCurrent, configuredPool.tickSpacing) -
        configuredPool.tickSpacing * 2,
      tickUpper:
        nearestUsableTick(configuredPool.tickCurrent, configuredPool.tickSpacing) +
        configuredPool.tickSpacing * 2,
      amount0: amount0.toString(),
      amount1: amount1.toString(),
      useFullPrecision: false,
    });

    const mintOptions = {
      recipient: deployer.address,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20,
      slippageTolerance: new Percent(50, 10_000),
    };

    const { calldata, value } = NonfungiblePositionManager.addCallParameters(position, mintOptions);

    const transaction = {
      data: calldata,
      to: npmca,
      value: value,
      from: deployer.address,
      gasLimit: 10000000
    };
    console.log('Transacting');
    const txRes = await deployer.sendTransaction(transaction);
    await txRes.wait();
    console.log('Added liquidity');
  }

  async function swapExactInputSingle(
    tokenIn,
    tokenOut,
    fee,                // e.g. 3000 for a 0.3% pool fee
    amountIn,           // the amount of tokenIn to swap
    signer,
  ) {
  
    const swapRouterAbi = [
      {
        "inputs": [
          {
            "components": [
              { "internalType": "address", "name": "tokenIn", "type": "address" },
              { "internalType": "address", "name": "tokenOut", "type": "address" },
              { "internalType": "uint24", "name": "fee", "type": "uint24" },
              { "internalType": "address", "name": "recipient", "type": "address" },
              { "internalType": "uint256", "name": "deadline", "type": "uint256" },
              { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
              { "internalType": "uint256", "name": "amountOutMinimum", "type": "uint256" },
              { "internalType": "uint160", "name": "sqrtPriceLimitX96", "type": "uint160" }
            ],
            "internalType": "struct ISwapRouter.ExactInputSingleParams",
            "name": "params",
            "type": "tuple"
          }
        ],
        "name": "exactInputSingle",
        "outputs": [
          { "internalType": "uint256", "name": "amountOut", "type": "uint256" }
        ],
        "stateMutability": "payable",
        "type": "function"
      }
    ]

    // Connect to the router contract with a signer
    const swapRouter = new ethers.Contract(v3RouterAddr, swapRouterAbi, signer);


    // Prepare the parameters for the swap
    const params = {
      tokenIn: tokenIn,              // address of the token you're selling
      tokenOut: tokenOut,            // address of the token you're buying
      fee: fee,                      // pool fee, e.g., 3000 for 0.3%
      recipient: signer.address,          // where to send the output tokens
      deadline: Math.floor(Date.now() / 1000) + 600, // 10 minutes from now
      amountIn: amountIn,            // exact input amount
      amountOutMinimum: "0", // minimum output to accept
      sqrtPriceLimitX96: 0,          // set to 0 to ignore price limit
    };

    // Execute the swap
    const tx = await swapRouter.exactInputSingle(params);
    console.log("Swap transaction sent:", tx.hash);
    const receipt = await tx.wait();


  }


  describe("BSC", function () {
    describe("BSC Bundle", function () {
      it("Chalo budnle do", async function () {

        // create token 
        const { token, owner, wbnbContract } = await loadFixture(deployOneYearLockFixture);
        var fee = 100;
        var token0Decimals = 18;
        var token1Decimals = 18;
        var amount0 = ethers.parseUnits('1', 18);
        var amount1 = ethers.parseUnits('1', 18);

        let token0Address = wbnbContract.target
        let token1Address = token.target

        var price = encodePriceSqrt(1, 1);

        let tx = await token.approve(nfpmAddress, amount0);
        await tx.wait()

        tx = await wbnbContract.approve(nfpmAddress, amount1);
        await tx.wait()

        tx = await wbnbContract.approve(v3RouterAddr, amount0);
        await tx.wait()

        const uniswapFactoryContract = new ethers.Contract(v3FactoryAddress, UNISWAP_FACTOR_ABI, owner);



        var poolAddress = await uniswapFactoryContract.getPool(token0Address, token1Address, fee);
        console.log({ poolAddress: poolAddress })

        if (poolAddress === '0x0000000000000000000000000000000000000000') {
          console.log("Creating pool");
          poolAddress = await createPool(uniswapFactoryContract, token0Address, token1Address, fee);

          await initializePool(poolAddress, price, owner);
        }

        await addLiquidityToPool(poolAddress, owner, 56, token0Decimals, token1Decimals, wbnbContract, token, amount0, amount1, fee, nfpmAddress);

        await swapExactInputSingle(token0Address, token1Address, fee, ethers.parseEther("0.1"), owner)



      });


    });

  });
});
