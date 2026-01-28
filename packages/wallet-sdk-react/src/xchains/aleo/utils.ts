import type { WalletAdapter } from '@provablehq/aleo-wallet-standard';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { FoxWalletAdapter } from '@provablehq/aleo-wallet-adaptor-fox';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { SoterWalletAdapter } from '@provablehq/aleo-wallet-adaptor-soter';

export function getAleoWallets(): WalletAdapter[] {
  const wallets: WalletAdapter[] = [];

  const adapters = [
    { Adapter: PuzzleWalletAdapter },
    { Adapter: LeoWalletAdapter },
    { Adapter: FoxWalletAdapter },
    { Adapter: ShieldWalletAdapter },
    { Adapter: SoterWalletAdapter },
  ];

  for (const { Adapter } of adapters) {
    try {
      const adapter = new Adapter();
      wallets.push(adapter);
    } catch (e) {
    }
  }

  return wallets;
}