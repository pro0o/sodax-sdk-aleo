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

export type AleoSpokeDepositParams = {
  from: string; // Aleo address (aleo1...)
  to?: HubAddress; // The address of the user on the hub chain (wallet abstraction address)
  token: bigint; // Token ID as field
  amount: bigint; // Amount to transfer
  data: Hex; // Data payload
  connSn?: bigint; // Connection sequence number (randomly generated if not provided)
  feeAmount?: bigint; // Fee amount for cross-chain transfer (defaults to 0)
};

export type AleoTransferToHubParams = {
  token: bigint;
  recipient: Address;
  amount: bigint;
  data: Hex;
  connSn: bigint;
  feeAmount: bigint;
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

    const connSn = params.connSn ?? AleoSpokeService.generateConnSn();

    return AleoSpokeService.transfer(
      {
        token: params.token,
        recipient: userWallet,
        amount: params.amount,
        data: keccak256(params.data),
        connSn,
        feeAmount: params.feeAmount ?? 0n,
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
    const walletAddress = await spokeProvider.walletProvider.getWalletAddress();
    return baseProvider.getBalance(walletAddress, token);
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
   * Calls the connection contract on the spoke chain to send a message to the hub wallet.
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
    const connSn = AleoSpokeService.generateConnSn();
    return AleoSpokeService.call(BigInt(relayId), from, keccak256(payload), connSn, spokeProvider, raw);
  }

  /**
   * Transfer tokens from Aleo spoke to hub chain via asset_manager.aleo.
   *
   * Note: Aleo transitions cannot access on-chain mappings, so conn_sn,
   * fee_amount, hub_chain_id, and hub_address must all be passed as inputs.
   */
  private static async transfer<S extends AleoSpokeProviderType, R extends boolean = false>(
    { token, recipient, amount, data, connSn, feeAmount }: AleoTransferToHubParams,
    spokeProvider: S,
    hubProvider: EvmHubProvider,
    raw?: R,
  ): Promise<TxReturnType<S, R>> {
    const baseProvider = new AleoBaseSpokeProvider(spokeProvider.chainConfig);

    const hubChainId = BigInt(hubProvider.chainConfig.chain.id);
    const hubAddress = hubProvider.chainConfig.addresses.assetManager as Hex;

    return baseProvider.transfer(
      token,
      recipient,
      amount,
      connSn,
      data,
      feeAmount,
      hubChainId,
      hubAddress,
      spokeProvider,
      raw,
    );
  }

  /**
   * Sends a message to the hub chain via connection.aleo.
   */
  private static async call<S extends AleoSpokeProviderType, R extends boolean = false>(
    dstChainId: bigint,
    dstAddress: HubAddress,
    payload: Hex,
    connSn: bigint,
    spokeProvider: S,
    raw?: R,
  ): Promise<TxReturnType<S, R>> {
    const baseProvider = new AleoBaseSpokeProvider(spokeProvider.chainConfig);
    return baseProvider.sendMessage(dstChainId, dstAddress, connSn, payload, spokeProvider, raw);
  }

  /**
   * Generate a random connection sequence number (conn_sn).
   * Aleo transitions can't read on-chain mappings, so conn_sn is generated as a random nonce.
   *
   * @returns A random connection sequence number.
   */
  public static generateConnSn(): bigint {
    return BigInt(Math.floor(Math.random() * 98488343));
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
