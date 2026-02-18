import 'dotenv/config';
import type { Address, Hex } from 'viem';
import {
  AleoSpokeProvider,
  AleoSpokeService,
  EvmAssetManagerService,
  Sodax,
  type SolverConfigParams,
  spokeChainConfig,
  type AleoSpokeChainConfig,
  type SodaxConfig,
  getHubChainConfig,
  type EvmHubProviderConfig,
} from '@sodax/sdk';
import {
  ALEO_TESTNET_CHAIN_ID,
  ALEO_MAINNET_CHAIN_ID,
  getMoneyMarketConfig,
  SONIC_MAINNET_CHAIN_ID,
} from '@sodax/types';
import { AleoWalletProvider } from '@sodax/wallet-sdk-core';

const IS_TESTNET = process.env.IS_TESTNET === 'true';
const ALEO_CHAIN_ID = IS_TESTNET ? ALEO_TESTNET_CHAIN_ID : ALEO_MAINNET_CHAIN_ID;
const aleoChainConfig = spokeChainConfig[ALEO_CHAIN_ID] as AleoSpokeChainConfig;
const ALEO_RPC_URL = process.env.ALEO_RPC_URL || aleoChainConfig.rpcUrl;
console.log('ALEO_RPC_URL: ', ALEO_RPC_URL);
const ALEO_PRIVATE_KEY = process.env.ALEO_PRIVATE_KEY;

if (!ALEO_PRIVATE_KEY) throw new Error('ALEO_PRIVATE_KEY is required');
if (!ALEO_PRIVATE_KEY.startsWith('APrivateKey1')) throw new Error('Invalid ALEO_PRIVATE_KEY');

// credits.aleo on-chain field representation
const CREDITS_TOKEN_FIELD = 7190692537453907461105790569797103513515746302149567971663963167242253971980n;

// Hub chain params (passed to contract but not processed on spoke side)
const HUB_ADDRESS = '0x1B06762a8B9286f6A1B290579834e555a5F60557' as Hex;
const EMPTY_DATA = '0xb0c96cb457877c20252feadab2cc9ca265c2c04205360f97b8721157732fe91a' as Hex;

const PROVABLE_API_KEY = process.env.PROVABLE_API_KEY;
const PROVABLE_CONSUMER_ID = process.env.PROVABLE_CONSUMER_ID;
const PROVABLE_DELEGATE_URL = process.env.PROVABLE_DELEGATE_URL;
const HUB_CHAIN_ID = SONIC_MAINNET_CHAIN_ID;
const HUB_RPC_URL = IS_TESTNET ? 'https://rpc.testnet.soniclabs.com/' : 'https://rpc.soniclabs.com/';

const aleoWalletProvider = new AleoWalletProvider({
  type: 'privateKey',
  rpcUrl: ALEO_RPC_URL,
  privateKey: ALEO_PRIVATE_KEY,
  network: IS_TESTNET ? 'testnet' : 'mainnet',
  ...(PROVABLE_API_KEY && PROVABLE_CONSUMER_ID
    ? {
        delegate: {
          apiKey: PROVABLE_API_KEY,
          consumerId: PROVABLE_CONSUMER_ID,
          url: PROVABLE_DELEGATE_URL,
        },
      }
    : {}),
});
const moneyMarketConfig = getMoneyMarketConfig(HUB_CHAIN_ID);
const solverConfig = {
  intentsContract: '0x6382D6ccD780758C5e8A6123c33ee8F4472F96ef',
  solverApiEndpoint: 'https://sodax-solver-staging.iconblockchain.xyz',
  partnerFee: undefined,
} satisfies SolverConfigParams;
const aleoSpokeProvider = new AleoSpokeProvider(aleoChainConfig, aleoWalletProvider, ALEO_RPC_URL);

const hubConfig = {
  hubRpcUrl: HUB_RPC_URL,
  chainConfig: getHubChainConfig(),
} satisfies EvmHubProviderConfig;

const sodax = new Sodax({
  swaps: solverConfig,
  moneyMarket: moneyMarketConfig,
  hubProviderConfig: hubConfig,
} satisfies SodaxConfig);

// Check public credits balance
async function checkBalance() {
  const wallet = await aleoSpokeProvider.getWalletAddress();
  try {
    const balance = await aleoSpokeProvider.networkClient.getProgramMappingValue('credits.aleo', 'account', wallet);
    console.log('Public credits balance:', balance);
  } catch (e) {
    console.log('Public credits balance: 0 (no mapping entry)');
  }
}

// Calls asset_manager_core_v3.aleo/transferNative on-chain
async function transferNative(amount: number, dstAddress: Hex) {
  const wallet = await aleoSpokeProvider.getWalletAddress();
  console.log('Wallet:', wallet);
  console.log('Token (field):', CREDITS_TOKEN_FIELD.toString());
  console.log('Amount:', amount);
  console.log('Destination:', dstAddress);

  await checkBalance();

  const connSn = BigInt(AleoSpokeService.generateConnSn());
  const feeAmount = 0n;
  console.log('conn_sn:', connSn.toString());
  console.log('fee_amount:', feeAmount.toString());
  console.log('hub_chain_id:', HUB_CHAIN_ID.toString());

  try {
    const txId = await aleoSpokeProvider.transfer(
      CREDITS_TOKEN_FIELD, // token: field
      dstAddress, // dst_address: [u8; 32]
      BigInt(amount), // amount: u64
      connSn, // conn_sn: u128
      EMPTY_DATA, // data: [u8; 32]
      feeAmount, // fee_amount: u64
      BigInt(HUB_CHAIN_ID), // hub_chain_id: u128
      HUB_ADDRESS, // hub_address: [u8; 32]
      aleoSpokeProvider,
    );
    console.log('Transaction ID:', txId);
  } catch (e) {
    console.error('Full error:', e);
    throw e;
  }
}
async function main() {
  const amount = Number(process.argv[2]);
  const dstAddress = process.argv[3] as Hex;

  if (!amount || !dstAddress) {
    console.log('Usage:');
    console.log('  pnpm aleo test-signer                   # test transfer_public_as_signer');
    console.log('  pnpm aleo <amount> <dst_address>        # call transferNative');
    process.exit(1);
  }

  await transferNative(amount, dstAddress);
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
