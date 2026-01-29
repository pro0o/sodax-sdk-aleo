import type { XAccount } from '@/types';
import { XConnector } from '@/core';
import type { WalletAdapter } from '@provablehq/aleo-wallet-standard';
import { WalletDecryptPermission } from '@provablehq/aleo-wallet-standard';
import { Network } from '@provablehq/aleo-types';
import { AleoXService } from './AleoXService';

export class AleoXConnector extends XConnector {
  public adapter: WalletAdapter;
  private defaultNetwork: Network = Network.TESTNET3;
  private defaultDecryptPermission: WalletDecryptPermission = WalletDecryptPermission.NoDecrypt;

  constructor(adapter: WalletAdapter) {
    super('ALEO', adapter.name, adapter.name);
    this.adapter = adapter;
  }

  getXService(): AleoXService {
    return AleoXService.getInstance();
  }

  async connect(): Promise<XAccount | undefined> {
    try {
      const account = await this.adapter.connect(this.defaultNetwork, this.defaultDecryptPermission);
      
      if (!account?.address) {
        return undefined;
      }

      return {
        address: account.address,
        xChainType: this.xChainType,
      };
    } catch (error) {
      console.error('Aleo wallet connection error:', error);
      return undefined;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.adapter.disconnect();
    } catch (error) {
      console.error('Aleo wallet disconnection error:', error);
    }
  }

  public get icon() {
    return this.adapter.icon;
  }
}
