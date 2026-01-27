import type { WalletAdapter } from '@provablehq/aleo-wallet-standard';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { FoxWalletAdapter } from '@provablehq/aleo-wallet-adaptor-fox';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { SoterWalletAdapter } from '@provablehq/aleo-wallet-adaptor-soter';
import { AleoXConnector } from './AleoXConnector';

/**
 * Retrieves all available Aleo wallet adapters.
 * 
 * Supported wallets:
 * - Puzzle Wallet
 * - Leo Wallet
 * - Fox Wallet
 * - Shield Wallet
 * - Soter Wallet
 * 
 * @returns Array of initialized WalletAdapter instances
 */
export function getAleoWallets(): WalletAdapter[] {
  const wallets: WalletAdapter[] = [];

  // Try to initialize each wallet adapter
  const adapters = [
    { name: 'Puzzle', Adapter: PuzzleWalletAdapter },
    { name: 'Leo', Adapter: LeoWalletAdapter },
    { name: 'Fox', Adapter: FoxWalletAdapter },
    { name: 'Shield', Adapter: ShieldWalletAdapter },
    { name: 'Soter', Adapter: SoterWalletAdapter },
  ];

  for (const { name, Adapter } of adapters) {
    try {
      const adapter = new Adapter();
      wallets.push(adapter);
    } catch (error) {
      console.error(`[AleoWallets] Failed to initialize ${name}WalletAdapter:`, error);
    }
  }

  if (wallets.length === 0) {
    console.warn('[AleoWallets] No wallet adapters available. Install a compatible Aleo wallet extension.');
  }

  return wallets;
}

/**
 * Retrieves all available Aleo wallet connectors.
 * 
 * This is a convenience function that wraps all available wallet adapters
 * in AleoXConnector instances.
 * 
 * @returns Array of AleoXConnector instances
 */
export function getAleoConnectors(): AleoXConnector[] {
  const adapters = getAleoWallets();
  return adapters.map(adapter => new AleoXConnector(adapter));
}
