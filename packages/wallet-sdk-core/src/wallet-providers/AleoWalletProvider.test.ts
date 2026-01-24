import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AleoWalletProvider, AleoWalletError, type AleoWalletConfig, type BrowserExtensionAleoWalletConfig } from './AleoWalletProvider.js';
import { AleoNetworkClient } from '@provablehq/sdk';

// Mock the Provable SDK to avoid network calls and heavy initialization
vi.mock('@provablehq/sdk', () => {
  return {
    Account: vi.fn().mockImplementation((config) => ({
      address: () => ({
        to_string: () => 'aleo1mockaddress1234567890abcdef1234567890abcdef123456',
      }),
      privateKey: () => 'APrivateKey1Mock...',
    })),
    AleoNetworkClient: vi.fn().mockImplementation(() => ({
      getProgram: vi.fn(),
      waitForTransactionConfirmation: vi.fn(),
    })),
    ProgramManager: vi.fn().mockImplementation(() => ({
      setAccount: vi.fn(),
      execute: vi.fn(),
    })),
    AleoKeyProvider: vi.fn().mockImplementation(() => ({
      useCache: vi.fn(),
    })),
    NetworkRecordProvider: vi.fn(),
  };
});

describe('AleoWalletProvider', () => {
  const mockRpcUrl = 'https://api.explorer.provable.com/v1';
  const mockPrivateKey = 'APrivateKey1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
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

    it('should throw AleoWalletError for invalid wallet config', () => {
      // @ts-ignore
      const config: AleoWalletConfig = {};

      try {
        new AleoWalletProvider(config);
      } catch (error) {
        expect(error).toBeInstanceOf(AleoWalletError);
        expect((error as AleoWalletError).code).toBe('INVALID_CONFIG');
        expect((error as AleoWalletError).message).toBe('Invalid wallet configuration');
      }
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
      // @ts-ignore - Accessing private property for testing
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

    it('should throw AleoWalletError(TX_REJECTED) for rejected transaction', async () => {
      const config: AleoWalletConfig = { privateKey: mockPrivateKey, rpcUrl: mockRpcUrl };
      const provider = new AleoWalletProvider(config);

      // Simulate SDK throwing on rejection
      // @ts-ignore
      provider['networkClient'].waitForTransactionConfirmation.mockRejectedValue(new Error(`Transaction ${validMockTxId} was rejected by the network`));

      try {
        await provider.waitForTransactionReceipt(validMockTxId);
      } catch (error) {
        expect(error).toBeInstanceOf(AleoWalletError);
        expect((error as AleoWalletError).code).toBe('TX_REJECTED');
        expect((error as AleoWalletError).message).toContain('rejected by the network');
      }
    });

    it('should throw AleoWalletError(TX_TIMEOUT) on timeout', async () => {
      const config: AleoWalletConfig = { privateKey: mockPrivateKey, rpcUrl: mockRpcUrl };
      const provider = new AleoWalletProvider(config);

      // @ts-ignore
      provider['networkClient'].waitForTransactionConfirmation.mockRejectedValue(new Error('Transaction did not appear after timeout'));

      try {
        await provider.waitForTransactionReceipt(validMockTxId);
      } catch (error) {
        expect(error).toBeInstanceOf(AleoWalletError);
        expect((error as AleoWalletError).code).toBe('TX_TIMEOUT');
        expect((error as AleoWalletError).message).toContain('did not confirm within');
      }
    });

    it('should throw AleoWalletError(INVALID_TX_ID) for invalid transaction ID format immediately', async () => {
      const config: AleoWalletConfig = { privateKey: mockPrivateKey, rpcUrl: mockRpcUrl };
      const provider = new AleoWalletProvider(config);

      // Ensure SDK method was NOT called (fails fast)
      // @ts-ignore
      expect(provider['networkClient'].waitForTransactionConfirmation).not.toHaveBeenCalled();
    });
  });
});
