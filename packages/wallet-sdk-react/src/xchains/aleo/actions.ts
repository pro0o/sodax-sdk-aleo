import { useXWagmiStore } from '@/useXWagmiStore';

export const reconnectAleo = async () => {
  const aleoConnection = useXWagmiStore.getState().xConnections.ALEO;
  if (!aleoConnection) return;

  // Aleo wallets typically handle reconnection internally
  // through their adapter's readyState and event listeners
  // If needed, custom reconnection logic can be added here
};
