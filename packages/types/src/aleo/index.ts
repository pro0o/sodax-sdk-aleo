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
}