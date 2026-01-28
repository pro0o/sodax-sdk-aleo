import type { ChainType } from '@sodax/types';
import { useDisconnectWallet } from '@mysten/dapp-kit';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWallet as useAleoWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useCallback } from 'react';
import { useDisconnect } from 'wagmi';
import { getXService } from '../actions';
import { useXWagmiStore } from '../useXWagmiStore';

/**
 * Hook for disconnecting from a specific blockchain wallet
 *
 * Handles disconnection logic for EVM, SUI, Solana and other supported chains.
 * Clears connection state from XWagmiStore.
 *
 * @param {void} - No parameters required
 * @returns {(xChainType: ChainType) => Promise<void>} Async function that disconnects from the specified chain
 *
 * @example
 * ```ts
 * const disconnect = useXDisconnect();
 *
 * const handleDisconnect = async (xChainType: ChainType) => {
 *   await disconnect(xChainType);
 * };
 * ```
 */
export function useXDisconnect(): (xChainType: ChainType) => Promise<void> {
  const xConnections = useXWagmiStore(state => state.xConnections);
  const unsetXConnection = useXWagmiStore(state => state.unsetXConnection);

  const { disconnectAsync } = useDisconnect();
  const { mutateAsync: suiDisconnectAsync } = useDisconnectWallet();
  const solanaWallet = useWallet();
  const { disconnect: aleoDisconnect } = useAleoWallet();

  return useCallback(
    async (xChainType: ChainType) => {
      switch (xChainType) {
        case 'EVM':
          await disconnectAsync();
          break;
        case 'SUI':
          await suiDisconnectAsync();
          break;
        case 'SOLANA':
          await solanaWallet.disconnect();
          break;
        case 'ALEO':
          await aleoDisconnect();
          break;
        default: {
          const xService = getXService(xChainType);
          const xConnectorId = xConnections[xChainType]?.xConnectorId;
          const xConnector = xConnectorId ? xService.getXConnectorById(xConnectorId) : undefined;
          await xConnector?.disconnect();
          break;
        }
      }

      unsetXConnection(xChainType);
    },
    [xConnections, unsetXConnection, disconnectAsync, suiDisconnectAsync, solanaWallet, aleoDisconnect],
  );
}
