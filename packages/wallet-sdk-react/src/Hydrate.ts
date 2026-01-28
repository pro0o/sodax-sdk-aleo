'use client';

import { useCurrentAccount, useCurrentWallet, useSuiClient } from '@mysten/dapp-kit';
import { useEffect } from 'react';
import { EvmXService } from './xchains/evm';
import { SolanaXService } from './xchains/solana/SolanaXService';
import { SuiXService } from './xchains/sui';
import { AleoXService } from './xchains/aleo/AleoXService';
import { useAnchorProvider } from './xchains/solana/hooks/useAnchorProvider';
import { useConnection, useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { useWallet as useAleoWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useConfig } from 'wagmi';
import { useAleoWalletSync } from './xchains/aleo/hooks/useAleoWalletSync';

export const Hydrate = () => {
  // Sync Aleo wallet state with store (auto-connect, account changes, network changes)
  // sui
  const suiClient = useSuiClient();
  useEffect(() => {
    if (suiClient) {
      SuiXService.getInstance().suiClient = suiClient;
    }
  }, [suiClient]);
  const { currentWallet: suiWallet } = useCurrentWallet();
  useEffect(() => {
    if (suiWallet) {
      SuiXService.getInstance().suiWallet = suiWallet;
    }
  }, [suiWallet]);
  const suiAccount = useCurrentAccount();
  useEffect(() => {
    if (suiAccount) {
      SuiXService.getInstance().suiAccount = suiAccount;
    }
  }, [suiAccount]);
  
  // solana
  const { connection: solanaConnection } = useConnection();
  const solanaWallet = useSolanaWallet();
  const solanaProvider = useAnchorProvider();
  useEffect(() => {
    if (solanaConnection) {
      SolanaXService.getInstance().connection = solanaConnection;
    }
  }, [solanaConnection]);
  useEffect(() => {
    if (solanaWallet) {
      SolanaXService.getInstance().wallet = solanaWallet;
    }
  }, [solanaWallet]);
  useEffect(() => {
    if (solanaProvider) {
      SolanaXService.getInstance().provider = solanaProvider;
    }
  }, [solanaProvider]);
  
  // aleo
  const aleoWallet = useAleoWallet();
  useEffect(() => {
    if (aleoWallet) {
      AleoXService.getInstance().wallet = aleoWallet;
    }
  }, [aleoWallet]);
  useAleoWalletSync();
  
  // evm
  const wagmiConfig = useConfig();
  useEffect(() => {
    if (wagmiConfig) {
      EvmXService.getInstance().wagmiConfig = wagmiConfig;
    }
  }, [wagmiConfig]);
  
  return null;
};
