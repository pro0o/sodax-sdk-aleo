import { useEffect } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useXWagmiStore } from '@/useXWagmiStore';
import { AleoXService } from '../AleoXService';

/**
 * Syncs Aleo wallet state changes with the global XWagmiStore
 * 
 * This hook:
 * - Listens to account changes and updates the store
 * - Listens to network changes and updates the network client
 * - Listens to disconnect events and clears the store
 * - Handles auto-connect when enabled
 * 
 * @example
 * ```tsx
 * // In your app root or where AleoWalletProvider is used
 * function AleoSync() {
 *   useAleoWalletSync();
 *   return null;
 * }
 * ```
 */
export function useAleoWalletSync() {
  const walletContext = useWallet();
  const { wallet, address, connected, network, autoConnect } = walletContext;
  const { setXConnection, unsetXConnection } = useXWagmiStore();

  useEffect(() => {
    const aleoService = AleoXService.getInstance();
    aleoService.wallet = walletContext;
  }, [walletContext]);

  useEffect(() => {
    if (connected && address && wallet) {
      setXConnection('ALEO', {
        xAccount: {
          address,
          xChainType: 'ALEO',
        },
        xConnectorId: wallet.adapter.name,
      });
    } else if (!connected) {
      const currentConnection = useXWagmiStore.getState().xConnections.ALEO;
      if (currentConnection?.xAccount) {
        unsetXConnection('ALEO');
      }
    }
  }, [connected, address, wallet, setXConnection, unsetXConnection]);

  useEffect(() => {
    if (network) {
      const aleoService = AleoXService.getInstance();
      aleoService.setNetworkClient(network);
    }
  }, [network]);

  return {
    connected,
    address,
    network,
    autoConnect,
  };
}
