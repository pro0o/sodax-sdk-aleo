import { AleoWalletProvider } from '@sodax/wallet-sdk-core';

// ============================================
// Configuration
// ============================================

const IS_TESTNET = process.env.IS_TESTNET === 'true';
const ALEO_RPC_URL = IS_TESTNET 
  ? 'https://api.explorer.provable.com/v1' 
  : 'https://api.explorer.provable.com/v1';
const ALEO_PRIVATE_KEY = process.env.ALEO_PRIVATE_KEY;

if (!ALEO_PRIVATE_KEY) {
  throw new Error('ALEO_PRIVATE_KEY environment variable is required');
}

// ============================================
// Initialize Wallet Provider
// ============================================

const aleoWalletProvider = new AleoWalletProvider({
  rpcUrl: ALEO_RPC_URL,
  privateKey: ALEO_PRIVATE_KEY,
});

const walletAddress = await aleoWalletProvider.getWalletAddress();
console.log('[Aleo Wallet Address]:', walletAddress);
console.log('[Network]:', IS_TESTNET ? 'Testnet' : 'Mainnet');
console.log('');

// ============================================
// Wallet Operations
// ============================================

/**
 * Get balance for the wallet
 */
async function getBalance(): Promise<void> {
  const balance = await aleoWalletProvider.getBalance();
  
  console.log('=== Balance ===');
  console.log('Public Balance:', Number(balance.publicBalance) / 1_000_000, 'credits');
  console.log('Private Balance:', Number(balance.privateBalance) / 1_000_000, 'credits');
  console.log('Unspent Records:', balance.recordCount);
  console.log('Total Balance:', Number(balance.publicBalance + balance.privateBalance) / 1_000_000, 'credits');
}

/**
 * Transfer credits to another address
 * @param recipient - Aleo address to send credits to
 * @param amount - Amount in credits (will be converted to microcredits)
 * @param transferType - Type of transfer (public, private, public_to_private, private_to_public)
 */
async function transfer(
  recipient: string,
  amount: number,
  transferType: 'public' | 'private' | 'public_to_private' | 'private_to_public' = 'public',
): Promise<void> {
  console.log('=== Transfer ===');
  console.log('Recipient:', recipient);
  console.log('Amount:', amount, 'credits');
  console.log('Type:', transferType);
  console.log('');

  const amountMicrocredits = BigInt(Math.floor(amount * 1_000_000));
  
  const txId = await aleoWalletProvider.transfer({
    recipient,
    amountMicrocredits,
    transferType,
    priorityFee: 0.01, // 0.01 credits fee
  });

  console.log('[Transfer] Transaction ID:', txId);
  console.log('[Transfer] View on explorer:', `https://testnet.explorer.provable.com/transaction/${txId}`);
}

/**
 * Execute a program function
 * @param programName - Program name (e.g., "credits.aleo")
 * @param functionName - Function name (e.g., "transfer_public")
 * @param inputs - Array of input strings
 */
async function execute(
  programName: string,
  functionName: string,
  inputs: string[],
): Promise<void> {
  console.log('=== Execute ===');
  console.log('Program:', programName);
  console.log('Function:', functionName);
  console.log('Inputs:', inputs);
  console.log('');

  const result = await aleoWalletProvider.execute({
    programName,
    functionName,
    inputs,
    priorityFee: 0.01,
    privateFee: false,
  });

  console.log('[Execute] Transaction ID:', result.transactionId);
  console.log('[Execute] View on explorer:', `https://testnet.explorer.provable.com/transaction/${result.transactionId}`);
}

/**
 * Execute a view function (read-only, no transaction)
 * @param programName - Program name (e.g., "credits.aleo")
 * @param functionName - Function name
 * @param inputs - Array of input strings
 */
async function view(
  programName: string,
  functionName: string,
  inputs: string[],
): Promise<void> {
  console.log('=== View (Read-Only) ===');
  console.log('Program:', programName);
  console.log('Function:', functionName);
  console.log('Inputs:', inputs);
  console.log('');

  const result = await aleoWalletProvider.view({
    programName,
    functionName,
    inputs,
  });

  console.log('[View] Outputs:', result.outputs);
}

/**
 * Get unspent records for a program
 * @param programId - Program ID (default: "credits.aleo")
 */
async function getRecords(programId: string = 'credits.aleo'): Promise<void> {
  console.log('=== Records ===');
  console.log('Program:', programId);
  console.log('');

  const records = await aleoWalletProvider.getRecords(programId);

  console.log(`Found ${records.length} unspent records:`);
  records.forEach((record, idx) => {
    console.log(`\nRecord #${idx + 1}:`);
    console.log('  Microcredits:', Number(record.microcredits) / 1_000_000, 'credits');
    console.log('  Nonce:', record.nonce);
    console.log('  Spent:', record.spent);
  });
}

/**
 * Sign a message
 * @param message - Message to sign
 */
async function signMessage(message: string): Promise<void> {
  console.log('=== Sign Message ===');
  console.log('Message:', message);
  console.log('');

  const messageBytes = new TextEncoder().encode(message);
  const signature = await aleoWalletProvider.signMessage(messageBytes);

  console.log('[Sign] Signature:', signature);
  
  // Verify the signature
  const isValid = await aleoWalletProvider.verifySignature(
    messageBytes,
    signature,
    walletAddress,
  );
  console.log('[Verify] Signature valid:', isValid);
}

// ============================================
// CLI Handler
// ============================================

async function main() {
  const functionName = process.argv[2];

  if (functionName === 'balance') {
    await getBalance();
  } else if (functionName === 'transfer') {
    const recipient = process.argv[3];
    const amount = parseFloat(process.argv[4]);
    const transferType = (process.argv[5] as 'public' | 'private' | 'public_to_private' | 'private_to_public') || 'public';
    
    if (!recipient || isNaN(amount)) {
      console.error('Usage: npm run aleo transfer <recipient> <amount> [type]');
      console.error('Types: public, private, public_to_private, private_to_public');
      process.exit(1);
    }
    
    await transfer(recipient, amount, transferType);
  } else if (functionName === 'execute') {
    const programName = process.argv[3];
    const functionName = process.argv[4];
    const inputs = process.argv.slice(5);
    
    if (!programName || !functionName) {
      console.error('Usage: npm run aleo execute <program> <function> <input1> <input2> ...');
      process.exit(1);
    }
    
    await execute(programName, functionName, inputs);
  } else if (functionName === 'view') {
    const programName = process.argv[3];
    const functionName = process.argv[4];
    const inputs = process.argv.slice(5);
    
    if (!programName || !functionName) {
      console.error('Usage: npm run aleo view <program> <function> <input1> <input2> ...');
      process.exit(1);
    }
    
    await view(programName, functionName, inputs);
  } else if (functionName === 'records') {
    const programId = process.argv[3] || 'credits.aleo';
    await getRecords(programId);
  } else if (functionName === 'sign') {
    const message = process.argv.slice(3).join(' ');
    
    if (!message) {
      console.error('Usage: npm run aleo sign <message>');
      process.exit(1);
    }
    
    await signMessage(message);
  } else {
    console.log('Aleo Wallet Simulator');
    console.log('=====================');
    console.log('');
    console.log('Available commands:');
    console.log('  balance              - Get wallet balance');
    console.log('  transfer             - Transfer credits to another address');
    console.log('  execute              - Execute a program function');
    console.log('  view                 - Execute a read-only function');
    console.log('  records              - List unspent records');
    console.log('  sign                 - Sign a message');
    console.log('');
    console.log('Usage examples:');
    console.log('  npm run aleo balance');
    console.log('  npm run aleo transfer aleo1... 10 public');
    console.log('  npm run aleo execute credits.aleo transfer_public aleo1... 1000000u64');
    console.log('  npm run aleo view credits.aleo account aleo1...');
    console.log('  npm run aleo records credits.aleo');
    console.log('  npm run aleo sign "Hello, Aleo!"');
  }
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
