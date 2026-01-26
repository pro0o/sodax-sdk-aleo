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
} from '@sodax/types';

import type {
  Account as ProvableAccount,
  TransactionOptions as ProvableTransactionOptions,
} from '@provablehq/aleo-types';

import type { BaseAleoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-core';

export type { RecordPlaintext };
export type AleoNetwork = 'mainnet' | 'testnet';
export type PrivateKeyAleoWalletConfig = {
  type: 'privateKey';
  rpcUrl: string;
  privateKey: string;
  network?: AleoNetwork;
};

export type SeedAleoWalletConfig = {
  type: 'seed';
  rpcUrl: string;
  seed: Uint8Array;
  network?: AleoNetwork;
};

export type BrowserExtensionAleoWalletConfig = {
  type: 'browserExtension';
  rpcUrl: string;
  provableAdapter: BaseAleoWalletAdapter;
  network?: AleoNetwork;
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
  adapter: BaseAleoWalletAdapter;
  connectedAccount: ProvableAccount | null;
};

export type AleoWallet = PkAleoWallet | BrowserExtensionAleoWallet;

export function isPrivateKeyConfig(config: AleoWalletConfig): config is PrivateKeyAleoWalletConfig {
  return config.type === 'privateKey';
}

export function isSeedConfig(config: AleoWalletConfig): config is SeedAleoWalletConfig {
  return config.type === 'seed';
}

export function isBrowserExtensionConfig(config: AleoWalletConfig): config is BrowserExtensionAleoWalletConfig {
  return config.type === 'browserExtension';
}

export function isPkAleoWallet(wallet: AleoWallet): wallet is PkAleoWallet {
  return wallet.type === 'privateKey';
}

export function isBrowserExtensionAleoWallet(wallet: AleoWallet): wallet is BrowserExtensionAleoWallet {
  return wallet.type === 'browserExtension';
}

export class AleoWalletProvider implements IAleoWalletProvider {
  public readonly networkClient: AleoNetworkClient;
  public readonly wallet: AleoWallet;
  public readonly programManager: ProgramManager;
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
      this.networkClient = new AleoNetworkClient(config.rpcUrl);
      
      this.wallet = { 
        type: 'browserExtension', 
        adapter: config.provableAdapter,
        connectedAccount: null,
      };

      this.programManager = new ProgramManager(
        config.rpcUrl,
        this.keyProvider,
        undefined, // No record provider for browser wallets
      );
    } else {
      throw new Error('Invalid wallet configuration');
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

  async getWalletAddress(): Promise<string> {
    if (isPkAleoWallet(this.wallet)) {
      return this.wallet.account.address().to_string();
    }

    if (isBrowserExtensionAleoWallet(this.wallet)) {
      if (!this.wallet.adapter.connected || !this.wallet.connectedAccount) {
        throw new Error('Browser wallet not connected');
      }
      return this.wallet.connectedAccount.address;
    }

    throw new Error('Invalid wallet configuration');
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
        throw new Error(error instanceof Error ? error.message : 'Execution failed');
      }
    }

    if (isBrowserExtensionAleoWallet(this.wallet)) {
      if (!this.wallet.adapter.connected || !this.wallet.connectedAccount) {
        throw new Error('Browser wallet not connected');
      }

      try {
        const provableOptions: ProvableTransactionOptions = {
          program: programName,
          function: functionName,
          inputs,
          fee: priorityFee || 0.001,
          privateFee: privateFee || false,
        };

        const result = await this.wallet.adapter.executeTransaction(provableOptions);

        if (!result?.transactionId) {
          throw new Error('No transaction ID returned from browser wallet');
        }

        return {
          transactionId: result.transactionId,
          outputs: undefined,
        };
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Browser wallet execution failed');
      }
    }

    throw new Error('Invalid wallet configuration');
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
          throw new Error(
            `Transaction ${transactionId} did not confirm within ${timeout}ms. ` +
            `The transaction may still be pending - check the transaction status manually.`
          );
        }
        if (error.message.includes('Malformed') || error.message.includes('Invalid URL')) {
          throw new Error(
            `Invalid transaction ID format: ${transactionId}. ` +
            `Please verify the transaction ID is correct.`
          );
        }
        if (error.message.includes('rejected')) {
          throw new Error(
            `Transaction ${transactionId} was rejected by the network. ` +
            `Check that the fee payer has sufficient credits and inputs are valid.`
          );
        }
      }
      
      throw error;
    }
  }
}