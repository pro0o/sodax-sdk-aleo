import { type Hex, toHex } from 'viem';
import type { TxReturnType, AleoSpokeProviderType, AleoGasEstimate } from '../../types.js';
import type { IRawSpokeProvider, ISpokeProvider } from '../Providers.js';
import type {
  IAleoWalletProvider,
  AleoSpokeChainConfig,
  AleoExecuteOptions,
  WalletAddressProvider,
  AleoRawTransaction,
  AleoProgramId
} from '@sodax/types';
import { isAleoRawSpokeProvider } from '../../guards.js';
import { AleoNetworkClient, ProgramManager, type TransactionJSON } from '@provablehq/sdk';

const ALEO_DEFAULT_RPC_URL = 'https://api.explorer.provable.com/v1';
const ALEO_DEFAULT_TIMEOUT = 45000;
const ALEO_DEFAULT_CHECK_INTERVAL = 2000;

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

  static formatAmount(amount: bigint, type: string = 'u128'): string {
    return `${amount}${type}`;
  }

  /**
   * Encode hex data for Aleo program input.
   * @todo Implement proper encoding if needed based on program requirements
   */
  static encodeDataForAleo(data: Hex): string {
    return data;
  }

  async getBalance(walletAddress: string, token: string): Promise<bigint> {
    if (!AleoBaseSpokeProvider.isValidAleoAddress(walletAddress)) {
      throw new Error(`Invalid Aleo address: ${walletAddress}`);
    }

    try {
      const balanceStr = await this.networkClient.getProgramMappingValue(
        token,          // e.g., "usdc_token.aleo"
        'account',      // standard mapping name
        walletAddress   // user's address
      );
      
      return BigInt(balanceStr.replace(/[^\d]/g, ''));
    } catch (error) {
      if (error instanceof Error && error.message.includes('Error fetching value')) {
        return 0n;
      }
      throw error;
    }
  }

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

  /**
   * Transfer tokens cross-chain via asset_manager.aleo program.
   * Follows the same pattern as other chains (Sui, Stellar, Injective).
   * 
   * Delegates execution to the wallet provider, which uses @provablehq/sdk internally.
   * 
   * @param token - Token program ID to transfer
   * @param amount - Amount to transfer (in smallest unit)
   * @param to - Destination address (cross-chain, as bytes)
   * @param data - Additional payload data
   * @param spokeProvider - Aleo spoke provider instance
   * @param raw - If true, return unsigned transaction; otherwise execute
   * 
   * @returns Transaction ID if executed, or AleoRawTransaction if raw mode
   * 
   * @example
   * // Execute a transfer
   * const txId = await provider.transfer(
   *   "usdc_token.aleo",
   *   1000000n,
   *   destinationBytes,
   *   dataBytes,
   *   spokeProvider,
   *   false
   * );
   */
  async transfer<S extends AleoSpokeProviderType, R extends boolean = false>(
    token: string,
    amount: bigint,
    to: Uint8Array,
    data: Uint8Array,
    spokeProvider: S,
    raw?: R,
  ): Promise<TxReturnType<S, R>> {
    const walletAddress = await spokeProvider.walletProvider.getWalletAddress();

    // Input order and types must match deployed program (e.g. sodax_asset_manager_v1.aleo transfer).
    // SDK expects inputs as string[] (Leo literals: address, program id, u128, then bytes as hex).
    const executeParams: AleoExecuteOptions = {
      programName: this.chainConfig.addresses.assetManager,
      functionName: 'transfer',
      inputs: [
        walletAddress,
        token,
        AleoBaseSpokeProvider.formatAmount(amount, 'u128'),
        toHex(to),
        toHex(data),
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
   * Follows the same pattern as other chains (Sui, Stellar, Injective).
   * 
   * Delegates execution to the wallet provider, which uses @provablehq/sdk internally.
   * 
   * @param dstChainId - Destination chain ID
   * @param dstAddress - Destination address on target chain
   * @param payload - Message payload
   * @param spokeProvider - Aleo spoke provider instance
   * @param raw - If true, return unsigned transaction; otherwise execute
   * 
   * @returns Transaction ID if executed, or AleoRawTransaction if raw mode
   * 
   * @example
   * // Send a message
   * const txId = await provider.sendMessage(
   *   2n, // destination chain ID
   *   addressBytes,
   *   payloadBytes,
   *   spokeProvider,
   *   false
   * );
   */
  async sendMessage<S extends AleoSpokeProviderType, R extends boolean = false>(
    dstChainId: bigint,
    dstAddress: Uint8Array,
    payload: Uint8Array,
    spokeProvider: S,
    raw?: R,
  ): Promise<TxReturnType<S, R>> {
    const walletAddress = await spokeProvider.walletProvider.getWalletAddress();

    // Input order and types must match deployed program (e.g. sodax_connection_v1.aleo send_message).
    const executeParams: AleoExecuteOptions = {
      programName: this.chainConfig.addresses.connection,
      functionName: 'send_message',
      inputs: [
        walletAddress,
        AleoBaseSpokeProvider.formatAmount(dstChainId, 'u128'),
        toHex(dstAddress),
        toHex(payload),
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

  async waitForTransactionConfirmation(
    txId: string,
    timeout: number = ALEO_DEFAULT_TIMEOUT,
  ): Promise<boolean> {
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
