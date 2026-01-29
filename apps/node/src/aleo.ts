// apps/node/src/aleo.ts
import { AleoWalletProvider } from '@sodax/wallet-sdk-core';

// ============================================
// Configuration
// ============================================

const IS_TESTNET = process.env.IS_TESTNET === 'true';
const ALEO_RPC_URL = process.env.ALEO_RPC_URL || (IS_TESTNET
  ? 'https://api.explorer.provable.com/v1'
  : 'https://api.explorer.provable.com/v1');
const ALEO_PRIVATE_KEY = process.env.ALEO_PRIVATE_KEY;

if (!ALEO_PRIVATE_KEY) {
  throw new Error('ALEO_PRIVATE_KEY environment variable is required');
}

if (!ALEO_PRIVATE_KEY.startsWith('APrivateKey1')) {
  console.error('');
  console.error('❌ ERROR: Invalid private key format!');
  console.error('');
  console.error('The value you provided appears to be an address, not a private key.');
  console.error('Current value:', ALEO_PRIVATE_KEY);
  console.error('');
  console.error('Private keys start with: APrivateKey1...');
  console.error('Public addresses start with: aleo1...');
  console.error('');
  console.error('Please provide your actual private key in the .env file.');
  console.error('');
  throw new Error('ALEO_PRIVATE_KEY must be a valid Aleo private key starting with "APrivateKey1"');
}

// ============================================
// Initialize Wallet Provider
// ============================================

const aleoWalletProvider = new AleoWalletProvider({
  type: 'privateKey',
  rpcUrl: ALEO_RPC_URL,
  privateKey: ALEO_PRIVATE_KEY,
  network: IS_TESTNET ? 'testnet' : 'mainnet',
});

const walletAddress = await aleoWalletProvider.getWalletAddress();
console.log('[Aleo Wallet Address]:', walletAddress);
console.log('[Network]:', IS_TESTNET ? 'Testnet' : 'Mainnet');
console.log('[RPC URL]:', ALEO_RPC_URL);
console.log('');

// ============================================
// Wallet Operations
// ============================================

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
  priorityFee: number = 0.001,
  privateFee: boolean = false,
): Promise<void> {
  console.log('=== Execute ===');
  console.log('Program:', programName);
  console.log('Function:', functionName);
  console.log('Inputs:', inputs);
  console.log('Priority Fee:', priorityFee, 'credits');
  console.log('Private Fee:', privateFee);
  console.log('');

  try {
    const result = await aleoWalletProvider.execute({
      programName,
      functionName,
      inputs,
      priorityFee,
      privateFee,
    });

    console.log('[Execute] Transaction ID:', result.transactionId);
    console.log('[Execute] View on explorer:', `https://${IS_TESTNET ? 'testnet.' : ''}explorer.provable.com/transaction/${result.transactionId}`);
  } catch (error: any) {
    console.error('');
    console.error('[Execute] Error:', error.message);
    console.error('');
    if (error.message.includes('parsing inputs')) {
      console.error('Hint: Check your input format. Aleo inputs must be properly formatted.');
      console.error('Example: For transfer_public, use: <address> <amount>u64');
      console.error('Your inputs:', inputs);
      console.error('');
    }
    throw error;
  }
}

/**
 * Wait for transaction confirmation
 * @param txId - Transaction ID
 */
async function wait(txId: string, timeout: number = 45000): Promise<void> {
  console.log('=== Wait for Transaction ===');
  console.log('Transaction ID:', txId);
  console.log('Timeout:', timeout / 1000, 'seconds');
  console.log('');

  try {
    const receipt = await aleoWalletProvider.waitForTransactionReceipt(txId, {
      checkInterval: 2000,
      timeout,
    });

    console.log('[Wait] Transaction confirmed!');
    console.log('[Wait] Status:', receipt.status);
    console.log('[Wait] Type:', receipt.type);
    console.log('[Wait] Index:', receipt.index.toString());
    console.log('[Wait] Confirmed at:', receipt.confirmedAt.toISOString());
  } catch (error: any) {
    console.error('[Wait] Error:', error.message);
    throw error;
  }
}

/**
 * Execute program and wait for confirmation
 */
async function executeAndWait(
  programName: string,
  functionName: string,
  inputs: string[],
  priorityFee: number = 0.001,
  privateFee: boolean = false,
  timeout: number = 45000,
): Promise<void> {
  console.log('=== Execute and Wait ===');
  console.log('Program:', programName);
  console.log('Function:', functionName);
  console.log('Inputs:', inputs);
  console.log('Priority Fee:', priorityFee, 'credits');
  console.log('Private Fee:', privateFee);
  console.log('Timeout:', timeout / 1000, 'seconds');
  console.log('');

  try {
    const { result, receipt } = await aleoWalletProvider.executeAndWait(
      {
        programName,
        functionName,
        inputs,
        priorityFee,
        privateFee,
      },
      {
        checkInterval: 2000,
        timeout,
      }
    );

    console.log('[Execute] Transaction ID:', result.transactionId);
    console.log('[Execute] Status:', receipt.status);
    console.log('[Execute] Type:', receipt.type);
    console.log('[Execute] Confirmed!');
    console.log('[Execute] View on explorer:', `https://${IS_TESTNET ? 'testnet.' : ''}explorer.provable.com/transaction/${result.transactionId}`);
  } catch (error: any) {
    console.error('[Execute] Error:', error.message);
    throw error;
  }
}

/**
 * Transfer credits (public transfer example)
 * @param recipient - Aleo address to send credits to
 * @param amount - Amount in microcredits
 */
async function transferPublic(
  recipient: string,
  amountMicrocredits: string,
  priorityFee: number = 0.001,
): Promise<void> {
  console.log('=== Transfer Public ===');
  console.log('Recipient:', recipient);
  console.log('Amount:', amountMicrocredits, 'microcredits');
  console.log('Priority Fee:', priorityFee, 'credits');
  console.log('');

  try {
    const result = await aleoWalletProvider.execute({
      programName: 'credits.aleo',
      functionName: 'transfer_public',
      inputs: [recipient, `${amountMicrocredits}u64`],
      priorityFee,
      privateFee: false,
    });

    console.log('[Transfer] Transaction ID:', result.transactionId);
    console.log('[Transfer] View on explorer:', `https://${IS_TESTNET ? 'testnet.' : ''}explorer.provable.com/transaction/${result.transactionId}`);
  } catch (error: any) {
    console.error('[Transfer] Error:', error.message);
    throw error;
  }
}

/**
 * Transfer credits and wait for confirmation
 */
async function transferPublicAndWait(
  recipient: string,
  amountMicrocredits: string,
  priorityFee: number = 0.001,
  timeout: number = 45000,
): Promise<void> {
  console.log('=== Transfer Public and Wait ===');
  console.log('Recipient:', recipient);
  console.log('Amount:', amountMicrocredits, 'microcredits');
  console.log('Priority Fee:', priorityFee, 'credits');
  console.log('Timeout:', timeout / 1000, 'seconds');
  console.log('');

  try {
    const { result, receipt } = await aleoWalletProvider.executeAndWait(
      {
        programName: 'credits.aleo',
        functionName: 'transfer_public',
        inputs: [recipient, `${amountMicrocredits}u64`],
        priorityFee,
        privateFee: false,
      },
      {
        checkInterval: 2000,
        timeout,
      }
    );

    console.log('[Transfer] Transaction ID:', result.transactionId);
    console.log('[Transfer] Status:', receipt.status);
    console.log('[Transfer] Confirmed!');
    console.log('[Transfer] View on explorer:', `https://${IS_TESTNET ? 'testnet.' : ''}explorer.provable.com/transaction/${result.transactionId}`);
  } catch (error: any) {
    console.error('[Transfer] Error:', error.message);
    throw error;
  }
}

// ============================================
// CLI Handler
// ============================================

async function main() {
  const command = process.argv[2];

  if (command === 'info') {
    console.log('=== Wallet Info ===');
    console.log('Address:', walletAddress);
    console.log('Network:', IS_TESTNET ? 'Testnet' : 'Mainnet');
    console.log('RPC URL:', ALEO_RPC_URL);
    console.log('');
    console.log('Network Client:', aleoWalletProvider.networkClient);
    console.log('');
  } else if (command === 'execute') {
    const programName = process.argv[3];
    const functionName = process.argv[4];
    const inputs = process.argv.slice(5);

    if (!programName || !functionName) {
      console.error('Usage: pnpm aleo execute <program> <function> <input1> <input2> ...');
      process.exit(1);
    }

    await execute(programName, functionName, inputs);
  } else if (command === 'execute-wait') {
    const programName = process.argv[3];
    const functionName = process.argv[4];
    const inputs = process.argv.slice(5);

    if (!programName || !functionName || inputs.length === 0) {
      console.error('Usage: pnpm aleo execute-wait <program> <function> <input1> <input2> ...');
      console.error('Note: Timeout is fixed at 45 seconds');
      process.exit(1);
    }

    await executeAndWait(programName, functionName, inputs, 0.001, false, 45000);
  } else if (command === 'wait') {
    const txId = process.argv[3];
    const timeout = parseInt(process.argv[4]) || 45000;

    if (!txId) {
      console.error('Usage: pnpm aleo wait <txId> [timeout]');
      process.exit(1);
    }

    await wait(txId, timeout);
  } else if (command === 'transfer') {
    const recipient = process.argv[3];
    const amountMicrocredits = process.argv[4];
    const priorityFee = parseFloat(process.argv[5]) || 0.001;

    if (!recipient || !amountMicrocredits) {
      console.error('Usage: pnpm aleo transfer <recipient> <amount_microcredits> [priority_fee]');
      process.exit(1);
    }

    await transferPublic(recipient, amountMicrocredits, priorityFee);
  } else if (command === 'transfer-wait') {
    const recipient = process.argv[3];
    const amountMicrocredits = process.argv[4];
    const priorityFee = parseFloat(process.argv[5]) || 0.001;
    const timeout = parseInt(process.argv[6]) || 45000;

    if (!recipient || !amountMicrocredits) {
      console.error('Usage: pnpm aleo transfer-wait <recipient> <amount_microcredits> [priority_fee] [timeout]');
      process.exit(1);
    }

    await transferPublicAndWait(recipient, amountMicrocredits, priorityFee, timeout);
  } else {
    console.log('Aleo Wallet SDK Demo');
    console.log('====================');
    console.log('');
    console.log('Available commands:');
    console.log('  info                 - Display wallet information');
    console.log('  execute              - Execute a program function');
    console.log('  execute-wait         - Execute a program function and wait for confirmation');
    console.log('  wait                 - Wait for transaction confirmation');
    console.log('  transfer             - Transfer credits (public)');
    console.log('  transfer-wait        - Transfer credits and wait for confirmation');
    console.log('');
    console.log('Examples:');
    console.log('  pnpm aleo info');
    console.log('  pnpm aleo execute credits.aleo transfer_public aleo1xxx... 1000000u64');
    console.log('  pnpm aleo execute-wait credits.aleo transfer_public aleo1xxx... 1000000u64');
    console.log('  pnpm aleo wait at1abc123...');
    console.log('  pnpm aleo transfer aleo1xxx... 1000000');
    console.log('  pnpm aleo transfer-wait aleo1xxx... 1000000 0.01 60000');
    console.log('');
    console.log('Environment variables:');
    console.log('  ALEO_PRIVATE_KEY     - Required: Your Aleo private key');
    console.log('  ALEO_RPC_URL         - Optional: Custom RPC URL (default: https://api.explorer.provable.com/v1)');
    console.log('  IS_TESTNET           - Optional: Set to "true" for testnet (default: false)');
    console.log('');
    console.log('Note: The default RPC URL might not have credits.aleo deployed.');
    console.log('      You may need to provide your own RPC endpoint via ALEO_RPC_URL.');
    console.log('');
  }
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
