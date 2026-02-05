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
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';
import { Network } from '@provablehq/aleo-types';

import type { RpcConfig } from '@sodax/types';

import { Hydrate } from './Hydrate';
import { createWagmiConfig } from './xchains/evm/EvmXService';
import { reconnectIcon } from './xchains/icon/actions';
// import { reconnectInjective } from './xchains/injective/actions';
import { reconnectStellar } from './xchains/stellar/actions';

export const SodaxWalletProvider = ({ children, rpcConfig }: { children: React.ReactNode; rpcConfig: RpcConfig }) => {
  const wagmiConfig = useMemo(() => {
    return createWagmiConfig(rpcConfig);
  }, [rpcConfig]);

  const solanaWallets = useMemo(() => [new UnsafeBurnerWalletAdapter()], []);

  const aleoWallets = useMemo(
    () => [
      new LeoWalletAdapter(),
      new FoxWalletAdapter(),
      new PuzzleWalletAdapter(),
      new ShieldWalletAdapter(),
      new SoterWalletAdapter(),
    ],
    [],
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <SuiClientProvider networks={{ mainnet: { url: getFullnodeUrl('mainnet') } }} defaultNetwork="mainnet">
        <SuiWalletProvider autoConnect={true}>
          <SolanaConnectionProvider endpoint={rpcConfig['solana'] ?? ''}>
            <SolanaWalletProvider wallets={solanaWallets} autoConnect>
              <AleoWalletProvider
                wallets={aleoWallets}
                autoConnect={true}
                network={Network.TESTNET3}
                decryptPermission={DecryptPermission.NoDecrypt}
                programs={[]}
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
