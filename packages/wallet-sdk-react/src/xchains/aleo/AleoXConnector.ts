import type { XAccount } from '@/types';
import { XConnector } from '@/core';
import type { WalletAdapter } from '@provablehq/aleo-wallet-standard';
import { AleoXService } from './AleoXService';

export class AleoXConnector extends XConnector {
  wallet: WalletAdapter;

  constructor(wallet: WalletAdapter) {
    super('ALEO', wallet.name, wallet.name);
    this.wallet = wallet;
  }

  getXService(): AleoXService {
    return AleoXService.getInstance();
  }

  async connect(): Promise<XAccount | undefined> {
    if (this.wallet.connected && this.wallet.account?.address) {
      return {
        address: this.wallet.account.address,
        xChainType: 'ALEO',
      };
    }
    return undefined;
  }

  async disconnect(): Promise<void> {
    await this.wallet.disconnect();
  }

  public get icon(): string {
    return this.wallet.icon || '';
  }
}
