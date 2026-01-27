import type {
  ChainId,
  IEvmWalletProvider,
  IIconWalletProvider,
  IInjectiveWalletProvider,
  ISolanaWalletProvider,
  IStellarWalletProvider,
  ISuiWalletProvider,
  IAleoWalletProvider,
} from '@sodax/types';
import { useMemo } from 'react';
import {
  EvmWalletProvider,
  IconWalletProvider,
  SuiWalletProvider,
  InjectiveWalletProvider,
  StellarWalletProvider,
  SolanaWalletProvider,
  AleoWalletProvider,
  type BrowserExtensionAleoWalletConfig,
} from '@sodax/wallet-sdk-core';
import { getXChainType } from '../actions';
import { usePublicClient, useWalletClient } from 'wagmi';
import { type SolanaXService, type StellarXService, useXAccount, useXService } from '..';
import type { SuiXService } from '../xchains/sui/SuiXService';
import { CHAIN_INFO, SupportedChainId } from '../xchains/icon/IconXService';
import type { InjectiveXService } from '../xchains/injective/InjectiveXService';
import type { AleoXService } from '../xchains/aleo/AleoXService';
import { Network } from '@provablehq/aleo-types';

/**
 * Hook to get the appropriate wallet provider based on the chain type.
 * Supports EVM, SUI, ICON, INJECTIVE, STELLAR, SOLANA and ALEO chains.
 *
 * @param {ChainId | undefined} spokeChainId - The chain ID to get the wallet provider for. Can be any valid ChainId value.
 * @returns {EvmWalletProvider | SuiWalletProvider | IconWalletProvider | InjectiveWalletProvider | StellarWalletProvider | SolanaWalletProvider | AleoWalletProvider | undefined}
 * The appropriate wallet provider instance for the given chain ID, or undefined if:
 * - No chain ID is provided
 * - Chain type is not supported
 * - Required wallet provider options are not available
 *
 * @example
 * ```tsx
 * // Get wallet provider for a specific chain
 * const walletProvider = useWalletProvider('sui');
 * ```
 */
export function useWalletProvider(
  spokeChainId: ChainId | undefined,
):
  | IEvmWalletProvider
  | ISuiWalletProvider
  | IIconWalletProvider
  | IInjectiveWalletProvider
  | IStellarWalletProvider
  | ISolanaWalletProvider
  | IAleoWalletProvider
  | undefined {
  const xChainType = getXChainType(spokeChainId);
  // EVM-specific hooks
  const evmPublicClient = usePublicClient();

  const { data: evmWalletClient } = useWalletClient();

  // Cross-chain hooks
  const xService = useXService(getXChainType(spokeChainId));
  const xAccount = useXAccount(spokeChainId);

  return useMemo(() => {
    switch (xChainType) {
      case 'EVM': {
        if (!evmWalletClient) {
          return undefined;
        }
        if (!evmPublicClient) {
          return undefined;
        }

        return new EvmWalletProvider({
          walletClient: evmWalletClient,
          publicClient: evmPublicClient,
        });
      }

      case 'SUI': {
        const suiXService = xService as SuiXService;
        const { client, wallet, account } = {
          client: suiXService.suiClient,
          wallet: suiXService.suiWallet,
          account: suiXService.suiAccount,
        };

        return new SuiWalletProvider({ client, wallet, account });
      }

      case 'ICON': {
        const { walletAddress, rpcUrl } = {
          walletAddress: xAccount.address,
          rpcUrl: CHAIN_INFO[SupportedChainId.MAINNET].APIEndpoint,
        };

        return new IconWalletProvider({
          walletAddress: walletAddress as `hx${string}` | undefined,
          rpcUrl: rpcUrl as `http${string}`,
        });
      }

      case 'INJECTIVE': {
        const injectiveXService = xService as InjectiveXService;
        if (!injectiveXService) {
          return undefined;
          // throw new Error('InjectiveXService is not initialized');
        }

        return new InjectiveWalletProvider({
          msgBroadcaster: injectiveXService.msgBroadcaster,
        });
      }

      case 'STELLAR': {
        const stellarXService = xService as StellarXService;
        if (!stellarXService.walletsKit) {
          return undefined;
        }

        return new StellarWalletProvider({
          type: 'BROWSER_EXTENSION',
          walletsKit: stellarXService.walletsKit,
          network: 'PUBLIC',
        });
      }

      case 'SOLANA': {
        const solanaXService = xService as SolanaXService;

        if (!solanaXService.wallet) {
          return undefined;
        }

        if (!solanaXService.connection) {
          return undefined;
        }

        return new SolanaWalletProvider({
          wallet: solanaXService.wallet,
          connection: solanaXService.connection,
        });
      }

      case 'ALEO': {
        const aleoXService = xService as AleoXService;

        if (!aleoXService || !aleoXService.networkClient) {
          return undefined;
        }

        if (!aleoXService.connectedAccount) {
          return undefined;
        }

        if (!aleoXService.walletAdapter) {
          return undefined;
        }

        return new AleoWalletProvider({
          type: 'browserExtension',
          rpcUrl: aleoXService.rpcUrl,
          provableAdapter: aleoXService.walletAdapter,
          network: aleoXService.network === Network.MAINNET ? 'mainnet' : 'testnet',
        } as BrowserExtensionAleoWalletConfig);
      }

      default:
        return undefined;
    }
  }, [xChainType, evmPublicClient, evmWalletClient, xService, xAccount]);
}
