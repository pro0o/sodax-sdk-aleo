import { baseChainInfo, type ChainId, type ChainType } from '@sodax/types';

export function getXChainType(xChainId: ChainId | string | undefined): ChainType | undefined {
  if (!xChainId) {
    return undefined;
  }

  // Handle ALEO chain which is not in baseChainInfo
  if (xChainId === 'aleo') {
    return 'ALEO';
  }

  // Safely access baseChainInfo to handle chains not in the config
  if (xChainId in baseChainInfo) {
    return baseChainInfo[xChainId as ChainId].type;
  }

  return undefined;
}
