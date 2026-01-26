'use client';

import { useAleoWallet } from '@sodax/wallet-sdk-react';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';
import { Network } from '@provablehq/aleo-types';
import { useState } from 'react';

export function AleoWalletTest() {
  const { address, connected, network, connect, disconnect, execute, getBalance } = useAleoWallet();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  
  // Transaction inputs
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const adapter = new PuzzleWalletAdapter();
      await connect(adapter, Network.TESTNET);
      
      setSuccess('✅ Wallet connected successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await disconnect();
      setBalance(null);
      setTxId(null);
      setRecipient('');
      setAmount('');
      
      setSuccess('✅ Wallet disconnected');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  const handleGetBalance = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const bal = await getBalance();
      const formattedBalance = (Number(bal) / 1_000_000).toFixed(6);
      setBalance(formattedBalance);
      
      setSuccess('✅ Balance fetched');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get balance');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!recipient || !amount) {
      setError('Please enter recipient address and amount');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const amountInMicrocredits = Math.floor(parseFloat(amount) * 1_000_000);
      
      const result = await execute({
        programName: 'credits.aleo',
        functionName: 'transfer_public',
        inputs: [recipient, `${amountInMicrocredits}u64`],
        priorityFee: 100_000, // 1.0 credits in microcredits (1 credit = 1,000,000 microcredits)
        privateFee: false,
      });

      if (result?.transactionId) {
        setTxId(result.transactionId);
        setSuccess(`✅ Transaction submitted!`);
        setRecipient('');
        setAmount('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Status Banner */}
      <div className={`p-4 rounded-lg border-2 ${connected ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-300'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="font-semibold">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          {network !== undefined && (
            <span className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
              {network === Network.MAINNET ? 'Mainnet' : 'Testnet'}
            </span>
          )}
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded">
          {success}
        </div>
      )}

      {/* Wallet Info */}
      <div className="p-6 border rounded-lg bg-white">
        <h2 className="text-xl font-semibold mb-4">Wallet Information</h2>
        
        <div className="space-y-3">
          {address && (
            <div>
              <label className="text-sm font-medium text-gray-600">Address</label>
              <p className="font-mono text-sm break-all bg-gray-50 p-3 rounded mt-1">
                {address}
              </p>
            </div>
          )}

          {balance !== null && (
            <div>
              <label className="text-sm font-medium text-gray-600">Balance</label>
              <p className="text-2xl font-bold mt-1">{balance} ALEO</p>
            </div>
          )}
        </div>

        {!connected ? (
          <button
            onClick={handleConnect}
            disabled={loading}
            className="mt-6 w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
          >
            {loading ? 'Connecting...' : '🧩 Connect Puzzle Wallet'}
          </button>
        ) : (
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleGetBalance}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold transition-colors"
            >
              {loading ? 'Loading...' : '💰 Get Balance'}
            </button>
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-semibold transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Transaction Panel */}
      {connected && (
        <div className="p-6 border rounded-lg bg-white">
          <h2 className="text-xl font-semibold mb-4">Send Transaction</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Address
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="aleo1..."
                disabled={loading}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (ALEO)
              </label>
              <input
                type="number"
                step="0.000001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.001"
                disabled={loading}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>

            <button
              onClick={handleTransfer}
              disabled={loading || !recipient || !amount}
              className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              {loading ? 'Sending...' : '🚀 Send Transaction'}
            </button>

            {txId && (
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-600">Transaction ID</label>
                <p className="font-mono text-sm break-all bg-blue-50 p-3 rounded mt-1 border border-blue-200">
                  {txId}
                </p>
                <a
                  href={`https://testnet.explorer.provable.com/transaction/${txId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  View on Explorer →
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Developer Info */}
      <details className="p-4 border rounded-lg bg-gray-50">
        <summary className="cursor-pointer font-semibold text-gray-700">
          🔧 Developer Info
        </summary>
        <pre className="mt-3 text-xs bg-white p-3 rounded border overflow-auto">
{JSON.stringify({
  connected,
  address: address || null,
  network: network || null,
  balance: balance || null,
  txId: txId || null,
}, null, 2)}
        </pre>
      </details>
    </div>
  );
}
