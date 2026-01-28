import { useMemo } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { AleoXConnector } from '../AleoXConnector';

export function useAleoWallets() {
  const { wallets } = useWallet();
  
  return useMemo(
    () => wallets.map(w => new AleoXConnector(w.adapter)),
    [wallets]
  );
}