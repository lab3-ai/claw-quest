import { useState } from 'react';
import { api } from '../../lib/api';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Search } from 'lucide-react';

export function TxStatusLookup() {
    const [txHash, setTxHash] = useState('');
    const [chainId, setChainId] = useState('');
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLookup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!txHash.trim()) return;
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const data = await api.txStatus(txHash.trim(), chainId ? Number(chainId) : undefined);
            setResult(data);
        } catch (err: any) {
            setError(err.message || 'Lookup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                Transaction Status Lookup
            </h2>
            <div className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <form onSubmit={handleLookup} className="flex gap-2 flex-wrap">
                    <input
                        value={txHash}
                        onChange={(e) => setTxHash(e.target.value)}
                        placeholder="0x transaction hash..."
                        className="flex-1 min-w-[280px] px-3 py-2 rounded text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                    <input
                        value={chainId}
                        onChange={(e) => setChainId(e.target.value)}
                        placeholder="Chain ID (optional)"
                        type="number"
                        className="w-36 px-3 py-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                    <button
                        type="submit"
                        disabled={loading || !txHash.trim()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-sm bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
                    >
                        <Search size={14} />
                        {loading ? 'Checking...' : 'Check'}
                    </button>
                </form>

                {error && (
                    <div className="mt-3 text-xs text-red-300 p-2 rounded bg-red-600/10 border border-red-600/20">
                        {error}
                    </div>
                )}

                {result && (
                    <div className="mt-3 flex items-center gap-4 text-sm">
                        <StatusBadge status={result.status} />
                        <span className="font-mono text-xs truncate max-w-[300px]" style={{ color: 'var(--text-muted)' }}>
                            {result.txHash}
                        </span>
                        {result.blockNumber && (
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                Block #{result.blockNumber}
                            </span>
                        )}
                        {result.gasUsed && (
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                Gas: {Number(result.gasUsed).toLocaleString()}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
