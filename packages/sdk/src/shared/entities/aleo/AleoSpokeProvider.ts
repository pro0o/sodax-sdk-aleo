import { type Hex, toHex } from 'viem';
import type { TxReturnType, AleoSpokeProviderType, AleoGasEstimate } from '../../types.js';
import type { IRawSpokeProvider, ISpokeProvider } from '../Providers.js';
import type {
  IAleoWalletProvider,
  AleoSpokeChainConfig,
  AleoExecuteOptions,
  WalletAddressProvider,
  AleoRawTransaction,
  AleoProgramId,
} from '@sodax/types';

import { isAleoRawSpokeProvider } from '../../guards.js';
import { AleoNetworkClient, ProgramManager, type TransactionJSON } from '@provablehq/sdk';

const ALEO_DEFAULT_RPC_URL = 'https://api.explorer.provable.com/v2';
const ALEO_DEFAULT_TIMEOUT = 45000;
const ALEO_DEFAULT_CHECK_INTERVAL = 2000;
// RPC activities , query balances, block heights, verifying transactions.
export class AleoBaseSpokeProvider {
  public readonly chainConfig: AleoSpokeChainConfig;
  public readonly rpcUrl: string;
  public readonly networkClient: AleoNetworkClient;
  public readonly programManager: ProgramManager;

  constructor(config: AleoSpokeChainConfig, rpcUrl?: string) {
    this.chainConfig = config;
    this.rpcUrl = rpcUrl ?? config.rpcUrl ?? ALEO_DEFAULT_RPC_URL;
    this.networkClient = new AleoNetworkClient(this.rpcUrl);
    this.programManager = new ProgramManager(this.rpcUrl);
  }

  static getAddressBCSBytes(aleoAddress: string): Hex {
    if (!aleoAddress.startsWith('aleo1') || aleoAddress.length !== 63) {
      throw new Error(`Invalid Aleo address format: ${aleoAddress}`);
    }

    const encoder = new TextEncoder();
    const bytes = encoder.encode(aleoAddress);
    return toHex(bytes);
  }

  static isValidAleoAddress(address: string): boolean {
    return typeof address === 'string' && address.startsWith('aleo1') && address.length === 63;
  }

  static isValidTransactionId(txId: string): boolean {
    return typeof txId === 'string' && txId.startsWith('at1') && txId.length === 61;
  }

  static formatAmount(amount: bigint, type = 'u128'): string {
    return `${amount}${type}`;
  }

  /**
   * Convert a hex address (e.g., EVM 0x...) to a Leo [u8; 32] array literal.
   * Left-pads shorter addresses to 32 bytes.
   * Used for cross-chain address encoding in Aleo programs.
   *
   * @param address - Hex string (with or without 0x prefix)
   * @returns Leo array literal string, e.g., "[0u8, 0u8, ..., 171u8, 205u8]"
   */
  static hexToAleoU8Array(address: string): string {
    // Normalize address
    let hex = address.trim().toLowerCase();
    if (hex.startsWith('0x')) hex = hex.slice(2);
    if (hex.length % 2 === 1) hex = `0${hex}`;

    // Convert hex to bytes
    const addressBytes = new Uint8Array(hex.match(/.{1,2}/g)?.map(byte => Number.parseInt(byte, 16)) ?? []);

    // Pad to 32 bytes (left-padded, Aleo-compatible)
    const padded = new Uint8Array(32);
    padded.set(addressBytes, 32 - addressBytes.length);

    // Format as Leo u8 array string
    const leoBytes = Array.from(padded)
      .map(b => `${b}u8`)
      .join(', ');

    return `[${leoBytes}]`;
  }

  async getBalance(walletAddress: string, token: string): Promise<bigint> {
    if (!AleoBaseSpokeProvider.isValidAleoAddress(walletAddress)) {
      throw new Error(`Invalid Aleo address: ${walletAddress}`);
    }

    try {
      const balanceStr = await this.networkClient.getProgramMappingValue(
        token, // e.g., "usdc_token.aleo"
        'account', // standard mapping name
        walletAddress, // user's address
      );

      return BigInt(balanceStr.replace(/[^\d]/g, ''));
    } catch (error) {
      if (error instanceof Error && error.message.includes('Error fetching value')) {
        return 0n;
      }
      throw error;
    }
  }
  async estimateFee(executeOptions: AleoExecuteOptions): Promise<AleoGasEstimate> {
    try {
      const baseFee = await this.programManager.estimateExecutionFee({
        programName: executeOptions.programName,
        functionName: executeOptions.functionName,
      });

      const priorityFee = BigInt(executeOptions.priorityFee ?? 0);

      return {
        baseFee,
        priorityFee,
        totalFee: baseFee + priorityFee,
        requiresFeeRecord: !executeOptions.feeRecord,
      };
    } catch {
      const baseFee = 1000000n;
      const priorityFee = BigInt(executeOptions.priorityFee ?? 0);

      return {
        baseFee,
        priorityFee,
        totalFee: baseFee + priorityFee,
        requiresFeeRecord: !executeOptions.feeRecord,
      };
    }
  }
  /*
  async getLatestBlockHeight(): Promise<bigint> {
    try {
      const latestBlock = await this.networkClient.getLatestBlock();
      return latestBlock.header.metadata.height;
    } catch (error) {
      throw new Error(`Failed to get latest block height: ${error}`);
    }
  }

  async getTransactionDetails(txId: string): Promise<TransactionJSON> {
    if (!AleoBaseSpokeProvider.isValidTransactionId(txId)) {
      throw new Error(`Invalid Aleo transaction ID format: ${txId}`);
    }

    try {
      return await this.networkClient.getTransaction(txId);
    } catch (error) {
      throw new Error(`Failed to get transaction ${txId}: ${error}`);
    }
  }

  async verifyTransaction(txId: string): Promise<boolean> {
    if (!AleoBaseSpokeProvider.isValidTransactionId(txId)) {
      throw new Error(`Invalid Aleo transaction ID format: ${txId}`);
    }

    try {
      const confirmed = await this.networkClient.getConfirmedTransaction(txId);
      return confirmed.status === 'accepted';
    } catch {
      return false;
    }
  }


    */

  /**
   * Transfer tokens cross-chain via asset_manager.aleo program.
   *
   * Leo signature:
   * ```leo
   * async transition transfer(
   *   public token: field,
   *   public destAddress: [u8; 32],
   *   public amount: u64,
   *   public connSn: u128,
   *   public data: field,
   *   public feeAmount: u64,
   *   public hubChainId: u128,
   *   public hubAddress: [u8; 32]
   * )
   * ```
   *
   * @param token - Token ID as field
   * @param destAddress - Destination address on hub chain (hex, will be converted to [u8; 32])
   * @param amount - Amount to transfer (u64)
   * @param connSn - Connection sequence number (u128)
   * @param data - Data payload as field
   * @param feeAmount - Fee amount (u64)
   * @param hubChainId - Hub chain ID (u128)
   * @param hubAddress - Hub address (hex, will be converted to [u8; 32])
   * @param spokeProvider - Aleo spoke provider instance
   * @param raw - If true, return unsigned transaction; otherwise execute
   *
   * @returns Transaction ID if executed, or AleoRawTransaction if raw mode
   */
  async transfer<S extends AleoSpokeProviderType, R extends boolean = false>(
    token: bigint,
    destAddress: Hex,
    amount: bigint,
    connSn: bigint,
    data: bigint,
    feeAmount: bigint,
    hubChainId: bigint,
    hubAddress: Hex,
    spokeProvider: S,
    raw?: R,
  ): Promise<TxReturnType<S, R>> {
    const walletAddress = await spokeProvider.walletProvider.getWalletAddress();

    // Input order and types must match deployed asset_manager.aleo transfer function
    const executeParams: AleoExecuteOptions = {
      programName: this.chainConfig.addresses.assetManager,
      functionName: 'transfer',
      inputs: [
        AleoBaseSpokeProvider.formatAmount(token, 'field'), // token: field
        AleoBaseSpokeProvider.hexToAleoU8Array(destAddress), // destAddress: [u8; 32]
        AleoBaseSpokeProvider.formatAmount(amount, 'u64'), // amount: u64
        AleoBaseSpokeProvider.formatAmount(connSn, 'u128'), // connSn: u128
        AleoBaseSpokeProvider.formatAmount(data, 'field'), // data: field
        AleoBaseSpokeProvider.formatAmount(feeAmount, 'u64'), // feeAmount: u64
        AleoBaseSpokeProvider.formatAmount(hubChainId, 'u128'), // hubChainId: u128
        AleoBaseSpokeProvider.hexToAleoU8Array(hubAddress), // hubAddress: [u8; 32]
      ],
    };

    if (raw || isAleoRawSpokeProvider(spokeProvider)) {
      return {
        from: walletAddress,
        to: this.chainConfig.addresses.assetManager as AleoProgramId,
        value: amount,
        data: executeParams,
      } satisfies AleoRawTransaction as TxReturnType<S, R>;
    }

    const result = await (spokeProvider as AleoSpokeProvider).walletProvider.execute(executeParams);
    return result.transactionId as TxReturnType<S, R>;
  }

  /**
   * Send cross-chain message via connection.aleo program.
   *
   * Leo signature:
   * ```leo
   * async transition send_message(
   *   public dst_chain_id: u128,
   *   public dst_address: [u8; 32],
   *   public conn_sn: u128,
   *   public payload: [u8; 32]
   * )
   * ```
   *
   * @param dstChainId - Destination chain ID (u128)
   * @param dstAddress - Destination address on target chain (hex, will be converted to [u8; 32])
   * @param connSn - Connection sequence number (u128)
   * @param payload - Message payload (hex, will be converted to [u8; 32])
   * @param spokeProvider - Aleo spoke provider instance
   * @param raw - If true, return unsigned transaction; otherwise execute
   *
   * @returns Transaction ID if executed, or AleoRawTransaction if raw mode
   */
  async sendMessage<S extends AleoSpokeProviderType, R extends boolean = false>(
    dstChainId: bigint,
    dstAddress: Hex,
    connSn: bigint,
    payload: Hex,
    spokeProvider: S,
    raw?: R,
  ): Promise<TxReturnType<S, R>> {
    const walletAddress = await spokeProvider.walletProvider.getWalletAddress();

    // Input order and types must match deployed connection.aleo send_message function
    const executeParams: AleoExecuteOptions = {
      programName: this.chainConfig.addresses.connection,
      functionName: 'send_message',
      inputs: [
        AleoBaseSpokeProvider.formatAmount(dstChainId, 'u128'), // dst_chain_id: u128
        AleoBaseSpokeProvider.hexToAleoU8Array(dstAddress), // dst_address: [u8; 32]
        AleoBaseSpokeProvider.formatAmount(connSn, 'u128'), // conn_sn: u128
        AleoBaseSpokeProvider.hexToAleoU8Array(payload), // payload: [u8; 32]
      ],
    };

    if (raw || isAleoRawSpokeProvider(spokeProvider)) {
      return {
        from: walletAddress,
        to: this.chainConfig.addresses.connection as AleoProgramId,
        value: 0n,
        data: executeParams,
      } satisfies AleoRawTransaction as TxReturnType<S, R>;
    }

    const result = await (spokeProvider as AleoSpokeProvider).walletProvider.execute(executeParams);
    return result.transactionId as TxReturnType<S, R>;
  }
}
// Only knows the wallet address -> it just returns unsigned transaction
export class AleoRawSpokeProvider extends AleoBaseSpokeProvider implements IRawSpokeProvider {
  public readonly walletProvider: WalletAddressProvider;
  public readonly raw = true;

  constructor(chainConfig: AleoSpokeChainConfig, walletAddress: string, rpcUrl?: string) {
    super(chainConfig, rpcUrl);

    if (!AleoBaseSpokeProvider.isValidAleoAddress(walletAddress)) {
      throw new Error(`Invalid Aleo wallet address: ${walletAddress}`);
    }

    this.walletProvider = {
      getWalletAddress: async () => walletAddress,
    };
  }
}

export class AleoSpokeProvider extends AleoBaseSpokeProvider implements ISpokeProvider {
  public readonly walletProvider: IAleoWalletProvider;

  constructor(config: AleoSpokeChainConfig, walletProvider: IAleoWalletProvider, rpcUrl?: string) {
    super(config, rpcUrl);
    this.walletProvider = walletProvider;
  }

  async getWalletAddress(): Promise<string> {
    return this.walletProvider.getWalletAddress();
  }

  async waitForTransactionConfirmation(txId: string, timeout: number = ALEO_DEFAULT_TIMEOUT): Promise<boolean> {
    if (!AleoBaseSpokeProvider.isValidTransactionId(txId)) {
      throw new Error(`Invalid Aleo transaction ID: ${txId}`);
    }

    try {
      await this.walletProvider.waitForTransactionReceipt(txId, {
        timeout,
        checkInterval: ALEO_DEFAULT_CHECK_INTERVAL,
      });
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('rejected')) {
        return false;
      }
      throw error;
    }
  }
}
