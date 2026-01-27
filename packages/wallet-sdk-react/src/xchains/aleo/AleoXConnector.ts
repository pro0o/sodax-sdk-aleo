import type { XAccount } from '@/types';
import { XConnector } from '@/core';
import type { WalletAdapter } from '@provablehq/aleo-wallet-standard';
import { WalletDecryptPermission } from '@provablehq/aleo-wallet-standard';
import { Network } from '@provablehq/aleo-types';
import { AleoXService } from './AleoXService';

export class AleoXConnector extends XConnector {
  private adapter: WalletAdapter;

  constructor(adapter: WalletAdapter) {
    super('ALEO', adapter.name, adapter.name);
    this.adapter = adapter;
  }

  getXService(): AleoXService {
    return AleoXService.getInstance();
  }

  async connect(): Promise<XAccount | undefined> {
    return this.connectWithOptions(Network.TESTNET, WalletDecryptPermission.NoDecrypt);
  }

  async connectWithOptions(
    network: Network = Network.TESTNET,
    decryptPermission: WalletDecryptPermission = WalletDecryptPermission.NoDecrypt,
    programs?: string[]
  ): Promise<XAccount | undefined> {
    if (!this.isWalletInstalled()) {
      console.warn(`[AleoXConnector] ${this.adapter.name} is not installed`);
      return undefined;
    }

    try {
      await this.adapter.connect(network, decryptPermission, programs);
      
      if (this.adapter.account?.address) {
        return {
          address: this.adapter.account.address,
          xChainType: 'ALEO',
        };
      }
      
      return undefined;
    } catch (error) {
      console.error(`[AleoXConnector] Connection failed for ${this.adapter.name}:`, error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.adapter.disconnect();
    } catch (error) {
      console.error(`[AleoXConnector] Disconnect failed for ${this.adapter.name}:`, error);
      throw error;
    }
  }

  private isWalletInstalled(): boolean {
    return this.adapter.readyState === 'Installed';
  }

  public get icon(): string {
    return this.adapter.icon || '';
  }

  public get connected(): boolean {
    return this.adapter.connected;
  }

  public get readyState() {
    return this.adapter.readyState;
  }

  public get walletAdapter(): WalletAdapter {
    return this.adapter;
  }

  public get url(): string | undefined {
    return this.adapter.url;
  }

  public get account() {
    return this.adapter.account;
  }

  public get network() {
    return this.adapter.network;
  }
}
