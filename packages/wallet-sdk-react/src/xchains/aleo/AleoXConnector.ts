import type { XAccount } from '@/types';
import { XConnector } from '@/core';
import type { WalletAdapter } from '@provablehq/aleo-wallet-standard';
import { WalletDecryptPermission } from '@provablehq/aleo-wallet-standard';
import { Network } from '@provablehq/aleo-types';
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
    return this.connectWithOptions(Network.TESTNET, WalletDecryptPermission.NoDecrypt, []);
  }

  async connectWithOptions(
    network: Network = Network.TESTNET,
    decryptPermission: WalletDecryptPermission = WalletDecryptPermission.NoDecrypt,
    programs: string[] = []
  ): Promise<XAccount | undefined> {
    try {
      await this.wallet.connect(network, decryptPermission, programs);
      
      if (this.wallet.account?.address) {
        return {
          address: this.wallet.account.address,
          xChainType: 'ALEO',
        };
      }
      
      return undefined;
    } catch (e) {
      console.log('error', e);
      throw e;
    }
  }

  async disconnect(): Promise<void> {
    await this.wallet.disconnect();
  }

  public get icon(): string {
    return this.wallet.icon || '';
  }

  public get readyState() {
    return this.wallet.readyState;
  }
}
