import { useCallback, useMemo } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import type { 
  Network, 
  TransactionOptions, 
  TransactionStatusResponse, 
  TxHistoryResult 
} from '@provablehq/aleo-types';
import type { 
  WalletName, 
  AleoDeployment 
} from '@provablehq/aleo-wallet-standard';
import { AleoXService } from '../AleoXService';
import { getAleoConnectors } from '../utils';
import type { AleoXConnector } from '../AleoXConnector';

export interface UseAleoWalletReturn {
  address: string | null;
  connected: boolean;
  connecting: boolean;
  disconnecting: boolean;
  network: Network | null;
  
  connectors: AleoXConnector[];
  currentConnector: AleoXConnector | null;
  
  selectWallet: (name: WalletName) => void;
  connect: (network: Network) => Promise<void>;
  disconnect: () => Promise<void>;
  
  executeTransaction: (options: TransactionOptions) => Promise<{ transactionId: string } | undefined>;
  transactionStatus: (transactionId: string) => Promise<TransactionStatusResponse>;
  signMessage: (message: Uint8Array | string) => Promise<Uint8Array | undefined>;
  
  switchNetwork: (network: Network) => Promise<boolean>;
  
  decrypt: (cipherText: string) => Promise<string>;
  requestRecords: (program: string, includePlaintext?: boolean) => Promise<unknown[]>;
  executeDeployment: (deployment: AleoDeployment) => Promise<{ transactionId: string }>;
  requestTransactionHistory: (program: string) => Promise<TxHistoryResult>;
  
  getBalance: () => Promise<bigint>;
  
  service: AleoXService;
}

/**
 * Hook for interacting with Aleo wallets
 * 
 * This hook provides a unified interface for all Aleo wallet operations,
 * including multi-wallet support, transactions, and balance queries.
 * 
 * @returns UseAleoWalletReturn object with wallet state and operations
 * 
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { 
 *     address, 
 *     connected, 
 *     connectors,
 *     connect, 
 *     disconnect,
 *     getBalance 
 *   } = useAleoWallet();
 * 
 *   const handleConnect = async () => {
 *     await connect(Network.TESTNET);
 *   };
 * 
 *   return (
 *     <div>
 *       {connected ? (
 *         <p>Connected: {address}</p>
 *       ) : (
 *         <button onClick={handleConnect}>Connect Wallet</button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAleoWallet(): UseAleoWalletReturn {
  const service = useMemo(() => AleoXService.getInstance(), []);
  const wallet = useWallet();
  
  // Create connectors for all available wallets
  const connectors = useMemo(() => getAleoConnectors(), []);
  
  // Find the currently active connector
  const currentConnector = useMemo(() => {
    if (!wallet.wallet) return null;
    return connectors.find(c => c.walletAdapter.name === wallet.wallet?.adapter.name) || null;
  }, [connectors, wallet.wallet]);
  
  // Get balance for the connected wallet
  const getBalance = useCallback(async (): Promise<bigint> => {
    if (!wallet.address) return BigInt(0);
    return service.getCreditsBalance(wallet.address);
  }, [wallet.address, service]);

  return {
    // Wallet state
    address: wallet.address,
    connected: wallet.connected,
    connecting: wallet.connecting,
    disconnecting: wallet.disconnecting,
    network: wallet.network,
    
    // SDK-aligned connector interface
    connectors,
    currentConnector,
    
    // Delegate to context
    selectWallet: wallet.selectWallet,
    connect: wallet.connect,
    disconnect: wallet.disconnect,
    executeTransaction: wallet.executeTransaction,
    transactionStatus: wallet.transactionStatus,
    signMessage: wallet.signMessage,
    switchNetwork: wallet.switchNetwork,
    decrypt: wallet.decrypt,
    requestRecords: wallet.requestRecords,
    executeDeployment: wallet.executeDeployment,
    requestTransactionHistory: wallet.requestTransactionHistory,
    
    getBalance,
    service,
  };
}
