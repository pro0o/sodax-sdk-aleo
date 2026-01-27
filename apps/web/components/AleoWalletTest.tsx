'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Network } from '@provablehq/aleo-types';
import { useXService, AleoXService } from '@sodax/wallet-sdk-react';

export function AleoWalletTest() {
  const { 
    address, 
    connected, 
    connecting, 
    network, 
    wallets, 
    wallet, 
    selectWallet, 
    connect, 
    disconnect, 
    executeTransaction 
  } = useWallet();
  const service = useXService('ALEO') as AleoXService | undefined;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedWalletName, setSelectedWalletName] = useState<string | null>(null);

  const installedWallets = wallets.filter(w => w.readyState === 'Installed');

  const handleSelectWallet = useCallback((walletName: string) => {
    setSelectedWalletName(walletName);
    selectWallet(walletName as any);
    setError(null);
  }, [selectWallet]);

  const handleConnect = useCallback(async () => {
    if (!selectedWalletName) {
      setError('Please select a wallet first');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      await connect(Network.TESTNET);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Connection failed';
      
      if (message.includes('not connected') || message.includes('connection expired')) {
        setError(`${selectedWalletName}: Please unlock your wallet extension and try again`);
      } else if (message.includes('not selected')) {
        setError(`Please select a wallet first`);
      } else if (message.includes('rejected')) {
        setError(`Connection rejected. Please approve in your ${selectedWalletName} extension`);
      } else {
        setError(`${selectedWalletName}: ${message}`);
      }
      
      console.error('[Aleo Wallet]', e);
    } finally {
      setLoading(false);
    }
  }, [selectedWalletName, connect]);

  const handleDisconnect = useCallback(async () => {
    setLoading(true);
    try {
      await disconnect();
      setBalance(null);
      setTxId(null);
      setSelectedWalletName(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Disconnect failed');
    } finally {
      setLoading(false);
    }
  }, [disconnect]);

  const handleGetBalance = useCallback(async () => {
    if (!service || !address) return;
    setLoading(true);
    setError(null);
    try {
      const bal = await service.getBalance(address, { symbol: 'ALEO', address: 'credits.aleo', decimals: 6, name: 'Aleo Credits' } as any);
      setBalance((Number(bal) / 1_000_000).toFixed(6));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get balance');
    } finally {
      setLoading(false);
    }
  }, [service, address]);

  const handleTransfer = useCallback(async () => {
    if (!recipient || !amount) {
      setError('Enter recipient and amount');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const microcredits = Math.floor(parseFloat(amount) * 1_000_000);
      const result = await executeTransaction({
        program: 'credits.aleo',
        function: 'transfer_public',
        inputs: [recipient, `${microcredits}u64`],
        fee: 100_000,
        privateFee: false,
      });
      if (result?.transactionId) {
        setTxId(result.transactionId);
        setRecipient('');
        setAmount('');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transaction failed');
    } finally {
      setLoading(false);
    }
  }, [recipient, amount, executeTransaction]);

  return (
    <div className="max-w-xl space-y-4 p-4">
      {/* Status */}
      <div className={`p-3 rounded border ${connected ? 'bg-green-50 border-green-400' : 'bg-gray-50 border-gray-300'}`}>
        <div className="flex items-center justify-between">
          <span className="font-medium">{connected ? '🟢 Connected' : '⚪ Disconnected'}</span>
          {network && <span className="text-sm text-blue-600">{network === Network.MAINNET ? 'Mainnet' : 'Testnet'}</span>}
        </div>
        {wallet && <p className="text-xs text-gray-500 mt-1">Wallet: {wallet.adapter.name}</p>}
      </div>

      {error && <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">{error}</div>}

      {/* Wallet Info / Selection */}
      <div className="p-4 border rounded bg-white space-y-3">
        {address && (
          <div>
            <label className="text-xs text-gray-500">Address</label>
            <p className="font-mono text-xs break-all bg-gray-50 p-2 rounded">{address}</p>
          </div>
        )}
        {balance && <p className="text-xl font-bold">{balance} ALEO</p>}

        {!connected ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Step 1: Select a wallet ({installedWallets.length} available)
            </p>
            {installedWallets.length === 0 ? (
              <div className="text-sm text-gray-500">
                <p>No Aleo wallets installed.</p>
                <p className="mt-1">Install Puzzle Wallet: https://puzzle.online/</p>
              </div>
            ) : (
              <>
                {installedWallets.map(w => (
                  <button
                    key={w.adapter.name}
                    onClick={() => handleSelectWallet(w.adapter.name)}
                    disabled={loading}
                    className={`w-full py-2 px-4 border rounded flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50 transition-colors ${
                      selectedWalletName === w.adapter.name ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                  >
                    {w.adapter.icon && <img src={w.adapter.icon} alt="" className="w-5 h-5" />}
                    <span>{w.adapter.name}</span>
                    {selectedWalletName === w.adapter.name && <span className="ml-auto text-blue-600">✓</span>}
                  </button>
                ))}
                
                {selectedWalletName && (
                  <div className="pt-2">
                    <p className="text-sm text-gray-600 mb-2">Step 2: Connect</p>
                    <button
                      onClick={handleConnect}
                      disabled={loading || connecting}
                      className="w-full py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
                    >
                      {connecting ? 'Connecting...' : `Connect to ${selectedWalletName}`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleGetBalance}
              disabled={loading}
              className="flex-1 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Get Balance
            </button>
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="py-2 px-4 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Transfer */}
      {connected && (
        <div className="p-4 border rounded bg-white space-y-3">
          <h3 className="font-medium">Transfer</h3>
          <input
            type="text"
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            placeholder="Recipient (aleo1...)"
            className="w-full px-3 py-2 border rounded text-sm font-mono"
          />
          <input
            type="number"
            step="0.000001"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Amount (ALEO)"
            className="w-full px-3 py-2 border rounded text-sm"
          />
          <button
            onClick={handleTransfer}
            disabled={loading || !recipient || !amount}
            className="w-full py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
          {txId && (
            <div className="text-sm">
              <p className="text-gray-500">TX:</p>
              <a
                href={`https://testnet.explorer.provable.com/transaction/${txId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-blue-600 break-all hover:underline"
              >
                {txId}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
