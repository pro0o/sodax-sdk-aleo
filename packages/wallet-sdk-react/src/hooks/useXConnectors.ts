import type { ChainType } from '@sodax/types';
import { useWallets } from '@mysten/dapp-kit';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { useMemo } from 'react';
import { useConnectors } from 'wagmi';
import type { XConnector } from '../core';
import { EvmXConnector } from '../xchains/evm';
import { SolanaXConnector } from '../xchains/solana';
import { getAleoConnectors } from '../xchains/aleo/utils';
import { useStellarXConnectors } from '../xchains/stellar/useStellarXConnectors';
import { SuiXConnector } from '../xchains/sui';
import { useXService } from './useXService';

/**
 * Hook to retrieve available wallet connectors for a specific blockchain type.
 *
 * This hook aggregates wallet connectors from different blockchain ecosystems:
 * - EVM: Uses wagmi connectors
 * - Sui: Uses Sui wallet adapters
 * - Stellar: Uses custom Stellar connectors
 * - Solana: Uses Solana wallet adapters (filtered to installed wallets only)
 * - Aleo: Uses Aleo wallet adapters
 *
 * @param xChainType - The blockchain type to get connectors for ('EVM' | 'SUI' | 'STELLAR' | 'SOLANA' | 'ALEO')
 * @returns An array of XConnector instances compatible with the specified chain type
 */

export function useXConnectors(xChainType: ChainType | undefined): XConnector[] {
  const xService = useXService(xChainType);
  const evmConnectors = useConnectors();
  const suiWallets = useWallets();
  const { data: stellarXConnectors } = useStellarXConnectors();

  const { wallets: solanaWallets } = useSolanaWallet();

  const xConnectors = useMemo((): XConnector[] => {
    if (!xChainType || !xService) {
      return [];
    }

    switch (xChainType) {
      case 'EVM':
        return evmConnectors.map(connector => new EvmXConnector(connector));
      case 'SUI':
        return suiWallets.map(wallet => new SuiXConnector(wallet));
      case 'STELLAR':
        return stellarXConnectors || [];
      case 'SOLANA':
        return solanaWallets
          .filter(wallet => wallet.readyState === 'Installed')
          .map(wallet => new SolanaXConnector(wallet));
      case 'ALEO':
        return getAleoConnectors().filter(connector => connector.readyState === 'Installed');
      default:
        return xService.getXConnectors();
    }
  }, [xService, xChainType, evmConnectors, suiWallets, stellarXConnectors, solanaWallets]);

  return xConnectors;
}
