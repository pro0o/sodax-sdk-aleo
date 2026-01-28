import { useXWagmiStore } from '@/useXWagmiStore';
import { AleoXService } from './AleoXService';

export const reconnectAleo = async () => {
  const aleoConnection = useXWagmiStore.getState().xConnections.ALEO;
  if (!aleoConnection) return;

  const aleoWallet = AleoXService.getInstance().wallet;
  if (!aleoWallet) return;

  const recentXConnectorId = aleoConnection.xConnectorId;
  aleoWallet.selectWallet(recentXConnectorId as any);
  
  if (aleoWallet.network) {
    await aleoWallet.connect(aleoWallet.network);
    
    if (aleoWallet.address) {
      useXWagmiStore.setState({
        xConnections: {
          ...useXWagmiStore.getState().xConnections,
          ALEO: {
            xAccount: {
              address: aleoWallet.address,
              xChainType: 'ALEO',
            },
            xConnectorId: recentXConnectorId,
          },
        },
      });
    }
  }
};
