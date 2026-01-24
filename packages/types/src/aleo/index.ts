import type { WalletAddressProvider } from '../common/index.js';

// SDK Types (Placeholder types for @provablehq/sdk)

export interface AleoRecordPlaintext {
  microcredits(): bigint;
  nonce(): string;
  toString(): string;
}

export interface AleoTransaction {
  transitions(): AleoTransition[];
  toString(): string;
}

export interface AleoTransition {
  outputs(): AleoOutput[];
}

export interface AleoOutput {
  toString(): string;
}

/**
 * Interface for browser extension wallets (Leo Wallet, Puzzle, etc.)
 *
 * Browser wallets have limited capabilities due to SDK constraints:
 * - They cannot expose private keys for security reasons
 * - The SDK requires private keys for execution, view functions, and records
 * - Only `executeTransaction` (if implemented) can handle full execution flow
 */
export interface AleoWalletAdapter {
  getAddress(): Promise<string>;
  signMessage(message: Uint8Array): Promise<string>;

  /**
   * Execute a transaction (alternative to requestSignature flow)
   * This is the RECOMMENDED method for browser wallets to support execution.
   * The wallet handles authorization, proving, and submission internally.
   */
  executeTransaction?(options: {
    programName: string;
    functionName: string;
    inputs: string[];
    priorityFee?: number;
  }): Promise<string>;

  decryptRecord?(recordCiphertext: string): Promise<AleoRecordPlaintext>;
  isConnected(): boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export interface AleoExecuteOptions {
  programName: string;
  functionName: string;
  inputs: string[];
  priorityFee?: number;
  privateFee?: boolean;
  feeRecord?: string | AleoRecordPlaintext;
}

export interface AleoExecutionResult {
  transactionId: string;
  transaction?: AleoTransaction;
  outputs?: string[];
}

export interface AleoViewResult {
  outputs: string[];
}

export interface AleoTransferOptions {
  recipient: string;
  amountMicrocredits: bigint;
  transferType: 'public' | 'private' | 'public_to_private' | 'private_to_public';
  priorityFee?: number;
  feeRecord?: string | AleoRecordPlaintext;
}

export interface AleoRecord {
  record: AleoRecordPlaintext;
  microcredits: bigint;
  nonce: string;
  spent: boolean;
}

export interface AleoBalance {
  publicBalance: bigint;
  privateBalance: bigint;
  recordCount: number;
}

/**
 * Interface for Aleo wallet providers.
 *
 * Note: Some methods are only available for private key wallets due to SDK constraints.
 * See method documentation for details.
 */

/**
 * Aleo transaction receipt containing confirmation details
 */
export interface AleoTransactionReceipt {
  /** Transaction ID */
  transactionId: string;
  /** Transaction status: 'accepted' or 'rejected' */
  status: 'accepted' | 'rejected';
  /** Transaction type: 'execute', 'deploy', or 'fee' */
  type: string;
  /** Block index where transaction was confirmed */
  index: bigint;
  /** Full confirmed transaction data */
  transaction: any; // TransactionJSON from SDK
  /** Finalize operations */
  finalize: any[];
  /** Timestamp when receipt was obtained */
  confirmedAt: Date;
}

export interface AleoWaitForReceiptOptions {
  /** Polling interval in milliseconds (default: 2000) */
  checkInterval?: number;
  /** Maximum time to wait in milliseconds (default: 45000) */
  timeout?: number;
}

export interface IAleoWalletProvider extends WalletAddressProvider {
  getWalletAddress(): Promise<string>;

  /**
   * - PK Wallets: Fully functional
   * - Browser Wallets: Requires adapter to implement `executeTransaction()`
   */
  execute(options: AleoExecuteOptions): Promise<AleoExecutionResult>;

  /**
   * - PK Wallets: Fully functional
   * - Browser Wallets: NOT SUPPORTED (SDK requires private key)
   */
  view(options: Omit<AleoExecuteOptions, 'priorityFee' | 'privateFee'>): Promise<AleoViewResult>;

  /**
   * - PK Wallets: Fully functional
   * - Browser Wallets: NOT SUPPORTED (SDK requires private key)
   */
  transfer(options: AleoTransferOptions): Promise<string>;

  /**
   * - PK Wallets: Returns both public and private balance
   * - Browser Wallets: Returns public balance only (privateBalance = 0)
   */
  getBalance(address?: string): Promise<AleoBalance>;

  /**
   * - PK Wallets: Fully functional
   * - Browser Wallets: NOT SUPPORTED (SDK requires private key for decryption)
   */
  getRecords(programId: string): Promise<AleoRecord[]>;

  signMessage(message: Uint8Array): Promise<string>;

  verifySignature(message: Uint8Array, signature: string, address: string): Promise<boolean>;

  /**
   * Wait for a transaction to be confirmed on the Aleo network
   * 
   * - PK Wallets: Fully functional
   * - Browser Wallets: Fully functional (uses network polling)
   */
  waitForTransactionReceipt(
    transactionId: string,
    options?: AleoWaitForReceiptOptions
  ): Promise<AleoTransactionReceipt>;

  /**
   * Send transfer and wait for confirmation
   * 
   * - PK Wallets: Fully functional
   * - Browser Wallets: NOT SUPPORTED (requires private key for transfer)
   */
  transferAndWait(
    options: AleoTransferOptions,
    receiptOptions?: AleoWaitForReceiptOptions
  ): Promise<{ transactionId: string; receipt: AleoTransactionReceipt }>;

  /**
   * Execute program and wait for confirmation
   * 
   * - PK Wallets: Fully functional
   * - Browser Wallets: Requires adapter to implement `executeTransaction()`
   */
  executeAndWait(
    options: AleoExecuteOptions,
    receiptOptions?: AleoWaitForReceiptOptions
  ): Promise<{ result: AleoExecutionResult; receipt: AleoTransactionReceipt }>;
}