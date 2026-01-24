
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AleoWalletProvider, type AleoWalletConfig, type BrowserExtensionAleoWalletConfig } from './AleoWalletProvider.js';
import { AleoNetworkClient } from '@provablehq/sdk';

// Mock the Provable SDK to avoid network calls and heavy initialization
vi.mock('@provablehq/sdk', () => {
  return {
    Account: vi.fn().mockImplementation((config) => ({
      address: () => ({
        to_string: () => 'aleo1mockaddress1234567890abcdef1234567890abcdef123456',
      }),
      privateKey: () => 'APrivateKey1Mock...',
      sign: () => ({
        to_string: () => 'sign1mocksignature...',
      }),
    })),
    AleoNetworkClient: vi.fn().mockImplementation(() => ({
      getProgram: vi.fn(),
      getPublicBalance: vi.fn(),
      getLatestHeight: vi.fn(),
      findRecords: vi.fn(),
      waitForTransactionConfirmation: vi.fn(),
    })),
    ProgramManager: vi.fn().mockImplementation(() => ({
      setAccount: vi.fn(),
      execute: vi.fn(),
      transfer: vi.fn(),
      run: vi.fn(),
    })),
    AleoKeyProvider: vi.fn().mockImplementation(() => ({
      useCache: vi.fn(),
    })),
    NetworkRecordProvider: vi.fn(),
    Address: {
      from_string: vi.fn(),
    },
    Signature: {
      from_string: vi.fn(),
    },
  };
});

describe('AleoWalletProvider', () => {
  const mockRpcUrl = 'https://api.explorer.provable.com/v1';
  const mockPrivateKey = 'APrivateKey1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'; // Format doesn't matter much for mocked Account
  const mockSeed = new Uint8Array([1, 2, 3]);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with private key wallet config', () => {
      const config: AleoWalletConfig = {
        privateKey: mockPrivateKey,
        rpcUrl: mockRpcUrl,
      };

      const provider = new AleoWalletProvider(config);
      expect(provider).toBeInstanceOf(AleoWalletProvider);
    });

    it('should initialize with seed wallet config', () => {
      const config: AleoWalletConfig = {
        seed: mockSeed,
        rpcUrl: mockRpcUrl,
      };

      const provider = new AleoWalletProvider(config);
      expect(provider).toBeInstanceOf(AleoWalletProvider);
    });

    it('should initialize with browser extension wallet config', () => {
      // Mock adapters
      const mockAdapter = {
        getAddress: vi.fn(),
        signMessage: vi.fn(),
        isConnected: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      
      const config: BrowserExtensionAleoWalletConfig = {
        walletAdapter: mockAdapter,
        networkClient: new AleoNetworkClient(mockRpcUrl),
        rpcUrl: mockRpcUrl,
      };

      const provider = new AleoWalletProvider(config);
      expect(provider).toBeInstanceOf(AleoWalletProvider);
    });

    it('should throw error for invalid wallet config', () => {
      // @ts-ignore
      const config: AleoWalletConfig = {};

      expect(() => new AleoWalletProvider(config)).toThrow('Invalid wallet configuration');
    });
  });

  describe('getWalletAddress', () => {
    it('should get wallet address from private key wallet', async () => {
      const config: AleoWalletConfig = {
        privateKey: mockPrivateKey,
        rpcUrl: mockRpcUrl,
      };
      const provider = new AleoWalletProvider(config);

      const address = await provider.getWalletAddress();
      expect(address).toBe('aleo1mockaddress1234567890abcdef1234567890abcdef123456');
    });

    it('should get wallet address from browser extension wallet', async () => {
      const mockAddress = 'aleo1browseraddress...';
      const mockAdapter = {
        getAddress: vi.fn().mockResolvedValue(mockAddress),
        signMessage: vi.fn(),
        isConnected: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      
      const config: BrowserExtensionAleoWalletConfig = {
        walletAdapter: mockAdapter,
        networkClient: new AleoNetworkClient(mockRpcUrl),
        rpcUrl: mockRpcUrl,
      };
      const provider = new AleoWalletProvider(config);

      const address = await provider.getWalletAddress();
      expect(address).toBe(mockAddress);
      expect(mockAdapter.getAddress).toHaveBeenCalled();
    });
  });

  describe('execute', () => {
    it('should execute program using private key wallet', async () => {
      const config: AleoWalletConfig = { privateKey: mockPrivateKey, rpcUrl: mockRpcUrl };
      const provider = new AleoWalletProvider(config);
      
      // Mock ProgramManager.execute return value
      const mockTxId = 'at1mocktxid...';
      // @ts-ignore - Accessing private property for testing or assuming mock implementation
      provider['programManager'].execute.mockResolvedValue(mockTxId);

      const result = await provider.execute({
        programName: 'credits.aleo',
        functionName: 'transfer_public',
        inputs: ['aleo1recipient...', '100u64'],
      });

      expect(result.transactionId).toBe(mockTxId);
      // @ts-ignore
      expect(provider['programManager'].execute).toHaveBeenCalled();
    });
  });

  describe('view', () => {
    it('should view program using private key wallet', async () => {
      const config: AleoWalletConfig = { privateKey: mockPrivateKey, rpcUrl: mockRpcUrl };
      const provider = new AleoWalletProvider(config);

      const mockProgramSource = 'program credits.aleo; ...';
      // @ts-ignore
      provider['networkClient'].getProgram.mockResolvedValue(mockProgramSource);
      
      const mockOutputs = [{ toString: () => '100u64' }];
      // @ts-ignore
      provider['programManager'].run.mockResolvedValue({ getOutputs: () => mockOutputs });

      const result = await provider.view({
        programName: 'credits.aleo',
        functionName: 'balance',
        inputs: ['aleo1address...'],
      });

      expect(result.outputs).toEqual(['100u64']);
      // @ts-ignore
      expect(provider['networkClient'].getProgram).toHaveBeenCalledWith('credits.aleo');
    });
  });

  describe('transfer', () => {
    it('should transfer credits using private key wallet', async () => {
      const config: AleoWalletConfig = { privateKey: mockPrivateKey, rpcUrl: mockRpcUrl };
      const provider = new AleoWalletProvider(config);

      const mockTxId = 'at1transfertxid...';
      // @ts-ignore
      provider['programManager'].transfer.mockResolvedValue(mockTxId);

      const txId = await provider.transfer({
        recipient: 'aleo1recipient...',
        amountMicrocredits: BigInt(100),
        transferType: 'public',
      });

      expect(txId).toBe(mockTxId);
      // @ts-ignore
      expect(provider['programManager'].transfer).toHaveBeenCalled();
    });
  });

  describe('getBalance', () => {
    it('should get public and private balance', async () => {
      const config: AleoWalletConfig = { privateKey: mockPrivateKey, rpcUrl: mockRpcUrl };
      const provider = new AleoWalletProvider(config);

      // Mock public balance (in microcredits)
      // @ts-ignore
      provider['networkClient'].getPublicBalance.mockResolvedValue(5500000); // 5.5 credits

      // Mock private records check
      // We need to verify getRecords interaction logic
      // But getRecords calls networkClient.findRecords
      // Let's mock findRecords return
      const mockRecords = [
        { 
            microcredits: () => BigInt(5000000), 
            nonce: () => 'nonce1',
            spent: false 
        }
      ];
      // @ts-ignore
      provider['networkClient'].findRecords.mockResolvedValue(mockRecords);
      // @ts-ignore
      provider['networkClient'].getLatestHeight.mockResolvedValue(1000);

      const balance = await provider.getBalance();

      // Public: 5,500,000
      expect(balance.publicBalance).toBe(BigInt(5500000));
      // Private: 5,000,000
      expect(balance.privateBalance).toBe(BigInt(5000000));
      expect(balance.recordCount).toBe(1);
    });
  });

  describe('waitForTransactionReceipt', () => {
    // Valid mock ID: at1 + 58 chars = 61 chars
    const validMockTxId = 'at1mocktxidmocktxidmocktxidmocktxidmocktxidmocktxidmocktxid12';

    it('should return receipt for accepted transaction', async () => {
      const config: AleoWalletConfig = { privateKey: mockPrivateKey, rpcUrl: mockRpcUrl };
      const provider = new AleoWalletProvider(config);

      const mockConfirmedTx = {
        status: 'accepted',
        type: 'execute',
        index: BigInt(1),
        transaction: {},
        finalize: [],
      };
      
      // @ts-ignore
      provider['networkClient'].waitForTransactionConfirmation.mockResolvedValue(mockConfirmedTx);

      const receipt = await provider.waitForTransactionReceipt(validMockTxId);

      expect(receipt.status).toBe('accepted');
      expect(receipt.transactionId).toBe(validMockTxId);
    });

    it('should throw error for rejected transaction', async () => {
      const config: AleoWalletConfig = { privateKey: mockPrivateKey, rpcUrl: mockRpcUrl };
      const provider = new AleoWalletProvider(config);

      // Simulate SDK throwing on rejection
      // @ts-ignore
      provider['networkClient'].waitForTransactionConfirmation.mockRejectedValue(new Error(`Transaction ${validMockTxId} was rejected by the network`));

      await expect(provider.waitForTransactionReceipt(validMockTxId))
        .rejects.toThrow(`Transaction ${validMockTxId} was rejected by the network`);
    });

    it('should throw error on timeout', async () => {
      const config: AleoWalletConfig = { privateKey: mockPrivateKey, rpcUrl: mockRpcUrl };
      const provider = new AleoWalletProvider(config);

      // @ts-ignore
      provider['networkClient'].waitForTransactionConfirmation.mockRejectedValue(new Error('Transaction did not appear after timeout'));

      await expect(provider.waitForTransactionReceipt(validMockTxId))
        .rejects.toThrow('did not confirm within');
    });

    it('should throw error for invalid transaction ID format immediately', async () => {
      const config: AleoWalletConfig = { privateKey: mockPrivateKey, rpcUrl: mockRpcUrl };
      const provider = new AleoWalletProvider(config);

      // Using a clearly invalid ID (too short, wrong prefix)
      const invalidId = 'invalid_tx_id';

      await expect(provider.waitForTransactionReceipt(invalidId))
        .rejects.toThrow('Invalid transaction ID format');
      
      // Ensure SDK method was NOT called (fails fast)
      // @ts-ignore
      expect(provider['networkClient'].waitForTransactionConfirmation).not.toHaveBeenCalled();
    });
  });

  describe('signMessage', () => {
      it('should sign message with private key wallet', async () => {
          const config: AleoWalletConfig = { privateKey: mockPrivateKey, rpcUrl: mockRpcUrl };
          const provider = new AleoWalletProvider(config);
          
          const msg = new TextEncoder().encode("hello");
          const sig = await provider.signMessage(msg);
          expect(sig).toContain('sign1mocksignature');
      });
  });
});
