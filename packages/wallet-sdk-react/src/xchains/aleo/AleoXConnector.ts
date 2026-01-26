import type { XAccount } from '@/types';
import { XConnector } from '@/core/XConnector';
import type { BaseAleoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-core';
import { Network } from '@provablehq/aleo-types';
import { WalletDecryptPermission } from '@provablehq/aleo-wallet-standard';
import { AleoXService } from './AleoXService';

export class AleoXConnector extends XConnector {
  adapter: BaseAleoWalletAdapter;
  private network: Network;

  constructor(adapter: BaseAleoWalletAdapter, network: Network = Network.TESTNET) {
    super('ALEO' as const, adapter.name, adapter.name);
    this.adapter = adapter;
    this.network = network;
  }

  getXService(): AleoXService {
    return AleoXService.getInstance();
  }

  async connect(): Promise<XAccount | undefined> {
    try {
      const account = await this.adapter.connect(this.network, WalletDecryptPermission.UponRequest);
      
      if (account?.address) {
        const xAccount: XAccount = {
          address: account.address,
          xChainType: 'ALEO' as const,
        };
        
        // Store connected state in service
        const service = this.getXService();
        service.setConnectedAccount(account);
        
        return xAccount;
      }
      return undefined;
    } catch (error) {
      console.error('Aleo wallet connection failed:', error);
      return undefined;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.adapter.disconnect();
      const service = this.getXService();
      service.clearConnectedAccount();
    } catch (error) {
      console.error('Aleo wallet disconnection failed:', error);
    }
  }

  public get icon(): string | undefined {
    return this.adapter.icon;
  }

  public get connected(): boolean {
    return this.adapter.connected;
  }
}
