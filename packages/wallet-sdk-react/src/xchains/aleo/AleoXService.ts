import { XService } from '@/core/XService';
import type { XToken } from '@sodax/types';
import { Network, type Account } from '@provablehq/aleo-types';
import { AleoNetworkClient } from '@provablehq/sdk';
import type { BaseAleoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-core';

export class AleoXService extends XService {
  private static instance: AleoXService;

  public networkClient: AleoNetworkClient | undefined;
  public connectedAccount: Account | undefined;
  public network: Network = Network.TESTNET;
  public walletAdapter: BaseAleoWalletAdapter | undefined;
  public rpcUrl: string = 'https://api.explorer.aleo.org/v1';

  private constructor() {
    super('ALEO' as const);
  }

  public static getInstance(): AleoXService {
    if (!AleoXService.instance) {
      AleoXService.instance = new AleoXService();
    }
    return AleoXService.instance;
  }

  public setNetworkClient(rpcUrl: string): void {
    this.rpcUrl = rpcUrl;
    this.networkClient = new AleoNetworkClient(rpcUrl);
  }

  public setNetwork(network: Network): void {
    this.network = network;
  }

  public setWalletAdapter(adapter: BaseAleoWalletAdapter): void {
    this.walletAdapter = adapter;
  }

  public clearWalletAdapter(): void {
    this.walletAdapter = undefined;
  }

  public setConnectedAccount(account: Account): void {
    this.connectedAccount = account;
  }

  public clearConnectedAccount(): void {
    this.connectedAccount = undefined;
  }

  public getAddress(): string | undefined {
    return this.connectedAccount?.address;
  }

  public isConnected(): boolean {
    return !!this.connectedAccount;
  }

  async getBalance(address: string | undefined, xToken: XToken): Promise<bigint> {
    if (!address || !this.networkClient) {
      return BigInt(0);
    }

    try {
      // For native Aleo credits
      if (xToken.symbol === 'ALEO' || xToken.address === 'credits.aleo') {
        const mapping = await this.networkClient.getProgramMappingValue(
          'credits.aleo',
          'account',
          address
        );
        
        if (mapping) {
          // Parse microcredits from mapping value (format: "123456u64")
          const value = mapping.toString().replace('u64', '');
          return BigInt(value);
        }
        return BigInt(0);
      }

      // For other program tokens, query their specific mappings
      // This would need to be customized per token program
      return BigInt(0);
    } catch (error) {
      console.error('Failed to get Aleo balance:', error);
      return BigInt(0);
    }
  }

  async getCreditsBalance(address: string): Promise<bigint> {
    return this.getBalance(address, { 
      symbol: 'ALEO', 
      address: 'credits.aleo',
      decimals: 6,
      name: 'Aleo Credits'
    } as XToken);
  }
}
