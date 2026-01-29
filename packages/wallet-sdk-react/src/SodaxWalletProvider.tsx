'use client';

// biome-ignore lint/style/useImportType: <explanation>
import React, { useMemo } from 'react';

// sui
import { SuiClientProvider, WalletProvider as SuiWalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';

// evm
import { WagmiProvider } from 'wagmi';

// solana
import {
  ConnectionProvider as SolanaConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { UnsafeBurnerWalletAdapter } from '@solana/wallet-adapter-wallets';

// aleo
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { FoxWalletAdapter } from '@provablehq/aleo-wallet-adaptor-fox';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { SoterWalletAdapter } from '@provablehq/aleo-wallet-adaptor-soter';
import { Network as AleoNetwork } from '@provablehq/aleo-types';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';
import type { WalletAdapter } from '@provablehq/aleo-wallet-standard';

import type { RpcConfig } from '@sodax/types';

import { Hydrate } from './Hydrate';
import { createWagmiConfig } from './xchains/evm/EvmXService';
import { reconnectIcon } from './xchains/icon/actions';
// import { reconnectInjective } from './xchains/injective/actions';
import { reconnectStellar } from './xchains/stellar/actions';
import { reconnectAleo } from './xchains/aleo/actions';

export const SodaxWalletProvider = ({ children, rpcConfig }: { children: React.ReactNode; rpcConfig: RpcConfig }) => {
  const wagmiConfig = useMemo(() => {
    return createWagmiConfig(rpcConfig);
  }, [rpcConfig]);

  const solanaWallets = useMemo(() => [new UnsafeBurnerWalletAdapter()], []);

  const aleoWallets = useMemo(() => {
    const wallets: WalletAdapter[] = [];
    try {
      wallets.push(new LeoWalletAdapter());
    } catch (e) {
      console.debug('Leo Wallet not available');
    }
    try {
      wallets.push(new FoxWalletAdapter());
    } catch (e) {
      console.debug('Fox Wallet not available');
    }
    try {
      wallets.push(new PuzzleWalletAdapter());
    } catch (e) {
      console.debug('Puzzle Wallet not available');
    }
    try {
      wallets.push(new ShieldWalletAdapter());
    } catch (e) {
      console.debug('Shield Wallet not available');
    }
    try {
      wallets.push(new SoterWalletAdapter());
    } catch (e) {
      console.debug('Soter Wallet not available');
    }
    return wallets;
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <SuiClientProvider networks={{ mainnet: { url: getFullnodeUrl('mainnet') } }} defaultNetwork="mainnet">
        <SuiWalletProvider autoConnect={true}>
          <SolanaConnectionProvider endpoint={rpcConfig['solana'] ?? ''}>
            <SolanaWalletProvider wallets={solanaWallets} autoConnect>
              <AleoWalletProvider
                wallets={aleoWallets}
                network={AleoNetwork.TESTNET3}
                autoConnect={true}
                decryptPermission={DecryptPermission.NoDecrypt}
              >
                <Hydrate />
                {children}
              </AleoWalletProvider>
            </SolanaWalletProvider>
          </SolanaConnectionProvider>
        </SuiWalletProvider>
      </SuiClientProvider>
    </WagmiProvider>
  );
};

reconnectIcon();
// reconnectInjective();
reconnectStellar();
reconnectAleo();
