import {
  Account,
  AleoNetworkClient,
  ProgramManager,
  AleoKeyProvider,
  NetworkRecordProvider,
  Address,
  Signature,
  type RecordPlaintext,
} from '@provablehq/sdk';




export type { RecordPlaintext };

/**
 * Interface for browser extension wallets (Leo Wallet, Puzzle, etc.)
 *
 * Browser wallets have limited capabilities due to SDK constraints:
 * - They cannot expose private keys for security reasons
 * - The SDK requires private keys for execution, view functions, and records
 * - Only `executeTransaction` (if implemented) can handle full execution flow
 */
export interface AleoWalletAdapter {
  getAddress(): Promise<string>;
  signMessage(message: Uint8Array): Promise<string>;

  /**
   * Execute a transaction (alternative to requestSignature flow)
   * This is the RECOMMENDED method for browser wallets to support execution.
   * The wallet handles authorization, proving, and submission internally.
   */
  executeTransaction?(options: {
    programName: string;
    functionName: string;
    inputs: string[];
    priorityFee?: number;
  }): Promise<string>;

  decryptRecord?(recordCiphertext: string): Promise<RecordPlaintext>;
  isConnected(): boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export interface AleoExecuteOptions {
  programName: string;
  functionName: string;
  inputs: string[];
  priorityFee?: number;
  privateFee?: boolean;
  feeRecord?: string | RecordPlaintext;
}

export interface AleoExecutionResult {
  transactionId: string;
  outputs?: string[];
}

export interface AleoViewResult {
  outputs: string[];
}

export interface AleoTransferOptions {
  recipient: string;
  amountMicrocredits: bigint;
  transferType: 'public' | 'private' | 'public_to_private' | 'private_to_public';
  priorityFee?: number;
  feeRecord?: string | RecordPlaintext;
}

export interface AleoRecord {
  record: RecordPlaintext;
  microcredits: bigint;
  nonce: string;
  spent: boolean;
}

export interface AleoBalance {
  publicBalance: bigint;
  privateBalance: bigint;
  recordCount: number;
}

/**
 * Aleo transaction receipt containing confirmation details
 */
export interface AleoTransactionReceipt {
  /** Transaction ID */
  transactionId: string;
  /** Transaction status: 'accepted' or 'rejected' */
  status: 'accepted' | 'rejected';
  /** Transaction type: 'execute', 'deploy', or 'fee' */
  type: string;
  /** Block index where transaction was confirmed */
  index: bigint;
  /** Full confirmed transaction data */
  transaction: any; // TransactionJSON from SDK
  /** Finalize operations */
  finalize: any[];
  /** Timestamp when receipt was obtained */
  confirmedAt: Date;
}

export interface AleoWaitForReceiptOptions {
  /** Polling interval in milliseconds (default: 2000) */
  checkInterval?: number;
  /** Maximum time to wait in milliseconds (default: 45000) */
  timeout?: number;
}

/**
 * Interface for Aleo wallet providers.
 *
 * Note: Some methods are only available for private key wallets due to SDK constraints.
 * See method documentation for details.
 */
export interface IAleoWalletProvider {
  getWalletAddress(): Promise<string>;

  /**
   * - PK Wallets: Fully functional
   * - Browser Wallets: Requires adapter to implement `executeTransaction()`
   */
  execute(options: AleoExecuteOptions): Promise<AleoExecutionResult>;

  /**
   * - PK Wallets: Fully functional
   * - Browser Wallets: NOT SUPPORTED (SDK requires private key)
   */
  view(options: Omit<AleoExecuteOptions, 'priorityFee' | 'privateFee'>): Promise<AleoViewResult>;

  /**
   * - PK Wallets: Fully functional
   * - Browser Wallets: NOT SUPPORTED (SDK requires private key)
   */
  transfer(options: AleoTransferOptions): Promise<string>;

  /**
   * - PK Wallets: Returns both public and private balance
   * - Browser Wallets: Returns public balance only (privateBalance = 0)
   */
  getBalance(address?: string): Promise<AleoBalance>;

  /**
   * - PK Wallets: Fully functional
   * - Browser Wallets: NOT SUPPORTED (SDK requires private key for decryption)
   */
  getRecords(programId: string): Promise<AleoRecord[]>;

  signMessage(message: Uint8Array): Promise<string>;

  verifySignature(message: Uint8Array, signature: string, address: string): Promise<boolean>;

  /**
   * Wait for a transaction to be confirmed on the Aleo network
   * 
   * - PK Wallets: Fully functional
   * - Browser Wallets: Fully functional (uses network polling)
   */
  waitForTransactionReceipt(
    transactionId: string,
    options?: AleoWaitForReceiptOptions
  ): Promise<AleoTransactionReceipt>;

  /**
   * Send transfer and wait for confirmation
   * 
   * - PK Wallets: Fully functional
   * - Browser Wallets: NOT SUPPORTED (requires private key for transfer)
   */
  transferAndWait(
    options: AleoTransferOptions,
    receiptOptions?: AleoWaitForReceiptOptions
  ): Promise<{ transactionId: string; receipt: AleoTransactionReceipt }>;

  /**
   * Execute program and wait for confirmation
   * 
   * - PK Wallets: Fully functional
   * - Browser Wallets: Requires adapter to implement `executeTransaction()`
   */
  executeAndWait(
    options: AleoExecuteOptions,
    receiptOptions?: AleoWaitForReceiptOptions
  ): Promise<{ result: AleoExecutionResult; receipt: AleoTransactionReceipt }>;
}

export type PrivateKeyAleoWalletConfig = {
  rpcUrl: string;
  privateKey: string;
  network?: 'mainnet' | 'testnet';
};

export type SeedAleoWalletConfig = {
  rpcUrl: string;
  seed: Uint8Array;
  network?: 'mainnet' | 'testnet';
};

export type BrowserExtensionAleoWalletConfig = {
  /** Aleo network RPC URL (required to initialize ProgramManager correctly) */
  rpcUrl: string;
  networkClient: AleoNetworkClient;
  walletAdapter: AleoWalletAdapter;
};

export type AleoWalletConfig = PrivateKeyAleoWalletConfig | SeedAleoWalletConfig | BrowserExtensionAleoWalletConfig;

// ============================================
// Internal Wallet Types
// ============================================

export type PkAleoWallet = {
  type: 'privateKey';
  account: Account;
};

export type BrowserExtensionAleoWallet = {
  type: 'browserExtension';
  adapter: AleoWalletAdapter;
};

export type AleoWallet = PkAleoWallet | BrowserExtensionAleoWallet;

export function isPrivateKeyConfig(config: AleoWalletConfig): config is PrivateKeyAleoWalletConfig {
  return 'privateKey' in config && typeof config.privateKey === 'string';
}

export function isSeedConfig(config: AleoWalletConfig): config is SeedAleoWalletConfig {
  return 'seed' in config && config.seed instanceof Uint8Array;
}

export function isBrowserExtensionConfig(config: AleoWalletConfig): config is BrowserExtensionAleoWalletConfig {
  return 'walletAdapter' in config && 'networkClient' in config;
}

export function isPkAleoWallet(wallet: AleoWallet): wallet is PkAleoWallet {
  return wallet.type === 'privateKey';
}

export function isBrowserExtensionAleoWallet(wallet: AleoWallet): wallet is BrowserExtensionAleoWallet {
  return wallet.type === 'browserExtension';
}

export function creditsToMicrocredits(credits: number): bigint {
  return BigInt(Math.floor(credits * 1_000_000));
}

export function microcreditsToCredits(microcredits: bigint): number {
  return Number(microcredits) / 1_000_000;
}

export function isValidAleoAddress(address: string): boolean {
  return /^aleo1[a-z0-9]{58}$/.test(address);
}

export function isValidAleoPrivateKey(privateKey: string): boolean {
  return /^APrivateKey1[a-zA-Z0-9]{59}$/.test(privateKey);
}

export function isValidAleoTransactionId(transactionId: string): boolean {
  return /^at1[a-z0-9]{58}$/.test(transactionId);
}


export class AleoWalletProvider implements IAleoWalletProvider {
  private readonly networkClient: AleoNetworkClient;
  private readonly wallet: AleoWallet;
  private readonly programManager: ProgramManager;
  private readonly keyProvider: AleoKeyProvider;

  constructor(config: AleoWalletConfig) {
    console.log('[AleoWalletProvider] Initializing wallet provider...');
    
    // Initialize key provider (shared across wallet types)
    this.keyProvider = new AleoKeyProvider();
    this.keyProvider.useCache(true);
    console.log('[AleoWalletProvider] KeyProvider initialized with cache enabled');

    if (isPrivateKeyConfig(config)) {
      console.log('[AleoWalletProvider] Config type: PrivateKey');
      console.log('[AleoWalletProvider] RPC URL:', config.rpcUrl);
      
      // Private key wallet
      this.networkClient = new AleoNetworkClient(config.rpcUrl);
      console.log('[AleoWalletProvider] NetworkClient created');
      
      const account = new Account({ privateKey: config.privateKey });
      console.log('[AleoWalletProvider] Account created from private key');
      console.log('[AleoWalletProvider] Address:', account.address().to_string());
      
      this.wallet = { type: 'privateKey', account };

      // Set up record provider and program manager
      const recordProvider = new NetworkRecordProvider(account, this.networkClient);
      console.log('[AleoWalletProvider] RecordProvider created');
      
      this.programManager = new ProgramManager(config.rpcUrl, this.keyProvider, recordProvider);
      this.programManager.setAccount(account);
      console.log('[AleoWalletProvider] ProgramManager created and account set');
    } else if (isSeedConfig(config)) {
      console.log('[AleoWalletProvider] Config type: Seed');
      console.log('[AleoWalletProvider] RPC URL:', config.rpcUrl);
      
      // Seed-based wallet
      this.networkClient = new AleoNetworkClient(config.rpcUrl);
      const account = new Account({ seed: config.seed });
      console.log('[AleoWalletProvider] Account created from seed');
      console.log('[AleoWalletProvider] Address:', account.address().to_string());
      
      this.wallet = { type: 'privateKey', account };

      const recordProvider = new NetworkRecordProvider(account, this.networkClient);
      this.programManager = new ProgramManager(config.rpcUrl, this.keyProvider, recordProvider);
      this.programManager.setAccount(account);
      console.log('[AleoWalletProvider] ProgramManager created and account set');
    } else if (isBrowserExtensionConfig(config)) {
      console.log('[AleoWalletProvider] Config type: BrowserExtension');
      console.log('[AleoWalletProvider] RPC URL:', config.rpcUrl);
      
      // Browser extension wallet
      this.networkClient = config.networkClient;
      this.wallet = { type: 'browserExtension', adapter: config.walletAdapter };

      // For browser wallets, program manager has limited capabilities
      // (can't access private key directly)
      // Use the provided rpcUrl instead of networkClient.host
      // (SDK modifies host by appending network suffix)
      this.programManager = new ProgramManager(
        config.rpcUrl,
        this.keyProvider,
        undefined, // No record provider for browser wallets
      );
      console.log('[AleoWalletProvider] ProgramManager created (no record provider for browser wallet)');
    } else {
      throw new Error('Invalid wallet configuration');
    }
    
    console.log('[AleoWalletProvider] Initialization complete');
  }

  async getWalletAddress(): Promise<string> {
    console.log('[AleoWalletProvider.getWalletAddress] Getting wallet address...');
    
    if (isPkAleoWallet(this.wallet)) {
      const address = this.wallet.account.address().to_string();
      console.log('[AleoWalletProvider.getWalletAddress] PK wallet address:', address);
      return address;
    }

    if (isBrowserExtensionAleoWallet(this.wallet)) {
      const address = await this.wallet.adapter.getAddress();
      console.log('[AleoWalletProvider.getWalletAddress] Browser wallet address:', address);
      return address;
    }

    throw new Error('Invalid wallet configuration');
  }

  async execute(options: AleoExecuteOptions): Promise<AleoExecutionResult> {
    const { programName, functionName, inputs, priorityFee = 0, privateFee = false, feeRecord } = options;

    console.log('[AleoWalletProvider.execute] Starting execution...');
    console.log('[AleoWalletProvider.execute] Program:', programName);
    console.log('[AleoWalletProvider.execute] Function:', functionName);
    console.log('[AleoWalletProvider.execute] Inputs:', JSON.stringify(inputs));
    console.log('[AleoWalletProvider.execute] Priority Fee:', priorityFee);
    console.log('[AleoWalletProvider.execute] Private Fee:', privateFee);
    console.log('[AleoWalletProvider.execute] Fee Record:', feeRecord ? 'provided' : 'none');

    if (isPkAleoWallet(this.wallet)) {
      console.log('[AleoWalletProvider.execute] Using PK wallet for execution');
      
      try {
        console.log('[AleoWalletProvider.execute] Calling programManager.execute()...');
        const startTime = Date.now();
        
        // Execute and build transaction using ProgramManager
        // ProgramManager.execute returns a transaction ID directly
        const txId = await this.programManager.execute({
          programName,
          functionName,
          priorityFee,
          privateFee,
          inputs,
          feeRecord,
          privateKey: this.wallet.account.privateKey(),
          keySearchParams: { cacheKey: `${programName}:${functionName}` },
        });

        const duration = Date.now() - startTime;
        console.log('[AleoWalletProvider.execute] Execution completed in', duration, 'ms');
        console.log('[AleoWalletProvider.execute] Transaction ID:', txId);

        return {
          transactionId: txId,
          outputs: undefined,
        };
      } catch (error) {
        console.error('[AleoWalletProvider.execute] Execution failed:', error);
        throw error;
      }
    }

    if (isBrowserExtensionAleoWallet(this.wallet)) {
      console.log('[AleoWalletProvider.execute] Using browser wallet for execution');
      
      // IMPORTANT: Browser wallet authorization flow has a critical issue:
      // buildAuthorizationPrivate requires a private key, which browser wallets don't expose.
      //
      // SOLUTION: The wallet adapter should handle the full execution flow internally:
      // - Option 1: Use wallet.executeTransaction({ program, function, inputs })
      // - Option 2: Build authorization on wallet side, sign it, return signed tx

      if (this.wallet.adapter.executeTransaction) {
        console.log('[AleoWalletProvider.execute] Calling adapter.executeTransaction()...');
        
        try {
          const startTime = Date.now();
          
          // Use wallet's native executeTransaction if available
          const txId = await this.wallet.adapter.executeTransaction({
            programName,
            functionName,
            inputs,
            priorityFee,
          });

          const duration = Date.now() - startTime;
          console.log('[AleoWalletProvider.execute] Browser wallet execution completed in', duration, 'ms');
          console.log('[AleoWalletProvider.execute] Transaction ID:', txId);

          return {
            transactionId: txId,
            outputs: undefined,
          };
        } catch (error) {
          console.error('[AleoWalletProvider.execute] Browser wallet execution failed:', error);
          throw error;
        }
      }

      throw new Error(
        'Browser wallet execution not yet implemented. ' +
          'The wallet adapter must implement executeTransaction() or handle authorization internally.',
      );
    }

    throw new Error('Invalid wallet configuration');
  }

  async view(options: Omit<AleoExecuteOptions, 'priorityFee' | 'privateFee'>): Promise<AleoViewResult> {
    const { programName, functionName, inputs } = options;

    console.log('[AleoWalletProvider.view] Starting view execution...');
    console.log('[AleoWalletProvider.view] Program:', programName);
    console.log('[AleoWalletProvider.view] Function:', functionName);
    console.log('[AleoWalletProvider.view] Inputs:', JSON.stringify(inputs));

    if (isPkAleoWallet(this.wallet)) {
      console.log('[AleoWalletProvider.view] Using PK wallet for view');
      
      try {
        // Fetch the program source code first (SDK requires source code, not name)
        console.log('[AleoWalletProvider.view] Fetching program source code...');
        const startFetch = Date.now();
        const programSource = await this.networkClient.getProgram(programName);
        console.log('[AleoWalletProvider.view] Program source fetched in', Date.now() - startFetch, 'ms');
        console.log('[AleoWalletProvider.view] Program source length:', programSource.length, 'chars');

        // Execute locally without submitting (use false for proveExecution for faster view calls)
        console.log('[AleoWalletProvider.view] Calling programManager.run()...');
        const startRun = Date.now();
        const result = await this.programManager.run(
          programSource, // Program SOURCE CODE, not name
          functionName,
          inputs,
          false, // Don't prove for view calls (faster)
        );
        console.log('[AleoWalletProvider.view] Run completed in', Date.now() - startRun, 'ms');

        const outputs = result.getOutputs().map((o: { toString(): string }) => o.toString());
        console.log('[AleoWalletProvider.view] Outputs:', JSON.stringify(outputs));

        return { outputs };
      } catch (error) {
        console.error('[AleoWalletProvider.view] View execution failed:', error);
        throw error;
      }
    }

    // For browser wallets, view is not supported as the SDK requires private key
    console.log('[AleoWalletProvider.view] View not supported for browser wallets');
    throw new Error('View execution not supported for browser extension wallets');
  }

  async transfer(options: AleoTransferOptions): Promise<string> {
    const { recipient, amountMicrocredits, transferType, priorityFee = 0, feeRecord } = options;

    console.log('[AleoWalletProvider.transfer] Starting transfer...');
    console.log('[AleoWalletProvider.transfer] Recipient:', recipient);
    console.log('[AleoWalletProvider.transfer] Amount (microcredits):', amountMicrocredits.toString());
    console.log('[AleoWalletProvider.transfer] Transfer Type:', transferType);
    console.log('[AleoWalletProvider.transfer] Priority Fee:', priorityFee);
    console.log('[AleoWalletProvider.transfer] Fee Record:', feeRecord ? 'provided' : 'none');

    if (!isPkAleoWallet(this.wallet)) {
      console.error('[AleoWalletProvider.transfer] Transfer requires PK wallet');
      throw new Error('Transfer requires private key wallet');
    }

    const amountCredits = Number(amountMicrocredits) / 1_000_000;
    console.log('[AleoWalletProvider.transfer] Amount (credits):', amountCredits);

    try {
      console.log('[AleoWalletProvider.transfer] Calling programManager.transfer()...');
      const startTime = Date.now();

      // Use ProgramManager's transfer method
      const txId = await this.programManager.transfer(
        amountCredits,
        recipient,
        transferType,
        priorityFee,
        false, // privateFee
        undefined, // recordSearchParams
        undefined, // amountRecord
        feeRecord,
        this.wallet.account.privateKey(),
      );

      const duration = Date.now() - startTime;
      console.log('[AleoWalletProvider.transfer] Transfer completed in', duration, 'ms');
      console.log('[AleoWalletProvider.transfer] Transaction ID:', txId);

      return txId;
    } catch (error) {
      console.error('[AleoWalletProvider.transfer] Transfer failed:', error);
      throw error;
    }
  }

  async getBalance(address?: string): Promise<AleoBalance> {
    console.log('[AleoWalletProvider.getBalance] Getting balance...');
    console.log('[AleoWalletProvider.getBalance] Address param:', address ?? 'not provided (using wallet address)');
    
    const targetAddress = address ?? (await this.getWalletAddress());
    console.log('[AleoWalletProvider.getBalance] Target address:', targetAddress);

    // Get public balance (handle potential errors)
    let publicBalance = BigInt(0);
    try {
      console.log('[AleoWalletProvider.getBalance] Fetching public balance...');
      const balance = await this.networkClient.getPublicBalance(targetAddress);
      console.log('[AleoWalletProvider.getBalance] Raw public balance:', balance);
      publicBalance = BigInt(Math.floor(balance)); // Ensure integer conversion
      console.log('[AleoWalletProvider.getBalance] Public balance (microcredits):', publicBalance.toString());
    } catch (e) {
      console.warn('[AleoWalletProvider.getBalance] Could not fetch public balance:', e);
    }

    // Get private records (only for PK wallets)
    let privateBalance = BigInt(0);
    let recordCount = 0;

    if (isPkAleoWallet(this.wallet)) {
      console.log('[AleoWalletProvider.getBalance] PK wallet - fetching private records...');
      try {
        const records = await this.getRecords('credits.aleo');
        console.log('[AleoWalletProvider.getBalance] Found', records.length, 'records');
        for (const record of records) {
          if (!record.spent) {
            privateBalance += record.microcredits;
            recordCount++;
          }
        }
        console.log('[AleoWalletProvider.getBalance] Private balance (microcredits):', privateBalance.toString());
        console.log('[AleoWalletProvider.getBalance] Unspent record count:', recordCount);
      } catch (e) {
        console.warn('[AleoWalletProvider.getBalance] Could not fetch private records:', e);
      }
    } else {
      console.log('[AleoWalletProvider.getBalance] Browser wallet - skipping private records');
    }

    console.log('[AleoWalletProvider.getBalance] Final balance:', {
      publicBalance: publicBalance.toString(),
      privateBalance: privateBalance.toString(),
      recordCount,
    });

    return {
      publicBalance,
      privateBalance,
      recordCount,
    };
  }

  async getRecords(programId: string, maxBlocksToScan: number = 100): Promise<AleoRecord[]> {
    console.log('[AleoWalletProvider.getRecords] Getting records...');
    console.log('[AleoWalletProvider.getRecords] Program ID:', programId);
    console.log('[AleoWalletProvider.getRecords] Max blocks to scan:', maxBlocksToScan);

    if (!isPkAleoWallet(this.wallet)) {
      console.error('[AleoWalletProvider.getRecords] Requires PK wallet');
      throw new Error('Getting records requires private key wallet');
    }

    try {
      console.log('[AleoWalletProvider.getRecords] Fetching latest block height...');
      const latestHeight = await this.networkClient.getLatestHeight();
      console.log('[AleoWalletProvider.getRecords] Latest height:', latestHeight);

      // Only scan recent blocks to avoid timeout (scanning from block 0 is too slow)
      const startHeight = Math.max(0, latestHeight - maxBlocksToScan);
      console.log('[AleoWalletProvider.getRecords] Scanning from block:', startHeight, 'to', latestHeight);

      console.log('[AleoWalletProvider.getRecords] Calling findRecords()...');
      const startTime = Date.now();
      const records = await this.networkClient.findRecords(
        startHeight,
        latestHeight,
        true, // unspent only
        [programId],
        undefined,
        undefined,
        undefined,
        this.wallet.account.privateKey(),
      );
      console.log('[AleoWalletProvider.getRecords] findRecords completed in', Date.now() - startTime, 'ms');
      console.log('[AleoWalletProvider.getRecords] Found', records.length, 'records');

      const mappedRecords = records.map((record: RecordPlaintext) => ({
        record,
        microcredits: this.extractMicrocredits(record),
        nonce: record.nonce(),
        spent: false,
      }));

      console.log('[AleoWalletProvider.getRecords] Mapped records:', mappedRecords.map(r => ({
        microcredits: r.microcredits.toString(),
        nonce: r.nonce,
        spent: r.spent,
      })));

      return mappedRecords;
    } catch (error) {
      console.error('[AleoWalletProvider.getRecords] Failed to get records:', error);
      throw error;
    }
  }

  async signMessage(message: Uint8Array): Promise<string> {
    console.log('[AleoWalletProvider.signMessage] Signing message...');
    console.log('[AleoWalletProvider.signMessage] Message length:', message.length, 'bytes');

    if (isPkAleoWallet(this.wallet)) {
      console.log('[AleoWalletProvider.signMessage] Using PK wallet for signing');
      try {
        const signature = this.wallet.account.sign(message);
        const signatureStr = signature.to_string();
        console.log('[AleoWalletProvider.signMessage] Signature:', signatureStr.substring(0, 50) + '...');
        return signatureStr;
      } catch (error) {
        console.error('[AleoWalletProvider.signMessage] Signing failed:', error);
        throw error;
      }
    }

    if (isBrowserExtensionAleoWallet(this.wallet)) {
      console.log('[AleoWalletProvider.signMessage] Using browser wallet for signing');
      try {
        const signature = await this.wallet.adapter.signMessage(message);
        console.log('[AleoWalletProvider.signMessage] Signature:', signature.substring(0, 50) + '...');
        return signature;
      } catch (error) {
        console.error('[AleoWalletProvider.signMessage] Browser wallet signing failed:', error);
        throw error;
      }
    }

    throw new Error('Invalid wallet configuration');
  }

  async verifySignature(message: Uint8Array, signature: string, address: string): Promise<boolean> {
    console.log('[AleoWalletProvider.verifySignature] Verifying signature...');
    console.log('[AleoWalletProvider.verifySignature] Message length:', message.length, 'bytes');
    console.log('[AleoWalletProvider.verifySignature] Signature:', signature.substring(0, 50) + '...');
    console.log('[AleoWalletProvider.verifySignature] Address:', address);

    try {
      const sig = Signature.from_string(signature);
      const addr = Address.from_string(address);
      const isValid = sig.verify(addr, message);
      console.log('[AleoWalletProvider.verifySignature] Is valid:', isValid);
      return isValid;
    } catch (error) {
      console.error('[AleoWalletProvider.verifySignature] Verification failed:', error);
      throw error;
    }
  }

  private extractMicrocredits(record: RecordPlaintext): bigint {
    try {
      const microcredits = record.microcredits();
      console.log('[AleoWalletProvider.extractMicrocredits] Extracted:', microcredits.toString());
      return microcredits;
    } catch (error) {
      console.warn('[AleoWalletProvider.extractMicrocredits] Failed to extract, returning 0:', error);
      return BigInt(0);
    }
  }

  getNetworkClient(): AleoNetworkClient {
    console.log('[AleoWalletProvider.getNetworkClient] Returning network client');
    return this.networkClient;
  }


  getProgramManager(): ProgramManager {
    console.log('[AleoWalletProvider.getProgramManager] Returning program manager');
    return this.programManager;
  }

  /**
   * Wait for a transaction to be confirmed on the Aleo network.
   * 
   * This method polls the network until the transaction is confirmed or timeout is reached.
   * 
   * ⚠️ IMPORTANT: This method will throw an error if the transaction is rejected.
   * There is no way to suppress this behavior due to SDK limitations.
   * 
   * @param transactionId - The transaction ID to wait for
   * @param options - Polling configuration options
   * @returns Promise that resolves with transaction receipt (only for accepted transactions)
   * @throws {Error} If transaction is rejected, timeout is reached, or transaction ID is malformed
   */
  async waitForTransactionReceipt(
    transactionId: string,
    options: AleoWaitForReceiptOptions = {}
  ): Promise<AleoTransactionReceipt> {
    const {
      checkInterval = 2000,
      timeout = 45000,
    } = options;

    console.log('[AleoWalletProvider.waitForTransactionReceipt] Waiting for transaction...');
    console.log('[AleoWalletProvider.waitForTransactionReceipt] Transaction ID:', transactionId);

    // Validate transaction ID format first to prevent infinite polling on malformed IDs
    // The SDK sometimes retries forever on 400 errors for invalid IDs
    if (!isValidAleoTransactionId(transactionId)) {
      console.error('[AleoWalletProvider.waitForTransactionReceipt] Invalid transaction ID format');
      throw new Error(
        `Invalid transaction ID format: ${transactionId}. ` +
        `Please verify the transaction ID is correct (should start with 'at1' and be 61 chars long).`
      );
    }

    console.log('[AleoWalletProvider.waitForTransactionReceipt] Check interval:', checkInterval, 'ms');
    console.log('[AleoWalletProvider.waitForTransactionReceipt] Timeout:', timeout, 'ms');

    try {
      const startTime = Date.now();

      // SDK will throw if transaction is rejected - no way to suppress this
      const confirmedTx = await this.networkClient.waitForTransactionConfirmation(
        transactionId,
        checkInterval,
        timeout,
      );

      const duration = Date.now() - startTime;
      console.log('[AleoWalletProvider.waitForTransactionReceipt] Transaction confirmed in', duration, 'ms');
      console.log('[AleoWalletProvider.waitForTransactionReceipt] Status:', confirmedTx.status);
      console.log('[AleoWalletProvider.waitForTransactionReceipt] Type:', confirmedTx.type);

      // At this point, status is ALWAYS 'accepted' because SDK throws on 'rejected'
      return {
        transactionId,
        status: confirmedTx.status as 'accepted' | 'rejected', // Actually always 'accepted'
        type: confirmedTx.type,
        index: confirmedTx.index,
        transaction: confirmedTx.transaction,
        finalize: confirmedTx.finalize,
        confirmedAt: new Date(),
      };
    } catch (error) {
      console.error('[AleoWalletProvider.waitForTransactionReceipt] Error:', error);
      
      // Re-throw with more context based on error type
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('did not appear')) {
          throw new Error(
            `Transaction ${transactionId} did not confirm within ${timeout}ms. ` +
            `The transaction may still be pending - check the transaction status manually.`
          );
        }
        if (error.message.includes('Malformed') || error.message.includes('Invalid URL')) {
          throw new Error(
            `Invalid transaction ID format: ${transactionId}. ` +
            `Please verify the transaction ID is correct.`
          );
        }
        if (error.message.includes('rejected')) {
          // Transaction was rejected by the network
          throw new Error(
            `Transaction ${transactionId} was rejected by the network. ` +
            `Check that the fee payer has sufficient credits and inputs are valid.`
          );
        }
      }
      
      throw error;
    }
  }

  /**
   * Convenience method: Send transfer and wait for confirmation in one call
   */
  async transferAndWait(
    options: AleoTransferOptions,
    receiptOptions?: AleoWaitForReceiptOptions
  ): Promise<{ transactionId: string; receipt: AleoTransactionReceipt }> {
    console.log('[AleoWalletProvider.transferAndWait] Initiating transfer...');
    
    const transactionId = await this.transfer(options);
    console.log('[AleoWalletProvider.transferAndWait] Transfer submitted:', transactionId);
    console.log('[AleoWalletProvider.transferAndWait] Waiting for confirmation...');
    
    const receipt = await this.waitForTransactionReceipt(transactionId, receiptOptions);
    
    return { transactionId, receipt };
  }

  /**
   * Convenience method: Execute program and wait for confirmation in one call
   */
  async executeAndWait(
    options: AleoExecuteOptions,
    receiptOptions?: AleoWaitForReceiptOptions
  ): Promise<{ result: AleoExecutionResult; receipt: AleoTransactionReceipt }> {
    console.log('[AleoWalletProvider.executeAndWait] Initiating execution...');
    
    const result = await this.execute(options);
    console.log('[AleoWalletProvider.executeAndWait] Execution submitted:', result.transactionId);
    console.log('[AleoWalletProvider.executeAndWait] Waiting for confirmation...');
    
    const receipt = await this.waitForTransactionReceipt(result.transactionId, receiptOptions);
    
    return { result, receipt };
  }
}