export type AleoNetworkEnv = 'mainnet' | 'testnet';

export type AleoTransactionStatus = 'pending' | 'confirmed' | 'failed';

export type AleoTransaction = {
  id: string;
  status: AleoTransactionStatus;
  fee?: string;
};
