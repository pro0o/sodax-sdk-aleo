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
    service.setNetwork(network);
    
    const connector = new AleoXConnector(adapter, network);
    const xAccount = await connector.connect();
    
    if (xAccount) {
      setXConnection('ALEO' as ChainType, {
        xAccount,
        xConnectorId: connector.id,
      });
    }
  }, [service, setXConnection]);

  const disconnect = useCallback(async (): Promise<void> => {
    service.clearConnectedAccount();
    unsetXConnection('ALEO' as ChainType);
  }, [service, unsetXConnection]);

  const execute = useCallback(async (
    options: AleoExecuteOptions
  ): Promise<AleoExecutionResult | undefined> => {
    const account = service.connectedAccount;
    if (!account) {
      throw new Error('Wallet not connected');
    }

    // Get the current connector from service
    const connectors = service.getXConnectors();
    const connector = connectors[0] as AleoXConnector | undefined;
    
    if (!connector?.adapter) {
      throw new Error('No wallet adapter found');
    }

    const result = await connector.adapter.executeTransaction({
      program: options.programName,
      function: options.functionName,
      inputs: options.inputs,
      fee: options.priorityFee ?? 0.001,
      privateFee: options.privateFee ?? false,
    });

    if (!result?.transactionId) {
      throw new Error('Transaction failed - no transaction ID returned');
    }

    return {
      transactionId: result.transactionId,
      outputs: undefined,
    };
  }, [service]);

  const executeTransaction = useCallback(async (
    options: TransactionOptions
  ): Promise<{ transactionId: string } | undefined> => {
    const connectors = service.getXConnectors();
    const connector = connectors[0] as AleoXConnector | undefined;
    
    if (!connector?.adapter) {
      throw new Error('No wallet adapter found');
    }

    return connector.adapter.executeTransaction(options);
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
