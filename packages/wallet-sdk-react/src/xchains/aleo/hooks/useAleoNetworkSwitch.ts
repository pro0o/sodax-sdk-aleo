import { useMutation } from '@tanstack/react-query';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Network } from '@provablehq/aleo-types';

/**
 * Hook for switching Aleo network
 * 
 * Allows programmatic switching between Mainnet and Testnet.
 * The wallet adapter handles the network switch and emits events.
 * 
 * @example
 * ```tsx
 * const { switchNetwork, isPending } = useAleoNetworkSwitch();
 * 
 * // Switch to mainnet
 * const success = await switchNetwork.mutateAsync(Network.MAINNET);
 * 
 * if (success) {
 *   console.log('Network switched successfully');
 * }
 * ```
 */
export function useAleoNetworkSwitch() {
  const { switchNetwork: switch_network, network: currentNetwork } = useWallet();

  const switchNetwork = useMutation({
    mutationFn: async (network: Network): Promise<boolean> => {
      return await switch_network(network);
    },
  });

  return {
    switchNetwork,
    currentNetwork,
    isPending: switchNetwork.isPending,
    isSuccess: switchNetwork.isSuccess,
    error: switchNetwork.error,
  };
}

/**
 * Return type for useAleoNetworkSwitch hook
 */
export type AleoNetworkSwitchHook = ReturnType<typeof useAleoNetworkSwitch>;
