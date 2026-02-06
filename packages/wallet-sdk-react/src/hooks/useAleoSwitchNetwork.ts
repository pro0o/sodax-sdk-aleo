import { useCallback, useMemo } from 'react';
import { useWallet as useAleoWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Network } from '@provablehq/aleo-types';
import { AleoXService } from '../xchains/aleo/AleoXService';

interface UseAleoSwitchNetworkReturn {
  currentNetwork: Network | null;
  isWrongNetwork: boolean;
  isSwitchSupported: boolean;
  switchNetwork: (network: Network) => Promise<boolean>;
}

/**
 * Hook to handle Aleo network switching functionality
 *
 * Enables switching between Aleo mainnet and testnet networks for supported wallets.
 * Synchronizes wallet adapter network state with AleoXService RPC configuration.
 *
 * Note: Network switching support varies by wallet:
 * - Shield: Fully supported
 * - Leo, Fox, Puzzle, Soter: Not supported (wallet extension limitation)
 *
 * @param expectedNetwork - The target network to validate/switch to (Network.MAINNET or Network.TESTNET3)
 * @returns {Object} Object containing:
 *   - currentNetwork: Currently connected network or null if not connected
 *   - isWrongNetwork: boolean indicating if current network differs from expected network
 *   - isSwitchSupported: boolean indicating if connected wallet supports network switching
 *   - switchNetwork: async function to switch to specified network (returns false if unsupported)
 *
 * @example
 * ```tsx
 * function NetworkSwitchButton() {
 *   const { 
 *     isWrongNetwork, 
 *     isSwitchSupported, 
 *     switchNetwork 
 *   } = useAleoSwitchNetwork(Network.MAINNET);
 *
 *   if (!isSwitchSupported) {
 *     return <p>Please reconnect with Shield wallet to switch networks</p>;
 *   }
 *
 *   return (
 *     <Button 
 *       onClick={() => switchNetwork(Network.MAINNET)} 
 *       disabled={!isWrongNetwork}
 *     >
 *       Switch to Mainnet
 *     </Button>
 *   );
 * }
 * ```
 */
export function useAleoSwitchNetwork(
  expectedNetwork?: Network
): UseAleoSwitchNetworkReturn {
  const { wallet, connected, switchNetwork: aleoSwitchNetwork } = useAleoWallet();
  
  const currentNetwork = useMemo(() => {
    if (!connected || !wallet?.adapter) return null;
    return wallet.adapter.network;
  }, [connected, wallet]);

  // Check if wallet supports network switching (currently only Shield wallet)
  const isSwitchSupported = useMemo(() => {
    if (!connected || !wallet?.adapter) return false;
    // Shield wallet is the only one that implements switchNetwork
    return wallet.adapter.name === 'Shield';
  }, [connected, wallet]);

  const isWrongNetwork = useMemo(() => {
    if (!expectedNetwork || !currentNetwork) return false;
    return currentNetwork !== expectedNetwork;
  }, [expectedNetwork, currentNetwork]);

  const switchNetwork = useCallback(
    async (network: Network): Promise<boolean> => {
      if (!connected || !wallet?.adapter) {
        console.warn('[Aleo] Wallet not connected');
        return false;
      }

      if (!isSwitchSupported) {
        console.warn(
          `[Aleo] Network switching not supported by ${wallet.adapter.name} wallet. ` +
          'Please disconnect and reconnect with Shield wallet to use a different network.'
        );
        return false;
      }

      try {
        // Attempt network switch via wallet adapter
        const switched = await aleoSwitchNetwork(network);
        
        if (switched) {
          // Sync AleoXService RPC client with new network
          const aleoXService = AleoXService.getInstance();
          aleoXService.setNetworkClient(network);
          console.info(`[Aleo] Switched to ${network}`);
        }
        
        return switched;
      } catch (error) {
        console.error('[Aleo] Failed to switch network:', error);
        return false;
      }
    },
    [connected, wallet, isSwitchSupported, aleoSwitchNetwork]
  );

  return {
    currentNetwork,
    isWrongNetwork,
    isSwitchSupported,
    switchNetwork,
  };
}
