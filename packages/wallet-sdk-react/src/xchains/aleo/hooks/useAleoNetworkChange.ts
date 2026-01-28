import { useEffect } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Network } from '@provablehq/aleo-types';
import { AleoXService } from '../AleoXService';

/**
 * Hook to listen for Aleo network changes
 * 
 * The Aleo wallet adapter emits 'networkChange' events when the user
 * switches networks in their wallet extension.
 * 
 * This hook:
 * - Listens to network changes
 * - Updates the network client in AleoXService
 * - Provides callback for custom handling
 * 
 * @param onNetworkChange - Optional callback when network changes
 * 
 * @example
 * ```tsx
 * useAleoNetworkChange((newNetwork) => {
 *   console.log('Network changed to:', newNetwork);
 *   // Refresh balances, reload data, etc.
 * });
 * ```
 */
export function useAleoNetworkChange(
  onNetworkChange?: (network: Network) => void
) {
  const { wallet, network } = useWallet();

  useEffect(() => {
    if (!wallet?.adapter) return;

    const handleNetworkChange = (newNetwork: Network) => {
      const aleoService = AleoXService.getInstance();
      aleoService.setNetworkClient(newNetwork);

      if (onNetworkChange) {
        onNetworkChange(newNetwork);
      }
    };

    wallet.adapter.on('networkChange', handleNetworkChange);

    return () => {
      wallet.adapter.off('networkChange', handleNetworkChange);
    };
  }, [wallet, onNetworkChange]);

  return {
    currentNetwork: network,
  };
}
