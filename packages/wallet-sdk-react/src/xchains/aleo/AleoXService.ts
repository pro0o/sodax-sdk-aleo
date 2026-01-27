import { XService } from '@/core/XService';
import type { XToken } from '@sodax/types';
import { Network } from '@provablehq/aleo-types';
import { AleoNetworkClient } from '@provablehq/sdk';

export class AleoXService extends XService {
  private static instance: AleoXService;

  public networkClient: AleoNetworkClient;
  public rpcUrl: string = 'https://api.explorer.provable.com/v1';

  private constructor() {
    super('ALEO' as const);
    this.networkClient = new AleoNetworkClient(this.rpcUrl);
  }

  public static getInstance(): AleoXService {
    if (!AleoXService.instance) {
      AleoXService.instance = new AleoXService();
    }
    return AleoXService.instance;
  }

  /**
   * Set the network client for the specified network
   * 
   * @param network - The Aleo network to connect to (MAINNET or TESTNET)
   */
  public setNetworkClient(network: Network): void {
    this.rpcUrl = network === Network.MAINNET 
      ? 'https://api.explorer.aleo.org/v1'
      : 'https://api.explorer.provable.com/v1';
    
    this.networkClient = new AleoNetworkClient(this.rpcUrl);
    console.log('[AleoXService] Network client initialized:', { 
      network: network === Network.MAINNET ? 'mainnet' : 'testnet',
      rpcUrl: this.rpcUrl 
    });
  }

  /**
   * Get the balance of a token for a given address
   * 
   * @param address - The Aleo address to query
   * @param xToken - The token to get the balance for
   * @returns The balance in microcredits (for ALEO) or smallest unit
   */
  async getBalance(address: string | undefined, xToken: XToken): Promise<bigint> {
    if (!address) {
      console.warn('[AleoXService] No address provided for getBalance');
      return BigInt(0);
    }

    try {
      console.log('[AleoXService] Fetching balance for:', { 
        address, 
        token: xToken.symbol,
        rpcUrl: this.rpcUrl 
      });

      if (xToken.symbol === 'ALEO' || xToken.address === 'credits.aleo') {
        const mapping = await this.networkClient.getProgramMappingValue(
          'credits.aleo',
          'account',
          address
        );
        
        console.log('[AleoXService] Mapping response:', mapping);
        
        if (mapping) {
          const valueStr = mapping.toString().replace('u64', '');
          const balance = BigInt(valueStr);
          console.log('[AleoXService] Balance fetched:', { 
            raw: valueStr, 
            microcredits: balance.toString(),
            aleo: (Number(balance) / 1_000_000).toFixed(6)
          });
          return balance;
        }
        
        console.log('[AleoXService] No mapping found, balance is 0');
        return BigInt(0);
      }

      return BigInt(0);
    } catch (error) {
      console.error('[AleoXService] Failed to get Aleo balance:', error);
      return BigInt(0);
    }
  }

  /**
   * Get the ALEO credits balance for a given address
   * 
   * @param address - The Aleo address to query
   * @returns The balance in microcredits
   */
  async getCreditsBalance(address: string): Promise<bigint> {
    return this.getBalance(address, { 
      symbol: 'ALEO', 
      address: 'credits.aleo',
      decimals: 6,
      name: 'Aleo Credits'
    } as XToken);
  }
}
