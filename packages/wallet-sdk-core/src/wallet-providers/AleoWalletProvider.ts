import {
  Account,
  AleoNetworkClient,
  ProgramManager,
  AleoKeyProvider,
  NetworkRecordProvider,
  type RecordPlaintext,
} from '@provablehq/sdk';

import type {
  IAleoWalletProvider,
  AleoExecuteOptions,
  AleoExecutionResult,
  AleoTransactionReceipt,
  AleoWaitForReceiptOptions,
  AleoWalletAdapter,
} from '@sodax/types';

export type { RecordPlaintext };

export type AleoNetwork = 'mainnet' | 'testnet';

export type PrivateKeyAleoWalletConfig = {
  rpcUrl: string;
  privateKey: string;
  network?: AleoNetwork;
};

export type SeedAleoWalletConfig = {
  rpcUrl: string;
  seed: Uint8Array;
  network?: AleoNetwork;
};

export type BrowserExtensionAleoWalletConfig = {
  rpcUrl: string;
  networkClient: AleoNetworkClient;
  walletAdapter: AleoWalletAdapter;
};

export type AleoWalletConfig = 
  | PrivateKeyAleoWalletConfig 
  | SeedAleoWalletConfig 
  | BrowserExtensionAleoWalletConfig;

export type PkAleoWallet = {
  type: 'privateKey';
  account: Account;
};

export type BrowserExtensionAleoWallet = {
  type: 'browserExtension';
  adapter: AleoWalletAdapter;
};

export type AleoWallet = PkAleoWallet | BrowserExtensionAleoWallet;

export function isPrivateKeyConfig(config: AleoWalletConfig): config is PrivateKeyAleoWalletConfig {
  return 'privateKey' in config && typeof config.privateKey === 'string';
}

export function isSeedConfig(config: AleoWalletConfig): config is SeedAleoWalletConfig {
  return 'seed' in config && config.seed instanceof Uint8Array;
}

export function isBrowserExtensionConfig(config: AleoWalletConfig): config is BrowserExtensionAleoWalletConfig {
  return 'walletAdapter' in config && 'networkClient' in config;
}

export function isPkAleoWallet(wallet: AleoWallet): wallet is PkAleoWallet {
  return wallet.type === 'privateKey';
}

export function isBrowserExtensionAleoWallet(wallet: AleoWallet): wallet is BrowserExtensionAleoWallet {
  return wallet.type === 'browserExtension';
}

const ALEO_ERROR_CODES = {
  INVALID_CONFIG: 'INVALID_CONFIG',
  EXECUTION_ERROR: 'EXECUTION_ERROR',
  TX_TIMEOUT: 'TX_TIMEOUT',
  TX_REJECTED: 'TX_REJECTED',
  INVALID_TX_ID: 'INVALID_TX_ID',
  BROWSER_WALLET_UNSUPPORTED: 'BROWSER_WALLET_UNSUPPORTED',
} as const;

export class AleoWalletError extends Error {
  constructor(
    message: string,
    public readonly code: keyof typeof ALEO_ERROR_CODES,
  ) {
    super(message);
    this.name = 'AleoWalletError';
  }
}

export class AleoWalletProvider implements IAleoWalletProvider {
  private readonly networkClient: AleoNetworkClient;
  private readonly wallet: AleoWallet;
  private readonly programManager: ProgramManager;
  private readonly keyProvider: AleoKeyProvider;

  constructor(config: AleoWalletConfig) {
    this.keyProvider = new AleoKeyProvider();
    this.keyProvider.useCache(true);

    if (isPrivateKeyConfig(config)) {
      this.networkClient = new AleoNetworkClient(config.rpcUrl);
      const account = new Account({ privateKey: config.privateKey });
      
      this.wallet = { type: 'privateKey', account };

      const recordProvider = new NetworkRecordProvider(account, this.networkClient);
      
      this.programManager = new ProgramManager(config.rpcUrl, this.keyProvider, recordProvider);
      this.programManager.setAccount(account);
    } else if (isSeedConfig(config)) {
      this.networkClient = new AleoNetworkClient(config.rpcUrl);
      const account = new Account({ seed: config.seed });
      
      this.wallet = { type: 'privateKey', account };

      const recordProvider = new NetworkRecordProvider(account, this.networkClient);
      this.programManager = new ProgramManager(config.rpcUrl, this.keyProvider, recordProvider);
      this.programManager.setAccount(account);
    } else if (isBrowserExtensionConfig(config)) {
      this.networkClient = config.networkClient;
      this.wallet = { type: 'browserExtension', adapter: config.walletAdapter };

      // For browser wallets, program manager has limited capabilities
      // (can't access private key directly)
      this.programManager = new ProgramManager(
        config.rpcUrl,
        this.keyProvider,
        undefined, // No record provider for browser wallets
      );
    } else {
      throw new AleoWalletError('Invalid wallet configuration', 'INVALID_CONFIG');
    }
  }

  async getWalletAddress(): Promise<string> {
    if (isPkAleoWallet(this.wallet)) {
      return this.wallet.account.address().to_string();
    }

    if (isBrowserExtensionAleoWallet(this.wallet)) {
      return this.wallet.adapter.getAddress();
    }

    throw new AleoWalletError('Invalid wallet configuration', 'INVALID_CONFIG');
  }

  async execute(options: AleoExecuteOptions): Promise<AleoExecutionResult> {
    const { programName, functionName, inputs, priorityFee = 0, privateFee = false, feeRecord } = options;

    if (isPkAleoWallet(this.wallet)) {
      try {
        // Execute via ProgramManager (requires feeRecord cast to SDK type)
        const txId = await this.programManager.execute({
          programName,
          functionName,
          priorityFee,
          privateFee,
          inputs,
          feeRecord: feeRecord as string | RecordPlaintext | undefined,
          privateKey: this.wallet.account.privateKey(),
          keySearchParams: { cacheKey: `${programName}:${functionName}` },
        });

        return {
          transactionId: txId,
          outputs: undefined,
        };
      } catch (error) {
        throw new AleoWalletError(
          error instanceof Error ? error.message : 'Execution failed',
          'EXECUTION_ERROR'
        );
      }
    }

    if (isBrowserExtensionAleoWallet(this.wallet)) {
      if (this.wallet.adapter.executeTransaction) {
        try {
          const txId = await this.wallet.adapter.executeTransaction({
            programName,
            functionName,
            inputs,
            priorityFee,
          });

          return {
            transactionId: txId,
            outputs: undefined,
          };
        } catch (error) {
          throw new AleoWalletError(
            error instanceof Error ? error.message : 'Browser wallet execution failed',
            'EXECUTION_ERROR'
          );
        }
      }

      throw new AleoWalletError(
        'Browser wallet execution not yet implemented. ' +
        'The wallet adapter must implement executeTransaction() or handle authorization internally.',
        'BROWSER_WALLET_UNSUPPORTED'
      );
    }

    throw new AleoWalletError('Invalid wallet configuration', 'INVALID_CONFIG');
  }

  async waitForTransactionReceipt(
    transactionId: string,
    options: AleoWaitForReceiptOptions = {}
  ): Promise<AleoTransactionReceipt> {
    const {
      checkInterval = 2000,
      timeout = 45000,
    } = options;

    try {
      const confirmedTx = await this.networkClient.waitForTransactionConfirmation(
        transactionId,
        checkInterval,
        timeout,
      );

      return {
        transactionId,
        status: confirmedTx.status as 'accepted' | 'rejected',
        type: confirmedTx.type,
        index: confirmedTx.index,
        transaction: confirmedTx.transaction,
        finalize: confirmedTx.finalize,
        confirmedAt: new Date(),
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('did not appear')) {
          throw new AleoWalletError(
            `Transaction ${transactionId} did not confirm within ${timeout}ms. ` +
            `The transaction may still be pending - check the transaction status manually.`,
            'TX_TIMEOUT'
          );
        }
        if (error.message.includes('Malformed') || error.message.includes('Invalid URL')) {
          throw new AleoWalletError(
            `Invalid transaction ID format: ${transactionId}. ` +
            `Please verify the transaction ID is correct.`,
            'INVALID_TX_ID'
          );
        }
        if (error.message.includes('rejected')) {
          throw new AleoWalletError(
            `Transaction ${transactionId} was rejected by the network. ` +
            `Check that the fee payer has sufficient credits and inputs are valid.`,
            'TX_REJECTED'
          );
        }
      }
      
      throw error;
    }
  }

  async executeAndWait(
    options: AleoExecuteOptions,
    receiptOptions?: AleoWaitForReceiptOptions
  ): Promise<{ result: AleoExecutionResult; receipt: AleoTransactionReceipt }> {
    const result = await this.execute(options);
    const receipt = await this.waitForTransactionReceipt(result.transactionId, receiptOptions);
    
    return { result, receipt };
  }

  getNetworkClient(): AleoNetworkClient {
    return this.networkClient;
  }

  getProgramManager(): ProgramManager {
    return this.programManager;
  }
}