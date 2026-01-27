import {
  type IAleoWalletProvider,
  type AleoExecuteOptions,
  type AleoExecutionResult,
  type AleoTransactionReceipt,
  type AleoWaitForReceiptOptions,
  type SpokeChainConfig,
} from '@sodax/types';
import type { ISpokeProvider, IRawSpokeProvider } from '../Providers.js';
import type { WalletAddressProvider } from '@sodax/types';

export class AleoBaseSpokeProvider {
  public readonly chainConfig: SpokeChainConfig;

  constructor(chainConfig: SpokeChainConfig) {
    this.chainConfig = chainConfig;
  }
}

export class AleoSpokeProvider extends AleoBaseSpokeProvider implements ISpokeProvider {
  public readonly walletProvider: IAleoWalletProvider;

  constructor(walletProvider: IAleoWalletProvider, chainConfig: SpokeChainConfig) {
    super(chainConfig);
    this.walletProvider = walletProvider;
  }

  async execute(options: AleoExecuteOptions): Promise<AleoExecutionResult> {
    return this.walletProvider.execute(options);
  }

  async waitForTransactionReceipt(
    transactionId: string,
    options?: AleoWaitForReceiptOptions
  ): Promise<AleoTransactionReceipt> {
    return this.walletProvider.waitForTransactionReceipt(transactionId, options);
  }
}

export class AleoRawSpokeProvider extends AleoBaseSpokeProvider implements IRawSpokeProvider {
  public readonly walletProvider: WalletAddressProvider;
  public readonly raw = true;

  constructor(walletAddress: string, chainConfig: SpokeChainConfig) {
    super(chainConfig);
    this.walletProvider = {
      getWalletAddress: async () => walletAddress,
    };
  }
}
