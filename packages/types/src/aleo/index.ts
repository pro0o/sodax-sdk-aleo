import type { WalletAddressProvider } from '../common/index.js';

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

export interface AleoTransactionReceipt {
  transactionId: string;
  status: AleoTransactionStatus;
  type: string;
  index: bigint;
  transaction: AleoTransactionJSON;
  finalize: AleoFinalizeOutput[];
  confirmedAt: Date;
}

export type AleoTransactionStatus = 'accepted' | 'rejected';
export type AleoTransactionJSON = unknown;
export type AleoFinalizeOutput = unknown;

export interface AleoWaitForReceiptOptions {
  checkInterval?: number;
  timeout?: number;
}

export interface IAleoWalletProvider extends WalletAddressProvider {
  /**
   * Get the wallet's Aleo address.
   * 
   * @returns The wallet address string
   */
  getWalletAddress(): Promise<string>;

  /**
   * Execute an Aleo program function.
   * 
   * @param options - Execution options
   * @returns The execution result containing the transaction ID
   */
  execute(options: AleoExecuteOptions): Promise<AleoExecutionResult>;

  /**
   * Wait for a transaction to be confirmed on the Aleo network.
   * 
   * @param transactionId - The transaction ID to wait for
   * @param options - Polling configuration options
   * @returns The transaction receipt
   * @throws If the transaction is rejected, times out, or the ID is invalid
   */
  waitForTransactionReceipt(
    transactionId: string,
    options?: AleoWaitForReceiptOptions
  ): Promise<AleoTransactionReceipt>;

  /**
   * Execute a function and wait for the transaction to be confirmed.
   * 
   * @param options - Execution options
   * @param receiptOptions - Receipt polling options
   * @returns Both the execution result and the transaction receipt
   */
  executeAndWait(
    options: AleoExecuteOptions,
    receiptOptions?: AleoWaitForReceiptOptions
  ): Promise<{ result: AleoExecutionResult; receipt: AleoTransactionReceipt }>;
}