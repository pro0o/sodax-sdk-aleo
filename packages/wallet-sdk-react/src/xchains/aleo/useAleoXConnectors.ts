import { useEffect, useState } from 'react';
import type { WalletAdapter as BaseAleoWalletAdapter } from '@provablehq/aleo-wallet-standard';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { FoxWalletAdapter } from '@provablehq/aleo-wallet-adaptor-fox';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { SoterWalletAdapter } from '@provablehq/aleo-wallet-adaptor-soter';
import { AleoXConnector } from './AleoXConnector';
import { AleoXService } from './AleoXService';

interface AleoWindow extends Window {
  leoWallet?: any;
  leo?: any;
  foxwallet?: { aleo?: any };
  puzzle?: any;
  shield?: any;
  soter?: any;
}

const WALLET_ADAPTERS = [
  { check: (w: AleoWindow) => w.leoWallet || w.leo, Adapter: LeoWalletAdapter, name: 'Leo Wallet' },
  { check: (w: AleoWindow) => w.foxwallet?.aleo, Adapter: FoxWalletAdapter, name: 'Fox Wallet' },
  { check: (w: AleoWindow) => w.puzzle, Adapter: PuzzleWalletAdapter, name: 'Puzzle Wallet' },
  { check: (w: AleoWindow) => w.shield, Adapter: ShieldWalletAdapter, name: 'Shield Wallet' },
  { check: (w: AleoWindow) => w.soter, Adapter: SoterWalletAdapter, name: 'Soter Wallet' },
] as const;

export function useAleoXConnectors() {
  const [aleoXConnectors, setAleoXConnectors] = useState<AleoXConnector[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const detectAleoWallets = async () => {
      try {
        if (typeof window === 'undefined') {
          setIsLoading(false);
          return;
        }

        const w = window as AleoWindow;
        const wallets: BaseAleoWalletAdapter[] = [];

        for (const { check, Adapter, name } of WALLET_ADAPTERS) {
          if (check(w)) {
            try {
              wallets.push(new Adapter());
            } catch (error) {
              console.debug(`${name} not available:`, error);
            }
          }
        }

        const connectors = wallets.map(adapter => new AleoXConnector(adapter));
        setAleoXConnectors(connectors);
        AleoXService.getInstance().setXConnectors(connectors);
      } catch (error) {
        console.error('Error detecting Aleo wallets:', error);
      } finally {
        setIsLoading(false);
      }
    };

    detectAleoWallets();
  }, []);

  return { data: aleoXConnectors, isLoading };
}
