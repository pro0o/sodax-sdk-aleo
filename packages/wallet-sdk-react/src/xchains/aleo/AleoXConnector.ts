import type { XAccount } from '@/types';
import { XConnector } from '@/core/XConnector';
import type { BaseAleoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-core';
import { Network } from '@provablehq/aleo-types';
import { WalletDecryptPermission } from '@provablehq/aleo-wallet-standard';
import { AleoXService } from './AleoXService';

export class AleoXConnector extends XConnector {
  adapter: BaseAleoWalletAdapter;
  private network: Network;
  private programs: string[];

  constructor(adapter: BaseAleoWalletAdapter, network: Network = Network.TESTNET, programs: string[] = ['credits.aleo']) {
    super('ALEO' as const, adapter.name, adapter.name);
    this.adapter = adapter;
    this.network = network;
    this.programs = programs;
  }

  getXService(): AleoXService {
    return AleoXService.getInstance();
  }

  async connect(): Promise<XAccount | undefined> {
    try {
      console.log('[AleoXConnector] Connect called');
      console.log('[AleoXConnector] Network:', this.network);
      console.log('[AleoXConnector] Programs:', this.programs);
      console.log('[AleoXConnector] Adapter already connected:', this.adapter.connected);
      
      if (this.adapter.connected) {
        console.log('[AleoXConnector] Disconnecting existing connection...');
        await this.adapter.disconnect();
        console.log('[AleoXConnector] Disconnected successfully');
      }
      
      console.log('[AleoXConnector] Calling adapter.connect with:', {
        network: this.network,
        decryptPermission: 'UponRequest',
        programs: this.programs,
      });
      
      const account = await this.adapter.connect(
        this.network, 
        WalletDecryptPermission.UponRequest,
        this.programs
      );
      
      console.log('[AleoXConnector] Adapter connected, account:', account);
      
      if (account?.address) {
        const xAccount: XAccount = {
          address: account.address,
          xChainType: 'ALEO' as const,
        };
        
        // Store connected state in service
        const service = this.getXService();
        service.setConnectedAccount(account);
        service.setWalletAdapter(this.adapter);
        console.log('[AleoXConnector] Account stored in service');
        
        return xAccount;
      }
      return undefined;
    } catch (error) {
      console.error('[AleoXConnector] Connection failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('No selected account')) {
        throw new Error('Please create or select an account in your Puzzle Wallet first');
      }
      if (errorMessage.includes('User rejected')) {
        throw new Error('Connection request was rejected');
      }
      
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.adapter.disconnect();
      const service = this.getXService();
      service.clearConnectedAccount();
      service.clearWalletAdapter();
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
