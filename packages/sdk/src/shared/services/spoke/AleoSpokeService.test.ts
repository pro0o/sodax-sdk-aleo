import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AleoSpokeService } from './AleoSpokeService.js';
import type { AleoSpokeProvider, AleoRawSpokeProvider } from '../../entities/aleo/AleoSpokeProvider.js';
import { ALEO_TESTNET_CHAIN_ID, spokeChainConfig } from '@sodax/types';
import type { EvmHubProvider } from '../../entities/index.js';

vi.mock('@provablehq/sdk', () => ({
  AleoNetworkClient: vi.fn().mockImplementation(() => ({
    getProgramMappingValue: vi.fn().mockResolvedValue('100000u64'),
  })),
  ProgramManager: vi.fn().mockImplementation(() => ({
    estimateExecutionFee: vi.fn().mockResolvedValue(500000n),
  })),
}));

vi.mock('../hub/index.js', () => ({
  EvmWalletAbstraction: {
    getUserHubWalletAddress: vi.fn().mockResolvedValue('0x1234567890abcdef1234567890abcdef12345678'),
  },
}));

vi.mock('../../utils/shared-utils.js', () => ({
  encodeAddress: vi.fn().mockReturnValue('0x00000000000000000000000000000000000000000000000000000000deadbeef'),
}));

describe('AleoSpokeService', () => {
  const mockWalletAddress = 'aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc';
  const mockChainConfig = spokeChainConfig[ALEO_TESTNET_CHAIN_ID];
  const mockTxId = 'at1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqfrhfpg';

  const mockExecute = vi.fn().mockResolvedValue({ transactionId: mockTxId });
  const mockWaitForReceipt = vi.fn().mockResolvedValue({ transactionId: mockTxId, status: 'accepted' });

  const mockSpokeProvider = {
    walletProvider: {
      getWalletAddress: vi.fn().mockResolvedValue(mockWalletAddress),
      execute: mockExecute,
      waitForTransactionReceipt: mockWaitForReceipt,
      executeAndWait: vi.fn(),
    },
    chainConfig: mockChainConfig,
    rpcUrl: mockChainConfig.rpcUrl,
    networkClient: {
      getProgramMappingValue: vi.fn().mockResolvedValue('100000u64'),
    },
    programManager: {
      estimateExecutionFee: vi.fn().mockResolvedValue(500000n),
    },
    waitForTransactionConfirmation: vi.fn().mockResolvedValue(true),
  } as unknown as AleoSpokeProvider;

  const mockRawSpokeProvider = {
    walletProvider: {
      getWalletAddress: vi.fn().mockResolvedValue(mockWalletAddress),
    },
    chainConfig: mockChainConfig,
    raw: true,
    rpcUrl: mockChainConfig.rpcUrl,
    networkClient: {
      getProgramMappingValue: vi.fn().mockResolvedValue('100000u64'),
    },
    programManager: {
      estimateExecutionFee: vi.fn().mockResolvedValue(500000n),
    },
  } as unknown as AleoRawSpokeProvider;

  const mockHubProvider = {
    chainConfig: {
      chain: { id: 146, type: 'EVM' },
      addresses: {
        assetManager: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      },
    },
    publicClient: {},
    walletClient: {},
  } as unknown as EvmHubProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockResolvedValue({ transactionId: mockTxId });
    mockWaitForReceipt.mockResolvedValue({ transactionId: mockTxId, status: 'accepted' });
  });

  describe('estimateGas', () => {
    it('should return gas estimate for a raw transaction', async () => {
      const rawTx = {
        from: mockWalletAddress,
        to: 'asset_manager_core_v3.aleo' as const,
        value: 1000000n,
        data: {
          programName: 'asset_manager_core_v3.aleo',
          functionName: 'transfer',
          inputs: ['1field'],
        },
      };

      const result = await AleoSpokeService.estimateGas(rawTx, mockSpokeProvider);

      expect(result).toHaveProperty('baseFee');
      expect(result).toHaveProperty('priorityFee');
      expect(result).toHaveProperty('totalFee');
      expect(result).toHaveProperty('requiresFeeRecord');
    });
  });

  describe('deposit', () => {
    const depositParams = {
      from: mockWalletAddress,
      token: 1n,
      amount: 1000000n,
      data: '0xdeadbeef' as `0x${string}`,
    };

    it('should execute deposit and return transaction ID', async () => {
      const result = await AleoSpokeService.deposit(depositParams, mockSpokeProvider, mockHubProvider);

      expect(result).toBe(mockTxId);
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('should return raw transaction when raw=true', async () => {
      const result = await AleoSpokeService.deposit(depositParams, mockRawSpokeProvider, mockHubProvider, true);

      expect(result).toHaveProperty('from', mockWalletAddress);
      expect(result).toHaveProperty('to', mockChainConfig.addresses.assetManager);
      expect(result).toHaveProperty('data');
      expect((result as { data: { functionName: string } }).data.functionName).toBe('transfer');
    });

    it('should use provided connSn instead of generating one', async () => {
      const paramsWithConnSn = { ...depositParams, connSn: 42n };

      await AleoSpokeService.deposit(paramsWithConnSn, mockSpokeProvider, mockHubProvider);

      const executeCall = mockExecute.mock.calls[0]?.[0];
      expect(executeCall.inputs).toBeDefined();
      const connSnInput = executeCall.inputs[3];
      expect(connSnInput).toBe('42u128');
    });

    it('should use provided feeAmount', async () => {
      const paramsWithFee = { ...depositParams, feeAmount: 500n };

      await AleoSpokeService.deposit(paramsWithFee, mockSpokeProvider, mockHubProvider);

      const executeCall = mockExecute.mock.calls[0]?.[0];
      const feeInput = executeCall.inputs[5];
      expect(feeInput).toBe('500u64');
    });

    it('should use explicit hub wallet address when provided', async () => {
      const paramsWithTo = {
        ...depositParams,
        to: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
      };

      await AleoSpokeService.deposit(paramsWithTo, mockSpokeProvider, mockHubProvider);

      expect(mockExecute).toHaveBeenCalledTimes(1);
    });
  });

  describe('getDeposit', () => {
    it('should return user balance for the token', async () => {
      const result = await AleoSpokeService.getDeposit('credits.aleo', mockSpokeProvider);

      expect(typeof result).toBe('bigint');
    });
  });

  describe('getSimulateDepositParams', () => {
    it('should return simulation parameters', async () => {
      const depositParams = {
        from: mockWalletAddress,
        token: 1n,
        amount: 1000000n,
        data: '0xdeadbeef' as `0x${string}`,
      };

      const result = await AleoSpokeService.getSimulateDepositParams(
        depositParams,
        mockSpokeProvider,
        mockHubProvider,
      );

      expect(result).toHaveProperty('spokeChainID', mockChainConfig.chain.id);
      expect(result).toHaveProperty('amount', 1000000n);
      expect(result).toHaveProperty('data', '0xdeadbeef');
    });
  });

  describe('callWallet', () => {
    it('should execute sendMessage and return transaction ID', async () => {
      const result = await AleoSpokeService.callWallet(
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        '0xdeadbeef',
        mockSpokeProvider,
        mockHubProvider,
      );

      expect(result).toBe(mockTxId);
      expect(mockExecute).toHaveBeenCalledTimes(1);

      const executeCall = mockExecute.mock.calls[0]?.[0];
      expect(executeCall.functionName).toBe('send_message');
      expect(executeCall.programName).toBe(mockChainConfig.addresses.connection);
    });

    it('should return raw transaction when using raw provider', async () => {
      const result = await AleoSpokeService.callWallet(
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        '0xdeadbeef',
        mockRawSpokeProvider,
        mockHubProvider,
      );

      expect(result).toHaveProperty('from', mockWalletAddress);
      expect(result).toHaveProperty('to', mockChainConfig.addresses.connection);
      expect((result as { data: { functionName: string } }).data.functionName).toBe('send_message');
    });
  });

  describe('generateConnSn', () => {
    it('should return a bigint', () => {
      const connSn = AleoSpokeService.generateConnSn();
      expect(typeof connSn).toBe('bigint');
    });

    it('should return value within expected range', () => {
      for (let i = 0; i < 100; i++) {
        const connSn = AleoSpokeService.generateConnSn();
        expect(connSn).toBeGreaterThanOrEqual(0n);
        expect(connSn).toBeLessThan(98488343n);
      }
    });

    it('should generate different values across calls', () => {
      const values = new Set<bigint>();
      for (let i = 0; i < 20; i++) {
        values.add(AleoSpokeService.generateConnSn());
      }
      expect(values.size).toBeGreaterThan(1);
    });
  });

  describe('waitForConfirmation', () => {
    it('should return success when transaction is confirmed', async () => {
      const result = await AleoSpokeService.waitForConfirmation(mockSpokeProvider, mockTxId);

      expect(result).toEqual({ ok: true, value: true });
    });

    it('should return failure when transaction is rejected', async () => {
      (mockSpokeProvider as { waitForTransactionConfirmation: ReturnType<typeof vi.fn> }).waitForTransactionConfirmation =
        vi.fn().mockResolvedValue(false);

      const result = await AleoSpokeService.waitForConfirmation(mockSpokeProvider, mockTxId);

      expect(result).toEqual({ ok: true, value: false });
    });

    it('should return error when confirmation throws', async () => {
      (mockSpokeProvider as { waitForTransactionConfirmation: ReturnType<typeof vi.fn> }).waitForTransactionConfirmation =
        vi.fn().mockRejectedValue(new Error('Network timeout'));

      const result = await AleoSpokeService.waitForConfirmation(mockSpokeProvider, mockTxId);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    it('should reject raw spoke provider', async () => {
      const rawAsAleoSpokeProvider = {
        ...mockRawSpokeProvider,
        waitForTransactionConfirmation: vi.fn(),
      } as unknown as AleoSpokeProvider;

      const result = await AleoSpokeService.waitForConfirmation(rawAsAleoSpokeProvider, mockTxId);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as Error).message).toContain('raw provider');
      }
    });
  });
});
