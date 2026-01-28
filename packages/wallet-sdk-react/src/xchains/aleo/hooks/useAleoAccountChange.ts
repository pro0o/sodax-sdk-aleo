import { useEffect } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

export function useAleoAccountChange(
  onAccountChange?: (address: string | null) => void
) {
  const { wallet, address, reconnecting } = useWallet();

  useEffect(() => {
    if (!wallet?.adapter) return;

    const handleAccountChange = () => {
      // The wallet adapter handles reconnection automatically
      // We just notify the callback when reconnection completes
      if (!reconnecting && address && onAccountChange) {
        onAccountChange(address);
      }
    };

    wallet.adapter.on('accountChange', handleAccountChange);

    return () => {
      wallet.adapter.off('accountChange', handleAccountChange);
    };
  }, [wallet, address, reconnecting, onAccountChange]);

  return {
    isChangingAccount: reconnecting,
    currentAddress: address,
  };
}
