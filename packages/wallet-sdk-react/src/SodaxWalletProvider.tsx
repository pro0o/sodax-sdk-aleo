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
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';
import { Network } from '@provablehq/aleo-types';
import { getAleoWallets } from './xchains/aleo/utils';

import type { RpcConfig } from '@sodax/types';

import { Hydrate } from './Hydrate';
import { createWagmiConfig } from './xchains/evm/EvmXService';
import { reconnectIcon } from './xchains/icon/actions';
import { reconnectStellar } from './xchains/stellar/actions';
import { reconnectAleo } from './xchains/aleo/actions';

export const SodaxWalletProvider = ({ 
  children, 
  rpcConfig,
  aleoNetwork = Network.TESTNET,
  aleoAutoConnect = false,
}: { 
  children: React.ReactNode; 
  rpcConfig: RpcConfig;
  aleoNetwork?: Network;
  aleoAutoConnect?: boolean;
}) => {
  const wagmiConfig = useMemo(() => {
    return createWagmiConfig(rpcConfig);
  }, [rpcConfig]);

  const wallets = useMemo(() => [new UnsafeBurnerWalletAdapter()], []);
  const aleoWallets = useMemo(() => getAleoWallets(), []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <SuiClientProvider networks={{ mainnet: { url: getFullnodeUrl('mainnet') } }} defaultNetwork="mainnet">
        <SuiWalletProvider autoConnect={true}>
          <SolanaConnectionProvider endpoint={rpcConfig['solana'] ?? ''}>
            <SolanaWalletProvider wallets={wallets} autoConnect>
              <AleoWalletProvider
                wallets={aleoWallets}
                autoConnect={aleoAutoConnect}
                network={aleoNetwork}
                decryptPermission={DecryptPermission.UponRequest}
                programs={['credits.aleo']}
                onError={(error) => {
                  console.error('[Aleo Wallet]', error);
                }}
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
reconnectStellar();
reconnectAleo();
