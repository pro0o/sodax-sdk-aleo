import type { Address, Hex } from 'viem';
import { keccak256 } from 'viem';
import type { EvmHubProvider } from '../../entities/index.js';
import { AleoBaseSpokeProvider, type AleoSpokeProvider } from '../../entities/aleo/AleoSpokeProvider.js';
import type {
  AleoGasEstimate,
  AleoSpokeProviderType,
  DepositSimulationParams,
  Result,
  TxReturnType,
} from '../../types.js';
import { getIntentRelayChainId, type AleoRawTransaction, type HubAddress } from '@sodax/types';
import { EvmWalletAbstraction } from '../hub/index.js';
import { encodeAddress } from '../../utils/shared-utils.js';
import { isAleoRawSpokeProvider } from '../../guards.js';

export type AleoTransferToHubParams = {
  token: bigint;
  recipient: Address;
  amount: bigint;
  data: Hex;
};

export type AleoSpokeDepositParams = {
  from: string; // Aleo address (aleo1...)
  to?: HubAddress; // The address of the user on the hub chain (wallet abstraction address)
  token: bigint; // Token ID as field
  amount: bigint; // Amount to transfer
  data: Hex; // Data payload
};

export class AleoSpokeService {
  private constructor() {}

  /**
   * Estimate the gas for an Aleo transaction.
   * @param rawTx - The raw transaction to estimate the gas for.
   * @param spokeProvider - The provider for the spoke chain.
   * @returns The estimated gas for the transaction.
   */
  public static async estimateGas(
    rawTx: AleoRawTransaction,
    spokeProvider: AleoSpokeProviderType,
  ): Promise<AleoGasEstimate> {
    const baseProvider = new AleoBaseSpokeProvider(spokeProvider.chainConfig);
    return baseProvider.estimateFee(rawTx.data);
  }

  /**
   * Deposit tokens from the Aleo spoke chain to the hub chain.
   * @param params - The deposit parameters.
   * @param spokeProvider - The Aleo spoke provider.
   * @param hubProvider - The EVM hub provider.
   * @param raw - Whether to return raw transaction data.
   * @returns The transaction ID or raw transaction.
   */
  public static async deposit<S extends AleoSpokeProviderType, R extends boolean = false>(
    params: AleoSpokeDepositParams,
    spokeProvider: S,
    hubProvider: EvmHubProvider,
    raw?: R,
  ): Promise<TxReturnType<S, R>> {
    const userWallet: Address =
      params.to ??
      (await EvmWalletAbstraction.getUserHubWalletAddress(
        spokeProvider.chainConfig.chain.id,
        encodeAddress(spokeProvider.chainConfig.chain.id, params.from),
        hubProvider,
      ));

    return AleoSpokeService.transfer(
      {
        token: params.token,
        recipient: userWallet,
        amount: params.amount,
        data: keccak256(params.data),
      },
      spokeProvider,
      hubProvider,
      raw,
    );
  }

  /**
   * Get the balance of a token in the Aleo spoke chain asset manager.
   * @param token - The token program ID (e.g., "usdc_token.aleo").
   * @param spokeProvider - The Aleo spoke provider.
   * @returns The balance of the token.
   */
  public static async getDeposit(token: string, spokeProvider: AleoSpokeProviderType): Promise<bigint> {
    const baseProvider = new AleoBaseSpokeProvider(spokeProvider.chainConfig);
    const assetManagerAddress = spokeProvider.chainConfig.addresses.assetManager;
    return baseProvider.getBalance(assetManagerAddress, token);
  }

  /**
   * Generate simulation parameters for deposit from AleoSpokeDepositParams.
   * @param params - The deposit parameters.
   * @param spokeProvider - The provider for the spoke chain.
   * @param hubProvider - The provider for the hub chain.
   * @returns The simulation parameters.
   */
  public static async getSimulateDepositParams(
    params: AleoSpokeDepositParams,
    spokeProvider: AleoSpokeProviderType,
    hubProvider: EvmHubProvider,
  ): Promise<DepositSimulationParams> {
    const to =
      params.to ??
      (await EvmWalletAbstraction.getUserHubWalletAddress(
        spokeProvider.chainConfig.chain.id,
        encodeAddress(spokeProvider.chainConfig.chain.id, params.from),
        hubProvider,
      ));

    return {
      spokeChainID: spokeProvider.chainConfig.chain.id,
      token: encodeAddress(spokeProvider.chainConfig.chain.id, `0x${params.token.toString(16)}`),
      from: encodeAddress(spokeProvider.chainConfig.chain.id, params.from),
      to,
      amount: params.amount,
      data: params.data,
      srcAddress: encodeAddress(
        spokeProvider.chainConfig.chain.id,
        spokeProvider.chainConfig.addresses.assetManager as `0x${string}`,
      ),
    };
  }

  /**
   * Calls a contract on the spoke chain using the user's wallet.
   * @param from - The address of the user on the hub chain.
   * @param payload - The payload to send to the contract.
   * @param spokeProvider - The spoke provider.
   * @param hubProvider - The hub provider.
   * @param raw - Whether to return the raw transaction data.
   * @returns The transaction result.
   */
  public static async callWallet<S extends AleoSpokeProviderType, R extends boolean = false>(
    from: HubAddress,
    payload: Hex,
    spokeProvider: S,
    hubProvider: EvmHubProvider,
    raw?: R,
  ): Promise<TxReturnType<S, R>> {
    const relayId = getIntentRelayChainId(hubProvider.chainConfig.chain.id);
    return AleoSpokeService.call(BigInt(relayId), from, keccak256(payload), spokeProvider, raw);
  }

  /**
   * Transfer tokens from Aleo spoke to hub chain via asset_manager.aleo.
   * @param params - Transfer parameters.
   * @param spokeProvider - The Aleo spoke provider.
   * @param hubProvider - The EVM hub provider.
   * @param raw - Whether to return raw transaction data.
   * @returns The transaction ID or raw transaction.
   */
  private static async transfer<S extends AleoSpokeProviderType, R extends boolean = false>(
    { token, recipient, amount, data }: AleoTransferToHubParams,
    spokeProvider: S,
    hubProvider: EvmHubProvider,
    raw?: R,
  ): Promise<TxReturnType<S, R>> {
    const baseProvider = new AleoBaseSpokeProvider(spokeProvider.chainConfig);

    // Get the connection sequence number (this would typically come from on-chain state)
    // For now, using a placeholder - in production this should be fetched from the connection contract
    const connSn = 0n; //! Randomize

    // Convert data hex to field (using first 32 bytes or padding)
    const dataField = BigInt(data.slice(0, 66)); // 0x + 64 hex chars = 32 bytes

    // Fee amount for cross-chain transfer (configurable)
    const feeAmount = 0n;

    // Hub chain configuration
    const hubChainId = BigInt(hubProvider.chainConfig.chain.id);
    const hubAddress = hubProvider.chainConfig.addresses.assetManager;

    return baseProvider.transfer(
      token,
      recipient,
      amount,
      connSn,
      dataField,
      feeAmount,
      hubChainId,
      hubAddress,
      spokeProvider,
      raw,
    );
  }

  /**
   * Sends a message to the hub chain via connection.aleo.
   * @param dstChainId - The destination chain ID.
   * @param dstAddress - The destination address on the hub chain.
   * @param payload - The message payload.
   * @param spokeProvider - The Aleo spoke provider.
   * @param raw - Whether to return raw transaction data.
   * @returns The transaction ID or raw transaction.
   */
  private static async call<S extends AleoSpokeProviderType, R extends boolean = false>(
    dstChainId: bigint,
    dstAddress: HubAddress,
    payload: Hex,
    spokeProvider: S,
    raw?: R,
  ): Promise<TxReturnType<S, R>> {
    const baseProvider = new AleoBaseSpokeProvider(spokeProvider.chainConfig);

    // Get the connection sequence number
    const connSn = 0n;

    return baseProvider.sendMessage(dstChainId, dstAddress, connSn, payload, spokeProvider, raw);
  }

  /**
   * Wait for an Aleo transaction to be confirmed.
   * @param spokeProvider - The Aleo spoke provider (must be full provider, not raw).
   * @param txId - The transaction ID to wait for.
   * @param timeout - The timeout in milliseconds (default: 45000).
   * @returns Result indicating success or failure.
   */
  public static async waitForConfirmation(
    spokeProvider: AleoSpokeProvider,
    txId: string,
    timeout = 45000,
  ): Promise<Result<boolean>> {
    if (isAleoRawSpokeProvider(spokeProvider)) {
      return {
        ok: false,
        error: new Error('Cannot wait for confirmation with raw provider'),
      };
    }

    try {
      const confirmed = await spokeProvider.waitForTransactionConfirmation(txId, timeout);
      return { ok: true, value: confirmed };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error : new Error(`Failed to confirm transaction: ${error}`),
      };
    }
  }
}
