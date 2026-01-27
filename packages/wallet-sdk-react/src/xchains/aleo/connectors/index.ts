import { AleoXConnector } from '../AleoXConnector';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { FoxWalletAdapter } from '@provablehq/aleo-wallet-adaptor-fox';
import { SoterWalletAdapter } from '@provablehq/aleo-wallet-adaptor-soter';

/**
 * Create a connector for Puzzle Wallet
 * 
 * Puzzle is a browser extension wallet for Aleo.
 * 
 * @returns AleoXConnector instance for Puzzle Wallet
 * @see https://puzzle.online/
 */
export function createPuzzleConnector(): AleoXConnector {
  return new AleoXConnector(new PuzzleWalletAdapter());
}

/**
 * Create a connector for Leo Wallet
 * 
 * Leo is a mobile and browser wallet for Aleo.
 * 
 * @returns AleoXConnector instance for Leo Wallet
 * @see https://app.leo.app
 */
export function createLeoConnector(): AleoXConnector {
  return new AleoXConnector(new LeoWalletAdapter());
}

/**
 * Create a connector for Shield Wallet
 * 
 * Shield is a privacy-focused wallet for Aleo.
 * 
 * @returns AleoXConnector instance for Shield Wallet
 */
export function createShieldConnector(): AleoXConnector {
  return new AleoXConnector(new ShieldWalletAdapter());
}

/**
 * Create a connector for Fox Wallet
 * 
 * Fox is a multi-chain wallet with Aleo support.
 * 
 * @returns AleoXConnector instance for Fox Wallet
 * @see https://foxwallet.com/
 */
export function createFoxConnector(): AleoXConnector {
  return new AleoXConnector(new FoxWalletAdapter());
}

/**
 * Create a connector for Soter Wallet
 * 
 * Soter is a secure wallet for Aleo.
 * 
 * @returns AleoXConnector instance for Soter Wallet
 */
export function createSoterConnector(): AleoXConnector {
  return new AleoXConnector(new SoterWalletAdapter());
}

/**
 * Get all available Aleo connectors
 * 
 * This function attempts to create connectors for all supported Aleo wallets.
 * Wallets that are not available will be gracefully skipped.
 * 
 * @returns Array of AleoXConnector instances for all available wallets
 * 
 * @example
 * ```typescript
 * const connectors = getAllAleoConnectors();
 * console.log(`Found ${connectors.length} Aleo wallets`);
 * ```
 */
export function getAllAleoConnectors(): AleoXConnector[] {
  const connectors: AleoXConnector[] = [];
  
  const factories = [
    { name: 'Puzzle', create: createPuzzleConnector },
    { name: 'Leo', create: createLeoConnector },
    { name: 'Shield', create: createShieldConnector },
    { name: 'Fox', create: createFoxConnector },
    { name: 'Soter', create: createSoterConnector },
  ];

  for (const { name, create } of factories) {
    try {
      connectors.push(create());
    } catch (error) {
      // Wallet not available - silently skip
      console.debug(`[AleoConnectors] ${name} wallet not available`);
    }
  }
  
  return connectors;
}
