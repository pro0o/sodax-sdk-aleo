import { XService } from '@/core/XService';
import type { XToken } from '@sodax/types';
import { Network } from '@provablehq/aleo-types';
import { AleoNetworkClient } from '@provablehq/sdk';

export class AleoXService extends XService {
  private static instance: AleoXService;

  public networkClient: AleoNetworkClient;
  public rpcUrl: string = 'https://api.explorer.provable.com/v1';

  private constructor() {
    super('ALEO');
    this.networkClient = new AleoNetworkClient(this.rpcUrl);
  }

  public static getInstance(): AleoXService {
    if (!AleoXService.instance) {
      AleoXService.instance = new AleoXService();
    }
    return AleoXService.instance;
  }

  public setNetworkClient(network: Network): void {
    this.rpcUrl = network === Network.MAINNET 
      ? 'https://api.explorer.aleo.org/v1'
      : 'https://api.explorer.provable.com/v1';
    
    this.networkClient = new AleoNetworkClient(this.rpcUrl);
  }

  async getBalance(address: string | undefined, xToken: XToken): Promise<bigint> {
    if (!address) return 0n;

    try {
      if (xToken.symbol === 'ALEO' || xToken.address === 'credits.aleo') {
        const mapping = await this.networkClient.getProgramMappingValue(
          'credits.aleo',
          'account',
          address
        );

        if (mapping) {
          const valueStr = mapping.toString().replace('u64', '');
          return BigInt(valueStr);
        }

        return 0n;
      }

      const programId = xToken.address;
      const mapping = await this.networkClient.getProgramMappingValue(
        programId,
        'account',
        address
      );

      if (mapping) {
        const valueStr = mapping.toString().replace(/u\d+$/, '');
        return BigInt(valueStr);
      }

      return 0n;
    } catch {
      return 0n;
    }
  }
}