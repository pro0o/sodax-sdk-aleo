import { useCallback, useMemo } from 'react';
import { AleoXService } from '@/xchains/aleo/AleoXService';
import { AleoXConnector } from '@/xchains/aleo/AleoXConnector';
import { useXWagmiStore } from '@/useXWagmiStore';
import type { AleoExecuteOptions, AleoExecutionResult, ChainType } from '@sodax/types';
import type { BaseAleoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-core';
import { Network, type TransactionOptions } from '@provablehq/aleo-types';

export interface UseAleoWalletReturn {
  /** Current wallet address */
  address: string | undefined;
  /** Whether wallet is connected */
  connected: boolean;
  /** Current network */
  network: Network;
  /** Connect to wallet */
  connect: (adapter: BaseAleoWalletAdapter, network?: Network) => Promise<void>;
  /** Disconnect from wallet */
  disconnect: () => Promise<void>;
  /** Execute a transaction */
  execute: (options: AleoExecuteOptions) => Promise<AleoExecutionResult | undefined>;
  /** Execute via adapter directly */
  executeTransaction: (options: TransactionOptions) => Promise<{ transactionId: string } | undefined>;
  /** Get credits balance */
  getBalance: () => Promise<bigint>;
  /** The Aleo service instance */
  service: AleoXService;
}

/**
 * Hook for Aleo wallet interactions
 * 
 * @example
 * ```tsx
 * import { useAleoWallet } from '@sodax/wallet-sdk-react';
 * import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
 * import { Network } from '@provablehq/aleo-types';
 * 
 * function MyComponent() {
 *   const { address, connected, connect, disconnect, execute } = useAleoWallet();
 *   
 *   const handleConnect = async () => {
 *     await connect(new LeoWalletAdapter(), Network.TESTNET);
 *   };
 *   
 *   const handleTransfer = async () => {
 *     const result = await execute({
 *       programName: 'credits.aleo',
 *       functionName: 'transfer_public',
 *       inputs: ['aleo1...', '1000000u64'],
 *     });
 *   };
 * }
 * ```
 */
export function useAleoWallet(): UseAleoWalletReturn {
  const service = useMemo(() => AleoXService.getInstance(), []);
  const setXConnection = useXWagmiStore(state => state.setXConnection);
  const unsetXConnection = useXWagmiStore(state => state.unsetXConnection);
  const xConnections = useXWagmiStore(state => state.xConnections);

  const address = useMemo(() => {
    const aleoConnection = xConnections['ALEO' as ChainType];
    return aleoConnection?.xAccount?.address ?? service.getAddress();
  }, [xConnections, service]);

  const connected = useMemo(() => {
    return !!address || service.isConnected();
  }, [address, service]);

  const network = service.network;

  const connect = useCallback(async (
    adapter: BaseAleoWalletAdapter,
    network: Network = Network.TESTNET
  ): Promise<void> => {
    console.log('[useAleoWallet] Connect called with network:', network);
    console.log('[useAleoWallet] Adapter:', { name: adapter.name, connected: adapter.connected });
    
    service.setNetwork(network);
    
    // Initialize network client with testnet RPC
    const rpcUrl = network === Network.MAINNET 
      ? 'https://api.explorer.aleo.org/v1'
      : 'https://api.explorer.provable.com/v1';
    console.log('[useAleoWallet] Setting network client RPC:', rpcUrl);
    service.setNetworkClient(rpcUrl);
    
    const connector = new AleoXConnector(adapter, network);
    console.log('[useAleoWallet] Created connector:', { 
      id: connector.id, 
      programs: (connector as any).programs 
    });
    
    const xAccount = await connector.connect();
    console.log('[useAleoWallet] Connection result:', xAccount);
    
    if (xAccount) {
      // Register connector with service (keep existing + add new)
      const existingConnectors = service.getXConnectors();
      console.log('[useAleoWallet] Existing connectors:', existingConnectors.length);
      
      service.setXConnectors([...existingConnectors, connector]);
      console.log('[useAleoWallet] Registered connector, total:', service.getXConnectors().length);
      
      setXConnection('ALEO' as ChainType, {
        xAccount,
        xConnectorId: connector.id,
      });
      console.log('[useAleoWallet] Connection complete!');
    }
  }, [service, setXConnection]);

  const disconnect = useCallback(async (): Promise<void> => {
    // Disconnect adapter if exists
    const connectors = service.getXConnectors();
    const connector = connectors[0] as AleoXConnector | undefined;
    if (connector) {
      await connector.disconnect();
    }
    
    // Clear service state
    service.clearConnectedAccount();
    service.setXConnectors([]);
    
    unsetXConnection('ALEO' as ChainType);
  }, [service, unsetXConnection]);

  const execute = useCallback(async (
    options: AleoExecuteOptions
  ): Promise<AleoExecutionResult | undefined> => {
    console.log('[useAleoWallet] Execute called with options:', options);
    
    const account = service.connectedAccount;
    console.log('[useAleoWallet] Connected account:', account);
    
    if (!account) {
      throw new Error('Wallet not connected');
    }

    // Get the current connector from service
    const connectors = service.getXConnectors();
    console.log('[useAleoWallet] Available connectors:', connectors.length);
    
    const connector = connectors[0] as AleoXConnector | undefined;
    console.log('[useAleoWallet] Selected connector:', {
      exists: !!connector,
      adapter: !!connector?.adapter,
      adapterConnected: connector?.adapter?.connected,
      adapterName: connector?.adapter?.name,
      programs: (connector as any)?.programs,
    });
    
    if (!connector?.adapter) {
      throw new Error('No wallet adapter found');
    }

    try {
      const txOptions = {
        program: options.programName,
        function: options.functionName,
        inputs: options.inputs,
        fee: options.priorityFee ?? 100000, // Default: 0.1 credits in microcredits
        privateFee: options.privateFee ?? false,
      };
      console.log('[useAleoWallet] Executing transaction with options:', txOptions);
      
      const result = await connector.adapter.executeTransaction(txOptions);
      console.log('[useAleoWallet] Transaction result:', result);

      if (!result?.transactionId) {
        throw new Error('Transaction failed - no transaction ID returned');
      }
      const temporaryTxId = result.transactionId;
      console.log('[useAleoWallet] Temporary transaction ID:', temporaryTxId);
      console.log('[useAleoWallet] Polling for actual on-chain transaction ID...');

      // Poll for the actual transaction ID
      let actualTxId = temporaryTxId;
      const maxAttempts = 30; // Poll for up to 30 seconds
      const pollInterval = 1000; // 1 second
      
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          console.log(`[useAleoWallet] Polling attempt ${attempt + 1}/${maxAttempts}...`);
          const status = await connector.adapter.transactionStatus(temporaryTxId);
          console.log('[useAleoWallet] Transaction status:', status);
          
          if (status.transactionId && status.transactionId.startsWith('at1')) {
            actualTxId = status.transactionId;
            console.log('[useAleoWallet] Got actual transaction ID:', actualTxId);
            break;
          }
          
          if (status.status === 'failed' || status.status === 'rejected') {
            throw new Error(`Transaction ${status.status}: ${status.error || 'Unknown error'}`);
          }
          
          // Wait before next poll
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        } catch (pollError) {
          console.warn('[useAleoWallet] Polling error:', pollError);
          // Continue polling even if status check fails
        }
      }

      if (actualTxId === temporaryTxId && actualTxId.length < 61) {
        console.warn('[useAleoWallet] Could not get actual transaction ID, using temporary ID');
      }

      return {
        transactionId: actualTxId,
        outputs: undefined,
      };
    } catch (error) {
      console.error('[useAleoWallet] Transaction execution failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check for permissions error
      if (errorMessage.includes('No permissions set for any program IDs')) {
        throw new Error(
          'Missing wallet permissions for credits.aleo. Please disconnect and reconnect your wallet to grant permissions.'
        );
      }
      
      throw error;
    }
  }, [service]);

  const executeTransaction = useCallback(async (
    options: TransactionOptions
  ): Promise<{ transactionId: string } | undefined> => {
    const connectors = service.getXConnectors();
    const connector = connectors[0] as AleoXConnector | undefined;
    
    if (!connector?.adapter) {
      throw new Error('No wallet adapter found');
    }

    try {
      return await connector.adapter.executeTransaction(options);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check for permissions error
      if (errorMessage.includes('No permissions set for any program IDs')) {
        throw new Error(
          'Missing wallet permissions for credits.aleo. Please disconnect and reconnect your wallet to grant permissions.'
        );
      }
      
      throw error;
    }
  }, [service]);

  const getBalance = useCallback(async (): Promise<bigint> => {
    if (!address) return BigInt(0);
    return service.getCreditsBalance(address);
  }, [address, service]);

  return {
    address,
    connected,
    network,
    connect,
    disconnect,
    execute,
    executeTransaction,
    getBalance,
    service,
  };
}
